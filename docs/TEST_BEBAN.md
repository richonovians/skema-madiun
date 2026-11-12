# Pengujian Beban Backend SKEMA

**Tanggal pengukuran:** 13 Oktober 2026
**Direvisi:** 13 Oktober 2026, sore — hari yang sama. Lihat kotak di bawah.
**Diukur ulang:** 3 November 2026 pada `main` `9e72abb` (QA-PERF) — §12. Jalan dingin `/statistics` mundur 2-3,5 kali sejak `f1c132e` ([BUG-067](BUG_REPORTS.md#bug-067)); pada T1 dan T2 syarat "< 3 detik" terpenuhi (§12.4, §12.5). Dengan jawaban teks dan pengaduan: §12.6.
**Ketersediaan:** diukur 4 November 2026 pada `main` `5cda6fa` — §13.
**QA-PERF ditutup dengan catatan:** 5 November 2026 — §14.
**Diukur ulang sesudah PR #17 dan #18:** 9 November 2026 pada `main` `50175c7` — §15. Tak ada kemunduran yang dapat dikaitkan ke kedua PR; pada T1 syarat "< 3 detik" tetap terpenuhi.
**Cabang:** catatan ini hanya ada di `tester`. Kode pelarinya ada di `main`
(`apps/api/scripts/beban/`, commit `e4f24de`).

> **DOKUMEN INI KEDALUWARSA PADA HARI YANG SAMA IA DITULIS, dan itu dicatat di
> sini alih-alih disunting diam-diam.** Versi pertama menyatakan dua endpoint
> menjawab HTTP 500 dan mendaftarkan perbaikannya sebagai saran. Kedua saran itu
> dikerjakan beberapa jam kemudian (`2c63911`, `6ddcc18`), jadi bagian 6, 7, dan
> 9 sudah tidak benar sebagai keadaan sekarang. Keduanya **tidak dihapus**:
> titik patahnya adalah temuan pengujian yang sah dan harus tetap terbaca,
> sebab ia yang menjelaskan mengapa kodenya berubah. Yang ditambahkan adalah
> keadaan sesudahnya, selalu dengan cara mengukurnya disebut.

---

## 1. Pertanyaan yang diuji, dan mengapa bukan pertanyaan yang lain

Pertanyaan yang biasa diajukan pada uji beban adalah "sanggup menampung berapa
pengguna". Pertanyaan itu **tidak dapat dijawab** untuk proyek ini, dan itu
bukan kekurangan pengujiannya: pemilik produk menyatakan sendiri bahwa jumlah
responden survei tak dapat diperkirakan, sebab warga tidak pasti mau mengisi.
Setiap angka penerimaan yang dipakai sebagai patokan akan menjadi karangan.

Yang dapat dijawab, dan dijawab di sini:

> Endpoint mana yang patah lebih dulu, pada ukuran data berapa, dan karena apa.

Jawaban itu menuntut **kurva**, bukan satu angka. Karena itu satu variabel saja
yang digeser: respons per survei. Jumlah survei ditahan di 744, sebab justru ia
yang dapat diperkirakan — ia lahir dari jadwal administratif OPD, bukan dari
minat warga. 62 OPD (jumlah nyata hasil sinkronisasi Helpdesk) x 4 triwulan x 3
tahun = 744.

## 2. Cara mengukur

```bash
pnpm --filter @skm-spm/api beban:data -- --survei=744 --respons=20
pnpm --filter @skm-spm/api beban -- --semua
```

Pelarinya menyalakan API-nya **sendiri** di porta 3002, bukan memukul server
dev. Itu keharusan, bukan kesopanan: server dev membaca `apps/api/.env`
sehingga setiap baris yang ditulisnya masuk `skm_db`. Yang dipisahkan:

| Sumber daya  | Milik aplikasi dev | Milik pelari beban | Milik pelari e2e |
| ------------ | ------------------ | ------------------ | ---------------- |
| Basis data   | `skm_db`           | `skm_beban`        | `skm_uji`        |
| Redis        | basis data logis 0 | basis data logis 1 | basis data logis 2 |
| Porta        | 3001               | 3002               | dalam proses     |
| Keluaran tsc | `dist/`            | `dist-beban/`      | ts-jest          |

Pemisahan Redis diperlukan dan itu terukur: kunci singgahan tidak membawa
pembeda basis data (`singgahan:ikm-hasil:<surveyId>`), sehingga jalan beban
pertama mencemari angka IKM yang disinggahkan aplikasi dev. Ia pulih sendiri
dalam 60 detik, tetapi penyebabnya tetap harus dipalang.

**Kolom e2e ditambahkan `2c63911`**, dan sebabnya cacat yang sama persis pada
hari yang sama: tiga berkas e2e berbagi satu kunci dashboard ber-TTL 60 detik,
dan berbagi juga dengan aplikasi dev. Hasil e2e karena itu bergantung pada apa
pun yang menyentuh Redis dalam enam puluh detik terakhir. Paparan itu sudah ada
sebelum singgahan dashboard dipasang — `statistik-publik` berkunci tetap dengan
masalah yang sama — hanya belum pernah menggigit. Mekanisme penukaran nomornya
kini satu kode untuk kedua pelari, `apps/api/scripts/lib/url-redis.ts`.

Yang **tidak** diperbaiki: kunci tanpa pembeda basis data itu sendiri.
Memperbaikinya menuntut perubahan di kode aplikasi dan tak diperlukan selama
setiap pelari memakai nomornya sendiri. Siapa pun yang menambah pelari ketiga
harus memberinya nomor sendiri juga.

Yang diukur adalah jalur kode **produksi**, yaitu `main.ts` yang sama dengan
yang digelar, dikompilasi tsc. Bukan aplikasi yang dibangun lewat harness
ts-jest. Mengukur jalur yang tidak digelar menghasilkan angka yang tak dapat
dipakai siapa pun.

Beban per skenario: 10 koneksi, 10 detik (autocannon), plus satu permintaan
tunggal lebih dahulu untuk mencatat waktu **dingin** dan memastikan jawabannya
2xx.

**Dua cara mengukur, dan angkanya tidak dapat dibandingkan lintas cara.**
Permintaan penyelidik itu MENGISI singgahannya, sehingga autocannon sesudahnya
mengukur jalur **hangat**. Sejak `6ddcc18` ada penanda `--dingin` yang menyapu
kunci singgahan sebelum penyelidik DAN sebelum autocannon, sehingga yang terukur
jalur **dingin** berkoneksi banyak:

```bash
pnpm --filter @skm-spm/api beban -- --skenario=statistik --dingin
```

Setiap angka di dokumen ini menyebut cara mana yang dipakai. Tanpa itu dua
angka yang terlihat sebanding sebenarnya mengukur hal yang berbeda. Jumlah baris dihitung sebelum dan sesudah setiap jalan, dan selisihnya
dilaporkan — seluruh skenario di sini hanya membaca, jadi selisih nol adalah
satu-satunya hasil yang boleh diterima.

## 3. Batas yang harus dibaca bersama angkanya

1. **Ini laptop ber-Docker Desktop, bukan server.** Angkanya sah sebagai
   pembanding antar-endpoint dan sebagai pendeteksi kemunduran, bukan sebagai
   ramalan kapasitas produksi.
2. **Semua skenario membaca.** Jalur tulis belum diukur sama sekali: pengisian
   survei, pengaduan beserta lampiran terenkripsi, unggahan berkas.
3. `COMPLAINT_DAILY_LIMIT` dan `THROTTLE_LIMIT` dilonggarkan secara tersurat
   selama pengukuran. Tanpa itu yang terukur adalah `ThrottlerModule`, bukan
   aplikasinya. Artinya angka di bawah **tidak** memperhitungkan perlindungan
   penahan laju yang hidup di produksi.
4. Tabel `complaints` dan `notifications` tidak ikut digeser. Keduanya dipindai
   `groupBy` di `/statistics`, jadi endpoint itu sebenarnya punya satu sumbu
   pertumbuhan lagi yang belum diukur.

## 4. Hasil

Tiga tingkat. 744 survei pada ketiganya; hanya respons per survei yang digeser.

Jalur **hangat** pada keempat kolom, supaya ketiganya sebanding.

| Skenario                          | 133.920 jawaban   | 1.339.200 jawaban | 6.696.000 sebelum | 6.696.000 sesudah |
| --------------------------------- | ----------------- | ----------------- | ----------------- | ----------------- |
| `GET /api/v1/statistics` (publik) | 12 ms, 781 req/s  | 11 ms, 829 req/s  | **HTTP 500**      | 16 ms, 557 req/s  |
| `GET /api/v1/dashboard/ikm`       | 1.159 ms, 8 req/s | 1.100 ms, 8 req/s | **HTTP 500**      | 166 ms, 59 req/s  |
| `GET /api/v1/surveys/:id/results` | 32 ms, 296 req/s  | 33 ms, 278 req/s  | 32 ms, 290 req/s  | 44 ms, tak dicatat |
| `GET /api/v1/complaints`          | 37 ms, 249 req/s  | 32 ms, 299 req/s  | 32 ms, 293 req/s  | 46 ms, tak dicatat |
| `GET /api/v1/surveys/:id/fill`    | 44 ms, 212 req/s  | 44 ms, 216 req/s  | 48 ms, 201 req/s  | 56 ms, tak dicatat |

Angka pada kolom adalah p50 dan permintaan per detik. Rincian p95/p99 dan waktu
dingin ada di bagian 5. Kolom terakhir diukur sesudah `2c63911` pada dataset
berukuran identik.

"Tak dicatat" berarti tak dicatat. Jalan verifikasi sesudah perbaikan hanya
mencatat p50 untuk tiga skenario yang tak pernah patah, dan angka req/s-nya
tidak disalin. Mengisinya dengan taksiran akan membuat tabel ini terlihat
lengkap sekaligus salah, dan tepat itu yang paling mudah dipercaya pembaca
berikutnya.

Pemisahannya bersih pada kolom "sebelum": **dua endpoint yang mengipas satu
panggilan per survei patah; tiga yang tidak, sama sekali tak bergerak pada data
lima puluh kali lebih banyak.** Ketiganya tetap seluruhnya 2xx di 6,7 juta
jawaban.

Tiga skenario yang tak pernah patah **melambat sedikit** di kolom terakhir
(32 ke 44 ms, 32 ke 46 ms, 48 ke 56 ms). Itu bukan kemunduran yang disebabkan
perbaikannya: keempat kolom diukur pada jalan yang berbeda di laptop yang sama,
dan selisih belasan milidetik pada mesin ber-Docker Desktop ada dalam derau
pengukurannya. Disebut di sini supaya pembaca berikutnya tidak membacanya
sebagai temuan.

## 5. Rincian per tingkat

### T1 — 744 survei, 20 respons/survei (14.880 respons, 133.920 jawaban)

| Skenario         | Dingin   | p50      | p95      | p99      | Maks     | req/s |
| ---------------- | -------- | -------- | -------- | -------- | -------- | ----- |
| statistik        | 1.901 ms | 12 ms    | 23 ms    | 26 ms    | 41 ms    | 781   |
| dashboard-ikm    | 212 ms   | 1.159 ms | 1.276 ms | 1.295 ms | 1.295 ms | 8     |
| hasil-ikm        | 464 ms   | 32 ms    | 52 ms    | 56 ms    | 68 ms    | 296   |
| daftar-pengaduan | 32 ms    | 37 ms    | 62 ms    | 87 ms    | 236 ms   | 249   |
| isi-survei-baca  | 32 ms    | 44 ms    | 79 ms    | 89 ms    | 115 ms   | 212   |

### T2 — 744 survei, 200 respons/survei (148.800 respons, 1.339.200 jawaban)

| Skenario         | Dingin   | p50      | p95      | p99      | Maks     | req/s |
| ---------------- | -------- | -------- | -------- | -------- | -------- | ----- |
| statistik        | 4.984 ms | 11 ms    | 20 ms    | 28 ms    | 47 ms    | 829   |
| dashboard-ikm    | 252 ms   | 1.100 ms | 1.449 ms | 1.471 ms | 1.471 ms | 8     |
| hasil-ikm        | 216 ms   | 33 ms    | 56 ms    | 98 ms    | 304 ms   | 278   |
| daftar-pengaduan | 38 ms    | 32 ms    | 47 ms    | 52 ms    | 77 ms    | 299   |
| isi-survei-baca  | 31 ms    | 44 ms    | 74 ms    | 81 ms    | 101 ms   | 216   |

Waktu pembangunan dataset: 218 detik.

### T3 — 744 survei, 1.000 respons/survei (744.000 respons, 6.696.000 jawaban)

Dua baris pertama adalah keadaan **sebelum** perbaikan. Angka sesudahnya ada di
tabel berikutnya.

| Skenario         | Dingin | p50    | p95   | p99   | Maks   | req/s |
| ---------------- | ------ | ------ | ----- | ----- | ------ | ----- |
| statistik        | —      | —      | —     | —     | —      | **0, HTTP 500** |
| dashboard-ikm    | —      | —      | —     | —     | —      | **0, HTTP 500** |
| hasil-ikm        | 142 ms | 32 ms  | 52 ms | 63 ms | 135 ms | 290   |
| daftar-pengaduan | 26 ms  | 32 ms  | 53 ms | 63 ms | 152 ms | 293   |
| isi-survei-baca  | 32 ms  | 48 ms  | 72 ms | 79 ms | 134 ms | 201   |

Waktu pembangunan dataset: 997 detik.

### T3 sesudah perbaikan — jalur DINGIN, 744 survei, 6.696.000 jawaban

Diukur 13 Oktober 2026 sore dengan `--dingin`, 10 koneksi, 15 detik, pada
dataset yang **sama persis**. Kunci singgahan disapu sebelum penyelidik dan
sebelum autocannon, jadi setiap jalan benar-benar dimulai dari singgahan kosong.
Kolom "tanpa penahan" diambil dengan mematikan `SekaliJalan` sementara, bukan
dari jalan yang lebih tua.

| Skenario      | Ukuran | Tanpa penahan | Dengan penahan |
| ------------- | ------ | ------------- | -------------- |
| statistik     | dingin | 1.819 ms      | 1.793 ms       |
| statistik     | p50    | 8 ms          | 6 ms           |
| statistik     | p99    | 28 ms         | **13 ms**      |
| statistik     | maks   | **13.428 ms** | **1.917 ms**   |
| statistik     | req/s  | 346           | **1.222**      |
| dashboard-ikm | dingin | 1.258 ms      | 1.341 ms       |
| dashboard-ikm | p50    | 99 ms         | 81 ms          |
| dashboard-ikm | p99    | **6.774 ms**  | **121 ms**     |
| dashboard-ikm | maks   | 10.781 ms     | 1.375 ms       |
| dashboard-ikm | req/s  | 41            | 109            |

Seluruh jawaban 2xx pada keempat jalan.

**Waktu dingin satu permintaan tidak berubah** — 1,8 dan 1,3 detik — dan itu
memang bukan yang diperbaiki. Penahannya tidak mempercepat satu hitungan; ia
menghapus sembilan hitungan kembar. Yang menunjukkannya adalah maks dan p99:
`/statistics` turun dari 13,4 detik ke 1,9 detik, dan `dashboard-ikm` dari 6,8
detik ke 121 ms pada p99. Selisih itulah perebutan kolam koneksi yang hilang.

Bandingkan juga dengan bagian 4: di sana `/statistics` hangat 16 ms dengan 557
req/s, di sini 6 ms dengan 1.222 req/s. Keduanya benar dan keduanya bukan
kemajuan satu atas yang lain — durasinya berbeda (10 lawan 15 detik) dan
jalannya berbeda hari. Jangan menyandingkan keduanya sebagai satu kurva.

## 6. Titik patahnya (SUDAH DIPERBAIKI, dicatat sebagai sejarah)

Pada 6,7 juta jawaban, dan **sebelum `2c63911`**,
`GET /api/v1/statistics` dan `GET /api/v1/dashboard/ikm` menjawab **HTTP 500**
pada permintaan **tunggal**, tanpa beban sama sekali:

```
Invalid `this.prisma.question.findMany()` invocation in ikm.service.js:320
Timed out fetching a new connection from the connection pool.
(Current connection pool timeout: 10, connection limit: 9)
    at async IkmService.computeResult
    at async Promise.all (index 416)
    at async DashboardService.hitungStatistik
```

Kegagalannya berulang: dijalankan dua kali, dua kali 500, galat identik.

**Sebabnya satu cacat yang sama di dua tempat**, bukan dua masalah terpisah:

- `apps/api/src/modules/dashboard/dashboard.service.ts:333-348`
- `apps/api/src/modules/ikm/ikm.service.ts:437-443`

Keduanya memuat **seluruh** survei aktif dengan `findMany` tanpa `take`, lalu
`Promise.all` memanggil `computeResult` satu kali per survei. Pada 744 survei
itu 744 panggilan serentak yang berebut kolam koneksi Prisma berisi 9. Masing
masing menunggu 10 detik, lalu menyerah.

Mengapa ia lolos di T1 dan T2: `computeResult` disinggahkan per survei di Redis
(`ikm.service.ts:511`), dan pada data yang lebih kecil setiap panggilan masih
cukup cepat untuk selesai dalam batas 10 detik itu. Pada 6,7 juta jawaban tidak
lagi.

Bukti bahwa biayanya mengikuti **jumlah survei**, bukan jumlah jawaban: dari T1
ke T2 jawabannya naik sepuluh kali, dan p50 `dashboard-ikm` tidak bergerak
(1.159 ms menjadi 1.100 ms). Satu permintaan tunggal 212-252 ms; sepuluh
serentak 1.100 ms masing-masing. Yang membatasi adalah kipasnya, bukan datanya.

Tiga hal yang membuat ini pantas didahulukan:

1. `/api/v1/statistics` adalah `@Public()`. Ia terpapar tanpa autentikasi.
2. Kegagalannya **500**, bukan 503 atau jawaban sebagian. Tak ada degradasi
   bertahap; ia bekerja, lalu berhenti.
3. Ia terjadi pada permintaan tunggal. Tidak ada beban yang perlu disalahkan.

Dan jumlah survei adalah satu-satunya angka yang dapat diperkirakan di proyek
ini. Jadi ini bukan risiko hipotetis melainkan jadwal: ia memburuk setiap
triwulan, dengan atau tanpa minat warga mengisi survei.

**Yang menutupnya, `2c63911`.** `IkmService.hitungHasilBanyak` menggantikan
kipas itu dengan tiga kueri agregat: penjumlahannya dikerjakan Postgres dan tak
ada satu pun baris jawaban yang melintasi kabel. `computeResult` tetap ada dan
tetap bersinggahan untuk endpoint satu survei, yang memang terbukti cepat.
`/dashboard/ikm` sekaligus mendapat singgahan di aras endpoint seperti
`/statistics`, beserta pembatalan lewat token generasi — tanpa pembatalan itu,
survei yang baru ditutup tak muncul sampai TTL 60 detik lewat, dan uji e2e
`role-journeys.e2e-spec.ts` yang menemukannya, bukan pengukuran ini.

Dua hal dari daftar tiga di atas karena itu **tidak lagi berlaku**: ia tak lagi
menjawab 500, dan tak lagi gagal pada permintaan tunggal. Yang tetap berlaku
adalah butir pertama — `/api/v1/statistics` masih `@Public()` dan masih terpapar
tanpa autentikasi — dan itu sebabnya jalan dinginnya tetap ditangani terpisah di
bagian 7.

## 7. Temuan kedua: jalan dingin `/statistics` (PENAHANNYA SUDAH ADA)

Terpisah dari yang di atas, dan masih berlaku pada ukuran data yang hari ini
wajar. Singgahan `/statistics` berumur 60 detik, dan jalan dinginnya tumbuh
bersama data: 1,9 detik pada T1, **5,0 detik** pada T2. Artinya setiap enam
puluh detik tepat satu pengunjung menanggung lima detik itu, pada endpoint yang
terbuka untuk publik.

Lebih buruk saat ramai: pada jalan beban paling awal (sebelum pelarinya diberi
permintaan penyelidik), sepuluh koneksi yang tiba bersamaan ke singgahan kosong
menghasilkan **nol** permintaan tuntas dan sepuluh galat, padahal satu
permintaan dingin tunggal selesai dalam ~2 detik. Itu bentuk klasik *cache
stampede*: tak ada yang mencegah sepuluh permintaan menghitung hal yang sama
sekaligus.

**Penahannya ditambahkan `6ddcc18`**, pada `/statistics` MAUPUN
`/dashboard/ikm` — temuan ini semula hanya menyebut yang pertama, padahal
mekanismenya satu dan masalahnya sama. `SekaliJalan` menyimpan satu janji per
kunci di memori proses: permintaan pertama menghitung, yang menyusul menunggu
janji yang sama. Ia **bukan** singgahan kedua; entrinya hilang begitu
hitungannya tuntas, dan yang menyimpan nilainya tetap `PenyimpanSinggahan`
dengan TTL serta pembatalannya.

Angkanya ada di tabel T3 sesudah perbaikan di bagian 5. Yang paling menentukan:
maks `/statistics` 13.428 ms menjadi 1.917 ms.

**Batas yang harus dibaca bersamanya, dan ia nyata.** Penahannya **per proses**.
Petanya ada di memori satu proses Node, jadi N instansi berarti N hitungan
dingin, bukan satu. Hari ini instansinya satu. Kunci terdistribusi di Redis akan
menutup sisanya, tetapi ia menuntut metode baru pada antarmuka singgahan dan
menambah mode kegagalan yang hari ini tak dapat terjadi — kunci yang dipegang
proses yang mati. Penskalaan mendatar sendiri masih terpalang lampiran di cakram
lokal (lihat bagian 8), jadi batas ini belum menagih apa pun.

**Yang masih belum tertangani:** biaya dingin satu permintaan, 1,8 detik pada
`/statistics` dan 1,3 detik pada `/dashboard/ikm` di 6,7 juta jawaban. Dengan
TTL 60 detik, satu pengunjung per menit tetap menanggungnya. Penahan stampede
tidak menyentuh angka itu, dan memang tak dimaksudkan menyentuhnya.

## 8. Yang belum diukur

Jangan baca dokumen ini sebagai pernyataan bahwa sistemnya sudah teruji beban.
Yang belum tersentuh:

- **Seluruh jalur tulis.** `POST /surveys/:id/responses`, pengaduan, balasan.
  Pelonggaran penahan laju sudah terpasang di pelarinya, jadi yang kurang hanya
  bentuk DTO-nya.
- **Lampiran.** Enkripsi amplop AES-256-GCM per berkas, dan berkasnya disimpan
  di cakram lokal (`UPLOAD_DIR`, bawaan `'uploads'`, relatif, tanpa volume
  bersama). Itu penghalang keras penskalaan mendatar yang tidak akan terlihat
  pada uji baca mana pun.
- **Pertumbuhan `complaints` dan `notifications`.** Keduanya dipindai
  `/statistics` tetapi ditahan di ukuran data pengembangan selama pengukuran.
- **Ekspor laporan** (`/results/export`, exceljs dan pdfkit). Ini jalur yang
  menahan seluruh dokumen di memori.

## 9. Saran, berurutan — dan status masing-masing

1. ~~**Batasi kipasnya.**~~ **SELESAI, `2c63911`.** Diganti satu agregat di
   Postgres (`IkmService.hitungHasilBanyak`), bukan paginasi dan bukan pembatas
   konkurensi. Satu perubahan menutup kedua endpoint yang patah, seperti yang
   diperkirakan di sini.
2. **Naikkan `connection_limit` hanya sebagai penahan sementara.** **TIDAK
   DIKERJAKAN, dan tidak perlu lagi.** Ia menggeser titik patahnya, tidak
   menghapusnya. Karena butir 1 menghapus penyebabnya, kolam berisi 9 itu
   dibiarkan apa adanya.
3. ~~**Tambahkan penahan *stampede*.**~~ **SELESAI, `6ddcc18`**, dan dipasang
   pada KEDUA endpoint, bukan hanya `/statistics` seperti tertulis semula.
   Bentuknya satu janji bersama per kunci dalam proses: yang menyusul menunggu,
   tidak menerima nilai lama. Menyajikan nilai lama ditolak dengan sengaja untuk
   `/dashboard/ikm`, sebab ia bertabrakan dengan pembatalan generasi yang baru
   dipasang di butir 1 — menghapus kunci generasi memang dimaksudkan supaya
   nilai lama TIDAK tersaji lagi.
4. **Ukur jalur tulis** sebelum penggelaran. **BELUM DIKERJAKAN.** Separuh
   sistem belum punya angka.
5. **Paginasi tabel `/dashboard/ikm`.** **BELUM DIBAHAS, dan ini keputusan
   produk, bukan keputusan teknis:** 166 ms yang tersisa pada 6,7 juta jawaban
   praktis seluruhnya biaya muatan, 744 baris per jawaban, bukan biaya data.
   Pertanyaannya apakah Admin Kabupaten memang perlu seluruh 744 baris sekaligus
   di satu layar.

## 10. Cacat pada alat ukurnya sendiri

Dicatat supaya pembaca berikutnya tidak mengulanginya, dan supaya angka di atas
dapat dinilai dengan jujur. Dua cacat ditemukan **pada pelarinya**, bukan pada
aplikasinya, dan keduanya sempat menghasilkan satu set angka yang hampir
disajikan sebagai temuan:

1. `jalankan.ts` mengimpor sebuah konstanta dari `siapkan-data.ts`, dan berkas
   itu memanggil `void utama()` di aras modul. Jadi setiap jalan uji beban ikut
   menjalankan pembangun datasetnya. Tiga jalan menghasilkan 2.232 survei
   dengan 60 respons per survei padahal diminta 20. Gejalanya menyesatkan
   total: yang terlihat hanya dataset yang "tumbuh sendiri" sementara hanya
   beban baca yang berjalan.
2. `bangunSurvei` membaca `MIN(id)..MAX(id)` dari seluruh tabel `surveys`, bukan
   dari baris yang baru disisipkannya, sehingga jalan ulang menambahkan respons
   ke survei lama juga.

Penahannya: konstanta dipindah ke modul tanpa efek samping, kedua skrip
dipalang `require.main === module`, `RETURNING id` menggantikan `MIN/MAX`,
pengosongan dijadikan baku (`--tambah` yang harus diminta), dan pelarinya kini
menghitung ulang baris sesudah beban lalu melaporkan selisihnya. Seluruh angka
di dokumen ini diukur sesudah kelima penahan itu ada, dan setiap jalan
melaporkan "Dataset tetap".

**Dua cacat lagi, pada penanda `--dingin` yang ditambahkan `6ddcc18`**, dicatat
dengan alasan yang sama:

3. Versi pertama mode dingin memakai `FLUSHDB`. Basis data logis Redis 1 tak
   hanya memuat singgahan: ia juga memuat kunci `sesi:` milik Bearer token yang
   baru diterbitkan pelari itu **sendiri**. Akibatnya
   `GET /api/v1/dashboard/ikm` menjawab 401 dan bebannya tak pernah jalan.
   Docblock `PenyimpanSinggahanRedis` sudah menyatakannya sejak awal — awalan
   `singgahan:` dipisah dari `sesi:` dan `laju:` **di keyspace yang sama** — dan
   berkas itu tidak dibaca sebelum perintahnya dipilih. Yang menangkapnya adalah
   permintaan penyelidik, persis tugas yang disebut docblock-nya di bagian 2.
   Diganti sapuan berawalan berbasis `SCAN` + `UNLINK`, dengan awalan kosong
   ditolak karena polanya akan menjadi `*` lalu mengembalikan cacat yang sama
   lewat jalan yang lebih sunyi. Satu palang lagi memeriksa jawaban
   `CLIENT INFO` dari sambungan yang benar-benar terbuka dan menolak menyapu
   bila nomornya bukan 1 — basis data 0 memegang sesi sungguhan milik pengguna.
4. Redis tiruan di uji sapuan itu juga salah: kursornya dipakai sebagai indeks
   ke daftar yang disaring ulang tiap putaran, sehingga kunci yang baru terhapus
   menggeser indeksnya dan tiruannya melewatkan kunci yang nyata. Ujinya memerah
   pada implementasi yang benar. Redis sungguhan menjamin setiap kunci yang hadir
   sepanjang iterasi dikembalikan sedikitnya sekali walau ada penghapusan di
   tengah jalan.

Empat cacat, seluruhnya pada alat ukurnya, tak satu pun pada aplikasinya. Itu
pola yang pantas diingat: pada pekerjaan pengukuran, alat ukurnya yang paling
sering salah lebih dulu, dan satu-satunya yang menangkapnya adalah pemeriksaan
yang dipasang justru untuk tidak dipercaya.

## 11. Rancangan jalur tulis (29 Oktober 2026) — BELUM DIJALANKAN

Disusun sebagai lanjutan §8 lalu **ditunda atas permintaan pengguna**
sebelum satu baris kode pun ditulis. Disimpan di sini supaya dapat dipakai
lagi; tak ada cabang, berkas pelari, maupun data yang dibuat.

### 11.1 Koreksi atas §8

§8 menyatakan "pelonggaran penahan laju sudah terpasang di pelarinya, jadi
yang kurang hanya bentuk DTO-nya". **Untuk kirim jawaban survei, itu tidak
benar.** `THROTTLE_LIMIT` hanya melonggarkan batas GLOBAL. `POST
/surveys/:id/responses` membawa `@Throttle` sendiri (10/menit per pengguna,
`responses.controller.ts`) yang tidak ikut dilonggarkan, sehingga satu sesi
yang dipukul autocannon akan mengukur 429, bukan aplikasinya. Ditambah
`@@unique([surveyId, dedupeUserId])`: satu akun hanya sekali per survei
kecuali survei itu `allowMultipleSubmit`.

### 11.2 Tiga fakta yang menentukan bentuknya

1. Kirim jawaban: `@Throttle` per pengguna dan satu jawaban per akun (11.1).
2. Kirim pengaduan: tanpa `@Throttle` per rute. Batas hariannya
   (`BATAS_HARIAN_PENGADUAN_BAKU` = 10) dihitung dari basis data lalu
   ditulis -- pola hitung-lalu-tulis yang dapat jebol pada kiriman serentak.
   Nomor tiket dibangkitkan acak dengan lima kali coba ulang bila P2002
   (`insertWithUniqueTicket`); di bawah beban, coba ulang yang habis menjadi
   409.
3. Lampiran: dienkripsi AES-256-GCM lalu ditulis ke `UPLOAD_DIR`; biayanya
   belum pernah diukur.

### 11.3 Skenario

Semuanya lewat pelari yang sama: `skm_beban`, Redis logis 1, porta 3002.
`skm_db` dan server dev tak tersentuh.

| Skenario | Yang diukur | Cara |
| -------- | ----------- | ---- |
| `kirim-pengaduan` | `POST /complaints` tanpa lampiran | satu akun; batas harian dilonggarkan seperti skenario baca |
| `kirim-pengaduan-lampiran` | sama, dengan satu PNG 1 MB | `UPLOAD_DIR=uploads-beban` khusus, dihapus sesudah jalan supaya `apps/api/uploads` milik dev tak tercemar |
| `kirim-jawaban` | `POST /surveys/:id/responses` | survei `allowMultipleSubmit`; permintaan diputar di antara banyak akun responden beban (sesi diterbitkan sekali per akun) supaya yang terukur aplikasinya, bukan 429 |
| `batas-harian-serentak` | **ketepatan, bukan kecepatan** | 50 pengaduan serentak dari satu akun dengan batas harian ASLI 10; yang dihitung jumlah yang diterima. Lebih dari 10 berarti temuan |

Jalur publik tanpa akun sengaja tidak diukur: `@BatasPerSurvei` menahannya
per survei, sehingga yang terukur hanya penahan itu.

### 11.4 Pemeriksaan ketepatan

Skenario baca menuntut selisih baris nol. Untuk skenario tulis,
**selisih baris harus sama dengan jumlah jawaban 2xx** -- tak ada tulisan
yang hilang maupun berganda (mis. tabrakan nomor tiket yang lolos).
Untuk lampiran: jumlah berkas di `uploads-beban` sama dengan jumlah baris
`complaint_attachments` baru, dan setiap berkas berupa amplop terenkripsi.

### 11.5 Yang akan berubah bila dijalankan

- Kode pelari di `main`: `scripts/beban/skenario.ts` (empat skenario dan
  dukungan tubuh multipart), `jalankan.ts` (pemutaran sesi, `UPLOAD_DIR`
  khusus, pemeriksaan 11.4), `siapkan-data.ts` (akun responden beban dan
  survei multi-submit), dengan unit spec di `scripts/beban/lib/`.
- **Tanpa** perubahan kode aplikasi.
- Hasilnya menjadi bagian baru dokumen ini; bila `batas-harian-serentak`
  jebol, temuannya masuk `BUG_REPORTS.md` dan perbaikannya dirancang
  terpisah.

## 12. Pengukuran ulang jalur baca (3 November 2026, QA-PERF)

Diukur pada `main` `9e72abb` dengan pelari yang sama, terhadap dataset T3 yang
sama (744 survei, 744.000 respons, 6.696.000 jawaban, 0 pengaduan). Dataset
tidak dibangun ulang; yang dikerjakan hanya `beban:data -- --survei=0 --tambah`,
yang menerapkan satu migrasi tertinggal (`20261020140000_notifikasi_tertaut_survei`)
tanpa mengosongkan apa pun. Setiap jalan melaporkan "Dataset tetap".

Server dev (`pnpm dev`, porta 3000/3001) **ikut hidup** selama pengukuran, di
laptop yang sama. Tak diketahui apakah ia hidup pada 13 Oktober, jadi selisih
belasan milidetik tetap derau; selisih yang dibahas di bawah berlipat, bukan
belasan milidetik.

### 12.1 Jalur hangat, `--semua`, 10 koneksi, 10 detik

| Skenario         | Dingin   | p50   | p95    | p99    | Maks   | req/s | 13 Okt (sesudah perbaikan, §4) |
| ---------------- | -------- | ----- | ------ | ------ | ------ | ----- | ------------------------------ |
| statistik        | 3.739 ms | 8 ms  | 17 ms  | 21 ms  | 84 ms  | 1.044 | 16 ms, 557 req/s               |
| dashboard-ikm    | 1.357 ms | 87 ms | 157 ms | 173 ms | 190 ms | 106   | 166 ms, 59 req/s               |
| hasil-ikm        | 155 ms   | 28 ms | 48 ms  | 61 ms  | 107 ms | 334   | 44 ms                          |
| daftar-pengaduan | 24 ms    | 29 ms | 49 ms  | 57 ms  | 87 ms  | 319   | 46 ms                          |
| isi-survei-baca  | 50 ms    | 34 ms | 82 ms  | 96 ms  | 122 ms | 252   | 56 ms                          |

Seluruh jawaban 2xx. Kolom hangat tak ada yang memburuk.

### 12.2 Jalur dingin, `--dingin`, 10 koneksi, 15 detik

Pembandingnya kolom "Dengan penahan" di tabel T3 sesudah perbaikan (§5),
yang diukur dengan cara yang sama persis.

| Skenario      | Ukuran | 13 Okt   | 3 Nov        |
| ------------- | ------ | -------- | ------------ |
| statistik     | dingin | 1.793 ms | **6.255 ms** |
| statistik     | p50    | 6 ms     | 9 ms         |
| statistik     | p99    | 13 ms    | 27 ms        |
| statistik     | maks   | 1.917 ms | **4.973 ms** |
| statistik     | req/s  | 1.222    | 625          |
| dashboard-ikm | dingin | 1.341 ms | 1.184 ms     |
| dashboard-ikm | p50    | 81 ms    | 76 ms        |
| dashboard-ikm | p99    | 121 ms   | 132 ms       |
| dashboard-ikm | maks   | 1.375 ms | 1.213 ms     |
| dashboard-ikm | req/s  | 109      | 117          |

Seluruh jawaban 2xx.

### 12.3 Temuan: jalan dingin `/statistics` mundur 2-3,5 kali

Dua sampel dingin hari ini, 3.739 ms dan 6.255 ms, terhadap 1.793-1.819 ms pada
13 Oktober. `/dashboard/ikm` tidak bergerak, jadi yang mundur hanya
`/statistics`.

**Sebabnya diukur, bukan diduga.** Di antara kedua tanggal, `f1c132e`
(perbaikan BUG-013, 19 Oktober 2026) menambahkan penyaring Sampah ke
`DashboardService.hitungStatistik`. Salah satunya mengenai `answer.groupBy`,
yang menggapai survei lewat DUA relasi:

```ts
where: { nilai: { not: null }, response: { survey: TIDAK_DIBUANG } }
```

Prisma menerjemahkannya menjadi dua `LEFT JOIN` atas tabel jawaban:

```sql
SELECT COUNT(*), answers.nilai FROM answers
LEFT JOIN survey_responses j0 ON j0.id = answers.response_id
LEFT JOIN surveys j1 ON j1.id = j0.survey_id
WHERE answers.nilai IS NOT NULL AND j1.deleted_at IS NULL AND j1.id IS NOT NULL AND j0.id IS NOT NULL
GROUP BY answers.nilai
```

Diukur langsung lewat Prisma di `skm_beban` (hanya baca, tiga kali masing-masing):

| Bentuk kueri                             | Waktu                 |
| ---------------------------------------- | --------------------- |
| lama, tanpa penyaring Sampah             | 557 / 592 / 660 ms    |
| sekarang, `response.survey.deletedAt`    | 2.003 / 2.078 / 3.281 ms |

`EXPLAIN ANALYZE`: bentuk lama satu `Parallel Seq Scan` atas `answers`
(687 ms); bentuk sekarang menambahkan `Parallel Hash Join` dengan 744.000
baris `survey_responses` lalu `Hash Join` dengan `surveys` (2.247 ms). Jadi
sekitar 1,5 detik tambahan per jalan dingin lahir dari satu kueri itu, dan
kueri lain di `Promise.all` yang sama berebut kolam koneksi bersamanya. Belum
dibuktikan dengan membalik `f1c132e`; buktinya pengukuran kueri terpisah di
atas.

**Kaitannya dengan QA-PERF ("dashboard < 3 detik").** Jalan dingin
`/statistics` kini MELEWATI 3 detik pada T3, padahal 13 Oktober di bawahnya.
Batas yang harus dibaca bersamanya:

- T3 = 744.000 respons, jauh di atas "ribuan responden". Pada ukuran yang
  diminta QA-PERF, jalan dinginnya belum diukur hari ini (lihat 12.4, diukur sesudahnya).
- Hanya SATU permintaan per 60 detik yang menanggungnya (TTL singgahan);
  penahan stampede tetap bekerja -- maks 4.973 ms, di bawah waktu dingin
  tunggalnya. Hangatnya 8-9 ms.
- `/statistics` tetap `@Public()`.
- Dataset beban tak memuat satu pun survei di Sampah. Biaya join itu dibayar
  penuh walau tak ada baris yang disaringnya.

**Arah perbaikan (belum dicoba di kode aplikasi).** Sampah lazimnya kecil,
jadi menghitung yang DIBUANG lalu mengurangkannya dari hitungan lama jauh
lebih murah daripada menyaring 6,7 juta baris lewat dua join: kueri jawaban
milik survei di Sampah diukur 9,6 ms pada dataset ini (nol baris). Keputusan
dan pembuktiannya milik pengembang; uji BUG-013 yang ada harus tetap hijau.
Dicatat sebagai [BUG-067](BUG_REPORTS.md#bug-067).

### 12.4 T1 -- ukuran yang diminta QA-PERF

Dibangun sesudah 12.1-12.3 atas permintaan pengguna (`beban:data -- --survei=744
--respons=20`, 26 detik): 744 survei, 14.880 respons, 133.920 jawaban.
**`skm_beban` kini memuat T1, bukan T3**; membangun T3 lagi memakan ~17 menit.

Jalur hangat, `--semua`, 10 koneksi, 10 detik:

| Skenario         | Dingin | p50   | p95    | p99    | Maks   | req/s |
| ---------------- | ------ | ----- | ------ | ------ | ------ | ----- |
| statistik        | 498 ms | 12 ms | 21 ms  | 25 ms  | 73 ms  | 738   |
| dashboard-ikm    | 248 ms | 75 ms | 129 ms | 133 ms | 139 ms | 122   |
| hasil-ikm        | 56 ms  | 24 ms | 32 ms  | 35 ms  | 44 ms  | 399   |
| daftar-pengaduan | 23 ms  | 25 ms | 56 ms  | 72 ms  | 122 ms | 356   |
| isi-survei-baca  | 39 ms  | 36 ms | 54 ms  | 62 ms  | 80 ms  | 265   |

Jalur dingin, `--dingin`, 10 koneksi, 15 detik:

| Skenario      | Dingin | p50   | p99    | Maks   | req/s |
| ------------- | ------ | ----- | ------ | ------ | ----- |
| statistik     | 352 ms | 8 ms  | 19 ms  | 307 ms | 1.025 |
| dashboard-ikm | 424 ms | 81 ms | 138 ms | 458 ms | 116   |

Seluruh jawaban 2xx, "Dataset tetap" pada ketiga jalan.

**Pada ukuran ini syarat QA-PERF "dashboard < 3 detik" terpenuhi dengan
lebar:** permintaan terburuk dari kedua endpoint dashboard 498 ms, termasuk
jalan dingin. Kemunduran 12.3 ada juga di sini -- kueri `answer.groupBy`
berpenyaring 75-79 ms lawan 25-35 ms tanpa penyaring -- tetapi selisih
absolutnya puluhan milidetik. Dicatat sebagai
[BUG-067](BUG_REPORTS.md#bug-067).

Pembanding T1 13 Oktober (§5) diukur SEBELUM `2c63911` menghapus kipas per
survei, jadi tak sebanding dengan tabel ini dan tidak disandingkan.

### 12.5 T2 dan dashboard Admin OPD (4 November 2026)

Dua celah dari daftar "belum diukur" ditutup keesokan harinya.

**`GET /dashboard/opd` kini punya skenario**, `dashboard-opd`, di cabang
`test/beban-dashboard-opd` (`0f2454e`, menunggu PR; hanya skrip pengukur yang
berubah, kode aplikasi tidak). Akun beban kini memegang peran `opd` dan
tertaut ke OPD `BEBAN0001`, yang memegang 12 survei seperti setiap OPD beban.
Endpoint ini tanpa singgahan, jadi setiap permintaannya jalan dingin.

**T2 dibangun** (`--survei=744 --respons=200`, 233 detik): 148.800 respons,
1.339.200 jawaban, 2.400 respons per OPD. **`skm_beban` kini memuat T2.**

Jalur hangat, `--semua`, 10 koneksi, 10 detik, pada T2:

| Skenario         | Dingin | p50   | p95    | p99    | Maks   | req/s |
| ---------------- | ------ | ----- | ------ | ------ | ------ | ----- |
| statistik        | 710 ms | 7 ms  | 14 ms  | 17 ms  | 27 ms  | 1.149 |
| dashboard-ikm    | 393 ms | 79 ms | 116 ms | 124 ms | 158 ms | 120   |
| hasil-ikm        | 53 ms  | 26 ms | 43 ms  | 47 ms  | 67 ms  | 363   |
| daftar-pengaduan | 23 ms  | 26 ms | 48 ms  | 57 ms  | 81 ms  | 348   |
| isi-survei-baca  | 22 ms  | 32 ms | 58 ms  | 64 ms  | 127 ms | 280   |
| dashboard-opd    | 62 ms  | 96 ms | 203 ms | 267 ms | 281 ms | 95    |

Jalur dingin, `--dingin`, 10 koneksi, 15 detik, pada T2:

| Skenario      | Dingin | p50   | p99    | Maks   | req/s |
| ------------- | ------ | ----- | ------ | ------ | ----- |
| statistik     | 993 ms | 8 ms  | 18 ms  | 891 ms | 1.007 |
| dashboard-ikm | 487 ms | 78 ms | 158 ms | 778 ms | 112   |

`dashboard-opd` diukur tiga kali di luar tabel: T1 dua kali (p50 73 dan
80 ms, maks 190 dan 365 ms) dan T2 sekali lagi (p50 90 ms, maks 258 ms).
Seluruh jawaban 2xx dan "Dataset tetap" pada setiap jalan.

**Kesimpulan untuk QA-PERF:** pada T1 dan T2 kedua dashboard admin dan
statistik publik selalu di bawah 1 detik, termasuk permintaan pertama. Syarat
"< 3 detik" baru terlewati pada T3, dan hanya oleh permintaan pertama
`/statistics` (BUG-067). Kurva dingin `/statistics` kini tiga titik:

| Dataset | Jawaban   | Dingin `/statistics` |
| ------- | --------- | -------------------- |
| T1      | 133.920   | 352 / 498 ms         |
| T2      | 1.339.200 | 710 / 993 ms         |
| T3      | 6.696.000 | 3.739 / 6.255 ms     |

**Batas yang tetap berlaku:** dataset beban tak memuat jawaban teks maupun
pengaduan, padahal `/dashboard/opd` membaca keduanya (jawaban teks terbaru,
hitungan pengaduan per status). Dua bagian kueri itu belum dibebani.

### 12.6 Jawaban teks, pengaduan, dan T3 (4 November 2026)

Sampai §12.5 dataset beban tak memuat jawaban teks maupun pengaduan. Pembangunnya
kini punya `--teks=` (persen respons yang menulis saran) dan `--pengaduan=` (jumlah
per OPD), di cabang `test/beban-teks-pengaduan` (`5fb6393`, menunggu PR). Bakunya
nol, jadi perintah T1, T2, dan T3 lama tetap membangun dataset yang sama. Hanya
skrip pengukur yang berubah.

`uraian` dienkripsi seperti di produksi, supaya `GET /complaints` ikut membayar
dekripsi. Campuran statusnya anggapan: 50% selesai, 20% diterima, 20% diproses,
10% ditolak. 100% jawaban teks adalah batas atas, bukan perkiraan.

Empat dataset, masing-masing `--semua` 10 koneksi 10 detik, lalu `--dingin` 15
detik dan satu jalan ulang `dashboard-opd`. Angka ganda berarti dua jalan. Seluruh
jawaban 2xx dan "Dataset tetap" pada setiap jalan.

| Ukuran                      | A: T2 kosong | B: T2 + 62 rb    | C: T2 + 310 rb   | D: T3 + 62 rb    |
| --------------------------- | ------------ | ---------------- | ---------------- | ---------------- |
| Respons                     | 148.800      | 148.800          | 148.800          | 744.000          |
| Jawaban teks                | 0            | 148.800          | 148.800          | 744.000          |
| Pengaduan                   | 0            | 62.000           | 310.000          | 62.000           |
| Pertama `/statistics`       | 710 / 993 ms | 1.769 / 1.932 ms | 4.613 / 4.509 ms | 6.034 / 4.683 ms |
| Pertama `dashboard-ikm`     | 393 / 487 ms | 570 / 785 ms     | 720 / 520 ms     | 1.792 / 1.699 ms |
| `dashboard-opd` p50         | 96 / 90 ms   | 102 / 120 ms     | 244 / 271 ms     | 250 / 219 ms     |
| `dashboard-opd` maks        | 281 / 258 ms | 238 / 440 ms     | 456 / 553 ms     | 587 / 377 ms     |
| `daftar-pengaduan` p50      | 26 ms        | 163 ms           | 692 ms           | 236 ms           |
| `daftar-pengaduan` maks     | 81 ms        | 309 ms           | 1.306 ms         | 401 ms           |
| `hasil-ikm` p50             | 26 ms        | 24 ms            | 32 ms            | 33 ms            |
| `isi-survei-baca` p50       | 32 ms        | 28 ms            | 36 ms            | 38 ms            |

Kolom A adalah §12.5. Pada kolom C `/statistics` melewati 3 detik pada permintaan
pertama, padahal respons tak bergeser dari kolom B; yang berubah hanya pengaduan.

**Dashboard Admin OPD aman pada keempat dataset.** Terburuk 587 ms, dan pada T3
dengan 12.000 respons per OPD sekalipun. Kueri tambahannya diukur sendiri pada
kolom B untuk satu OPD: jawaban teks terbaru 15-24 ms (mengembalikan 5 baris),
pengaduan selesai 8-11 ms (500 baris), hitungan pengaduan aktif 4-6 ms (400). Jadi
datanya benar-benar terbaca, bukan kueri atas nol baris.

**`/statistics` memuat seluruh pengaduan ke memori ([BUG-068](BUG_REPORTS.md#bug-068)).** `complaint.findMany` tanpa
batas di `dashboard.service.ts:352`, dipakai untuk tren dan rata-rata waktu
penyelesaian. Pada kolom B kueri itu saja 673-991 ms untuk 62.000 baris, lebih
mahal dari `answer.groupBy` penyebab [BUG-067](BUG_REPORTS.md#bug-067) (355-394 ms).
Hanya permintaan pertama yang terkena; sesudahnya singgahan menjawab (p50 9-12 ms).

**`GET /complaints` membayar setiap permintaan, dan tanpa singgahan ([BUG-069](BUG_REPORTS.md#bug-069)).** `complaints`
tak punya indeks `created_at`, sedangkan daftarnya `ORDER BY created_at DESC`.
Rencana kuerinya pada 62.000 baris: Parallel Seq Scan lalu top-N heapsort, 36 ms.
Uraiannya ada di BUG-069: pemindaian urutan bagian terbesar, dekripsi 20 baris
hanya 2 ms, dan indeks `created_at` menurunkan kuerinya dari 36-41 ms ke 5-6 ms.
Selisih kolom B dan D (163 dan 236 ms, pengaduan sama) belum dijelaskan.

**Membaca kolom C.** 5.000 pengaduan per OPD adalah uji batas, bukan perkiraan
volume; tak ada data penerimaan pengaduan untuk memperkirakannya.

`skm_beban` kini memuat kolom D.

### 12.7 Yang belum diukur

- Ketersediaan dan seluruh jalur tulis (§11, tetap ditunda).

**Diperbarui 4 November 2026:** ketersediaan kini diukur di §13. Jalur tulis tetap ditunda (§11).

## 13. Uji ketersediaan (4 November 2026, QA-PERF)

Diukur pada `main` `5cda6fa`. Sasaran dari PRD §10: "target uptime ≥ 99%; backup database terjadwal harian".

### 13.1 Kesimpulan

| Pertanyaan | Hasil |
| --- | --- |
| Uptime ≥ 99% | **Belum dapat dinyatakan.** Angka itu hanya terukur di server sungguhan selama berminggu-minggu; belum ada server maupun pemantau. 99% berarti paling lama 7 jam 12 menit padam per 30 hari. |
| API pulih sendiri sesudah DB/Redis kembali | **Lulus.** Tak perlu restart; paling lama 2,5 detik sesudah perintah menyalakan DB, 0,3 detik sesudah Redis. |
| Sesi selamat dari restart API dan restart Redis | **Lulus di server.** Token yang sama tetap dijawab 200. Di peramban tidak selamat bila Redis padam lebih dari 5 detik ([BUG-070](BUG_REPORTS.md#bug-070)). |
| Ketahanan saat Redis gangguan | **Gagal.** Redis mati mengeluarkan pengguna; Redis macet membuat seluruh API tak menjawab ([BUG-070](BUG_REPORTS.md#bug-070), [BUG-071](BUG_REPORTS.md#bug-071)). Diperbaiki hari yang sama, §13.9. |
| `/health` mewakili keadaan layanan | **Gagal.** Tetap 200 selama DB mati ([BUG-072](BUG_REPORTS.md#bug-072)). |
| Cadangan dapat dipulihkan | **Lulus**, dengan dua catatan ([BUG-074](BUG_REPORTS.md#bug-074)). |
| Cadangan terjadwal harian | **Belum ada** ([BUG-073](BUG_REPORTS.md#bug-073)). |
| Soak 30 menit jalur baca | **Lulus.** 276.370 permintaan, 0 gagal. Belum cukup panjang untuk menyatakan bebas kebocoran memori. |

### 13.2 Cara mengukur

Rig sekali pakai, dibongkar sesudahnya: API `main.ts` hasil tsc (`dist-beban/`) di porta 3003, kontainer `postgres:18-alpine` dan `redis:7-alpine --appendonly yes` tersendiri. Dataset: 744 survei, 14.880 respons, 135.409 jawaban, 6.200 pengaduan. Hanya kontainer rig yang diganggu; `skm_db`, `skm_beban`, dan server dev tetap jalan dan jumlah barisnya dicek sebelum dan sesudah.

Satu probe per endpoint, satu permintaan per detik tanpa menunggu jawaban sebelumnya, batas 30 detik di sisi klien. Gangguan 60 detik (DB mati 90 detik).

| Gangguan | Perintah | Meniru |
| --- | --- | --- |
| Mati | `docker kill`, lalu `docker start` | Proses jatuh, koneksi ditolak |
| Macet | `docker pause`, lalu `docker unpause` | Layanan hang, koneksi tetap terbuka tanpa jawaban |

Berkas pengukur ada di `qa-bug-hunt/repros/ketersediaan/`, lokal dan tak tercatat git.

**Batas yang harus dibaca bersama angkanya:**

- Laptop Windows ber-Docker Desktop dan `NODE_ENV=development`. Status jawaban dan urutan kejadian dapat dipakai; milidetiknya tidak dapat diterapkan ke server.
- `THROTTLE_LIMIT` dilonggarkan seperti pada §2.
- Tanpa nginx: API dipukul langsung. Di depan nginx permintaan yang menggantung berakhir sesuai `proxy_read_timeout`, yang belum diukur.

### 13.3 Dependensi padam

Jawaban selama gangguan, dalam jumlah permintaan. Latensi p50 dan maks dalam milidetik.

| Gangguan | `/health` | `/statistics` (publik, singgah 60 s) | `/auth/me` | `/complaints` | Lampiran `/uploads` |
| --- | --- | --- | --- | --- | --- |
| DB mati, 90 s | 200 x90; p50 11 | 200 x46, lalu 500 x44; p50 26 | 500 x90; p50 2.068, maks 4.347 | 500 x90; p50 2.068, maks 4.347 | tak diprobe |
| DB macet, 60 s | 200 x60; p50 7 | 200 x50, 500 x10; maks 10.036 | 200 x10, 500 x49, batas 30 s x1; p50 9.937 | 200 x10, 500 x50; p50 9.981 | 200 x60; p50 9 |
| Redis mati, 60 s | 200 x60; **p50 6.650**, maks 15.292 | 200 x44, batas 30 s x16; **p50 23.392** | 200 x2, **401 x58**; p50 7.058 | 200 x2, **401 x58**; p50 7.058 | 200 x26, batas 30 s x34; **p50 30.001** |
| Redis macet, 60 s | 200 x30, batas 30 s x30 | 200 x29, batas 30 s x31 | 200 x29, batas 30 s x31 | 200 x29, batas 30 s x31 | 200 x30, batas 30 s x30 |

Membaca baris "macet": tak ada jawaban selama layanan beku. Yang tercatat 200 adalah permintaan yang masih menunggu saat layanan kembali, lalu selesai. Pada DB macet penantian itu berakhir 500 sesudah sekitar 10 detik; pada Redis macet tak berakhir sama sekali sampai Redis kembali.

Yang tak terganggu: `/health` selama DB mati dan macet, lampiran selama DB macet, dan `/statistics` dari singgahan sampai TTL-nya habis. API tak pernah jatuh pada keempat gangguan.

**Log saat Redis mati** dipenuhi `[ioredis] Unhandled error event` (64 baris dalam 60 detik) karena koneksi itu tak punya pendengar `error`. Prosesnya tidak jatuh.

### 13.4 Waktu pulih

Dihitung dari perintah mengakhiri gangguan sampai permintaan pertama yang sesudahnya semua sukses.

| Gangguan | Waktu pulih | Gagal sesudah perintah |
| --- | --- | --- |
| DB mati | 2,5 s (Postgres siap 2,3 s) | 2 per endpoint ber-DB |
| DB macet | 0,3 s | 0 |
| Redis mati | 0,2-0,3 s | 0 |
| Redis macet | 0,3 s | 0 |
| API dibunuh lalu dinyalakan | 10,2 s sesudah perintah nyala; `/health` sehat 9,3 s | 10 per endpoint |

| Boot | Hasil |
| --- | --- |
| DB dan Redis hidup | Sehat dalam 8,8-9,3 s (tiga jalan yang tercatat) |
| DB mati | Lima percobaan, lalu keluar kode 1 sesudah 33,2 s. Benar untuk penyelia proses, tetapi **saat ini tak ada penyelia**: API yang jatuh tetap mati sampai dinyalakan orang. |
| Redis mati | Sehat dalam 8,6 s, tetapi `dev-login` dijawab 500. Jalur SSO belum diuji. |

### 13.5 Apa yang dilihat pengguna

Masuk sungguhan lewat antarmuka di server dev (`warga`, Admin Kabupaten), lalu jawaban API dipalsukan di peramban memakai status yang terukur di §13.3, dimuat ulang, gangguan dicabut, dan dimuat ulang lagi.

| Jawaban API | Tampilan selama gangguan | `POST /auth/logout` | Sesudah pulih |
| --- | --- | --- | --- |
| 401 (Redis mati) | Warga: "Gagal memuat ... Autentikasi diperlukan". Admin: "Sesi berakhir" | 16 kali (warga), 10 kali (admin) | **Keluar, terlempar ke `/`** |
| 500 (DB mati) | "Gagal memuat ... Terjadi kesalahan pada server." | 0 | Tetap masuk |
| 502 (nginx) | "Gagal memuat ... **Request failed with status code 502**" | 0 | Tetap masuk |
| Jaringan putus | "Gagal memuat ... **Network Error**" | 0 | Tetap masuk |

**Yang tidak diuji:** rangkaian ujung ke ujung dengan Redis sungguhan mati di bawah frontend, dan jalur cookie SSO. API terukur menjawab 401, frontend terukur membuang sesi pada 401; keduanya diukur terpisah.

### 13.6 Cadangan dan pemulihan

| Dataset | `pnpm cadangan` | Ukuran dump | `pnpm pulihkan` | Pencocokan |
| --- | --- | --- | --- | --- |
| Rig (135.409 jawaban) | 1,1 s | 7,8 MB | 2,2 s | Jumlah baris 7 tabel dan md5 5 kolom identik |
| T3 (7.440.000 jawaban, `skm_beban`, baca saja) | 17 s | 437 MB | 114 s | Jumlah baris 3 tabel dan `sum(id)` jawaban identik |

**Catatan cara:** jalan T3 memakai `node --max-old-space-size=4096`, yang tidak dipakai `pnpm pulihkan`. Tanpa flag itu belum diuji. Lampiran ikut tersalin ke cadangan tetapi tidak dipulihkan, sesuai rancangan skripnya. Waktu menyalin lampiran dan menyalakan API tak termasuk 114 detik itu.

### 13.7 Soak

10 pekerja berputar pada tujuh jalur baca, tanpa jeda, 30 menit.

| Ukuran | Hasil |
| --- | --- |
| Permintaan | 276.370, **0 gagal** |
| Memori privat proses, sesudah menit ke-2 | 372-380 MB |
| Kemiringan memori privat, paruh kedua | 0,21 MB/menit |
| Koneksi DB | 10, tetap |
| Kunci Redis | 25-34, tak tumbuh |
| Latensi | p50 42-44 ms sampai menit ke-8, lalu naik ke sekitar 75 ms mulai menit ke-11 dan bertahan |

**Kenaikan latensi bukan penurunan API.** Proses API baru pada mesin yang sama langsung mencatat p50 71-81 ms (4 menit, 30.197 permintaan, 0 gagal). Sebabnya beban lain di laptop; beban CPU mesin 49% saat diperiksa sesudahnya.

**Kebocoran memori belum dapat disingkirkan.** 0,21 MB/menit dalam 15 menit masih bisa derau, tetapi bila lurus berarti sekitar 300 MB per hari. Membedakannya menuntut soak berjam-jam.

### 13.8 Yang belum diukur

- Uptime sungguhan, karena belum ada server dan pemantau.
- Shutdown anggun: pada Windows `kill` langsung mengakhiri proses tanpa `SIGTERM`, jadi `enableShutdownHooks` dan permintaan yang sedang jalan saat penggelaran tak teruji.
- Disk penuh, `UPLOAD_DIR` tak terjangkau, dan koneksi DB habis.
- Gangguan selagi menulis, sebab jalur tulis tetap ditunda (§11).
- Soak lebih dari 30 menit.

### 13.9 Sesudah perbaikan BUG-070 dan BUG-071

Masuk `main` lewat PR #15 (merge `3cd88e8`, commit `6ead556`), CI `main` hijau. Rig, dataset, dan probe sama dengan §13.2, gangguan 60 detik. Latensi p50.

| Endpoint | Redis macet, sebelum | Redis macet, sesudah | Redis mati, sebelum | Redis mati, sesudah |
| --- | --- | --- | --- | --- |
| `/health` | 200 x30, batas 30 s x30 | 200 x60; 1.019 ms | 200 x60; 6.650 ms | 200 x60; 1.017 ms |
| `/statistics` | 200 x29, batas 30 s x31 | 200 x60; 2.289 ms | 200 x44, batas 30 s x16 | 200 x60; 2.248 ms |
| `/auth/me` | 200 x29, batas 30 s x31 | 200 x2, 503 x58; 2.029 ms | 200 x2, 401 x58; 7.058 ms | 200 x1, 503 x59; 2.027 ms |
| `/complaints` | 200 x29, batas 30 s x31 | 200 x2, 503 x58; 2.030 ms | 200 x2, 401 x58; 7.058 ms | 200 x1, 503 x59; 2.027 ms |
| Lampiran | 200 x30, batas 30 s x30 | 200 x1, 503 x59; 1.021 ms | 200 x26, batas 30 s x34; 30.001 ms | 503 x60; 1.017 ms |

Pada kolom "sebelum" untuk Redis macet, 200 berarti jawaban yang baru tiba sesudah Redis kembali (§13.3). Pada kolom "sesudah", jawabannya tiba selama gangguan. Pemulihan tetap cepat: 0,2-1,2 detik, dengan paling banyak dua 503 sesudah perintah menyalakan Redis.

**Peramban sungguhan.** Permintaan `/api/v1` dari frontend dev diteruskan ke API rig, dan Redis rig dibunuh sungguhan, dua peran. Yang tiba hanya 503 (10 dan 16 jawaban), 0 `POST /auth/logout`, tetap masuk selama gangguan dan sesudah pulih. Ini menutup batas §13.5 untuk jalur token, bukan untuk cookie SSO.

**Yang masih terbuka:** tiap permintaan bertambah sekitar 1 detik per perintah Redis selama padam, masuk baru tetap 500, dan `[ioredis] Unhandled error event` masih mengisi log.

---

## 14. Penutupan QA-PERF (5 November 2026)

**Keputusan: QA-PERF ditutup dengan catatan.** Diputuskan penguji pada 5 November 2026, sehari sebelum tenggat. Ini keputusan pengujian, bukan persetujuan pemilik produk atau pernyataan siap produksi.

### 14.1 Hasil terhadap sasaran

| Sasaran | Hasil | Bukti |
| --- | --- | --- |
| Dashboard < 3 detik untuk ribuan responden | **Terpenuhi.** Terburuk 498 ms pada T1; selalu di bawah 1 detik pada T1 dan T2, termasuk permintaan pertama | §12.4, §12.5 |
| API pulih sendiri sesudah DB dan Redis kembali | **Lulus.** Tanpa restart; paling lama 2,5 detik sesudah DB dinyalakan, 0,3 detik sesudah Redis | §13.1 |
| Tahan gangguan Redis | **Lulus sesudah perbaikan.** BUG-070 dan BUG-071 sudah ditutup | §13.9 |
| Soak 30 menit jalur baca | **Lulus.** 276.370 permintaan, 0 gagal | §13.7 |
| Cadangan dapat dipulihkan | **Lulus, dengan dua catatan** dari BUG-074 | §13.6 |
| Uptime ≥ 99% | **Belum dapat dinyatakan.** Belum ada server maupun pemantau | §13.1 |
| Cadangan terjadwal harian | **Belum ada** (BUG-073, Medium) | §13.6 |

### 14.2 Catatan yang ikut pada penutupan

1. **BUG-073 menjadi syarat sebelum GO-LIVE 23 November 2026.** Temuan ini tetap terbuka dan belum punya pemilik perbaikan. PRD §10 memintanya, dan kehilangan data tanpa cadangan harian tidak tertangani oleh kinerja yang baik. **Diperbarui 12 November 2026:** BUG-073 ditutup lewat PR #37 (merge `d6b3beb`) dengan penjadwal di dalam API. Tiga syarat tetap milik tim server sebelum GO-LIVE: `pg_dump` 18 di server API, `BACKUP_DIR` di luar mesin, dan kedua kunci enkripsi.
2. **Uptime dibawa ke tahap server.** Angkanya hanya dapat diukur di server sungguhan selama berminggu-minggu, jadi penutupan ini tidak menyatakan sasaran itu tercapai.
3. **Jalur tulis tetap ditunda** (§11). Beban saat warga mengirim jawaban dan pengaduan, serta gangguan selagi menulis, belum diukur.
4. **Angka di atas diukur sebelum PR #17 dan #18**, pada `main` `9e72abb` dan `5cda6fa`. PR #17 mengubah layanan `dashboard`, `opd`, dan `ikm`; di `dashboard` penyaring status belum tuntas kini memakai `STATUS_BELUM_TUNTAS`. Dampaknya pada waktu jawab belum diukur ulang. Yang berjalan terhadap `a1e3c1f` hanya uji fungsional, bukan uji beban. **Diperbarui 9 November 2026:** kini diukur ulang di §15.
5. **Batas pada data besar tetap terbuka.** Permintaan pertama `/statistics` melewati 3 detik pada T3 (3.739 / 6.255 ms, BUG-067) dan pada 310.000 pengaduan (BUG-068). `GET /complaints` memindai seluruh tabel (BUG-069). Ketiganya Low dan berada di atas ukuran yang diminta QA-PERF.
6. **Temuan Low lain yang tetap terbuka:** BUG-072 (`/health` tetap 200 saat DB mati), BUG-074, dan BUG-075.
7. **Yang belum diukur di §13.8 tetap belum diukur**, antara lain shutdown anggun, disk penuh, koneksi DB habis, dan soak lebih dari 30 menit.

## 15. Pengukuran ulang sesudah PR #17 dan #18 (9 November 2026)

Menjawab catatan §14.2 butir 4. Diukur pada `main` `50175c7`. Kode aplikasinya
sama dengan `b904be4` (merge PR #24 hanya melepas `.claude/skills/`), jadi yang
terukur memuat PR #17 dan #18 **dan** semua yang masuk sesudahnya sampai PR #23,
termasuk perubahan siklus sesi (#20) dan dev-login (#22). Selisih apa pun di
bawah tak dapat ditunjuk ke satu PR tertentu.

Pelari dan perintahnya sama dengan §12: `--semua` 10 koneksi 10 detik, lalu
`--semua --dingin` 10 koneksi 15 detik, masing-masing **dua kali**. Seluruh
jawaban 2xx dan "Dataset tetap" pada kedelapan jalan. Server dev **mati**
selama pengukuran (porta 3000-3002 tak ada yang mendengarkan). Pada 3 November
ia ikut hidup (§12); pada 4 November keadaannya tak tercatat.

Angka ganda berarti jalan pertama / jalan kedua.

### 15.1 Dataset D (T3 + 62.000 pengaduan), dibanding §12.6 kolom D

Dataset D tidak dibangun ulang. Yang dikerjakan hanya
`beban:data -- --survei=0 --tambah`, yang menerapkan empat migrasi tertinggal
(`20261104090000_tingkat_pengaduan`, `20261104150000_alur_status_pengaduan`,
`20261105093000_status_dialihkan`, `20261105110000_fk_opd_tujuan_set_null`)
tanpa mengosongkan apa pun. Migrasi alur status memetakan `diterima` ke
`menunggu_verifikasi` dan `diproses` ke `sedang_ditindaklanjuti`, jadi porsi
pengaduan belum tuntas tetap 40% seperti pada 4 November.

Jalur hangat, `--semua`:

| Skenario         | Pertama          | p50          | p95          | p99            | Maks            | req/s      |
| ---------------- | ---------------- | ------------ | ------------ | -------------- | --------------- | ---------- |
| statistik        | 3.514 / 3.266 ms | 8 / 9 ms     | 13 / 15 ms   | 17 / 19 ms     | 60 / 55 ms      | 1.111 / 1.033 |
| dashboard-ikm    | 1.190 / 1.131 ms | 75 / 79 ms   | 116 / 145 ms | 121 / **2.703** ms | 135 / **2.733** ms | 125 / 86 |
| hasil-ikm        | 155 / 247 ms     | 25 / 33 ms   | 34 / 80 ms   | 36 / 90 ms     | 45 / 151 ms     | 385 / 266  |
| daftar-pengaduan | 101 / 74 ms      | 231 / 247 ms | 396 / 400 ms | 440 / 438 ms   | 508 / 501 ms    | 41 / 39    |
| isi-survei-baca  | 60 / 61 ms       | 33 / 32 ms   | 50 / 76 ms   | 57 / 90 ms     | 83 / 155 ms     | 286 / 266  |
| dashboard-opd    | 96 / 125 ms      | 179 / 209 ms | 244 / 421 ms | 271 / 468 ms   | 276 / 485 ms    | 54 / 46    |

Jalur dingin, `--semua --dingin`:

| Skenario         | Pertama          | p50          | p99          | Maks             | req/s     |
| ---------------- | ---------------- | ------------ | ------------ | ---------------- | --------- |
| statistik        | 3.599 / 4.804 ms | 8 / 13 ms    | 23 / 52 ms   | 3.346 / 4.005 ms | 764 / 462 |
| dashboard-ikm    | 1.235 / 1.672 ms | 71 / 93 ms   | 151 / 179 ms | 1.514 / 1.749 ms | 123 / 93  |
| hasil-ikm        | 113 / 155 ms     | 24 / 36 ms   | 39 / 64 ms   | 555 / 706 ms     | 381 / 251 |
| daftar-pengaduan | 97 / 146 ms      | 205 / 335 ms | 332 / 528 ms | 404 / 651 ms     | 48 / 29   |
| isi-survei-baca  | 88 / 193 ms      | 33 / 47 ms   | 121 / 84 ms  | 209 / 108 ms     | 243 / 203 |
| dashboard-opd    | 272 / 171 ms     | 216 / 233 ms | 911 / 707 ms | 1.294 / 1.003 ms | 39 / 40   |

Dibanding kolom D §12.6:

| Ukuran                  | 4 Nov            | 9 Nov (empat jalan) |
| ----------------------- | ---------------- | ------------------- |
| Pertama `/statistics`   | 6.034 / 4.683 ms | 3.266 - 4.804 ms    |
| Pertama `dashboard-ikm` | 1.792 / 1.699 ms | 1.131 - 1.672 ms    |
| `dashboard-opd` p50     | 250 / 219 ms     | 179 - 233 ms        |
| `daftar-pengaduan` p50  | 236 ms           | 205 - 335 ms        |
| `hasil-ikm` p50         | 33 ms            | 24 - 36 ms          |
| `isi-survei-baca` p50   | 38 ms            | 32 - 47 ms          |

**Tak ada yang memburuk secara berarti.** Permintaan pertama `/statistics` dan
`dashboard-ikm` justru lebih rendah, tetapi perubahan kodenya tidak menyentuh
kueri penyebab BUG-067 dan BUG-068. Sebab selisihnya tak diketahui; kandidatnya
derau mesin dan server dev yang mungkin ikut hidup pada 4 November. Ini
**tidak** dibaca sebagai perbaikan.
Permintaan pertama `/statistics` tetap melewati 3 detik pada D; BUG-067 dan
BUG-068 tetap terbuka.

Tiga hal yang belum dijelaskan:

1. **`dashboard-ikm` hangat sekali mencapai 2.733 ms** (jalan kedua `--semua`,
   p99 2.703 ms). Jalan pertama maksimal 135 ms. Dugaan: singgahannya kedaluwarsa
   di tengah jalan, sehingga satu hitung ulang (~1,1-1,7 detik pada D) ditunggu
   bersama oleh permintaan yang tertahan penahan stampede. Dugaan ini belum
   dibuktikan. Angkanya tetap di bawah 3 detik.
2. **`dashboard-opd` maks 1.003-1.294 ms pada jalan `--dingin`**, lawan 276-485 ms
   pada `--semua` dan 377-587 ms pada 4 November. Endpoint ini tanpa singgahan,
   jadi `--dingin` seharusnya tak mengubah apa pun baginya. Belum diselidiki.
3. **`hasil-ikm` maks 555-706 ms pada `--dingin`**, lawan 45-151 ms hangat.
   Ini sesuai harapan (penyapu mengosongkan singgahannya), dan dicatat hanya
   supaya tak dibaca sebagai kemunduran.

### 15.2 T1, ukuran yang diminta QA-PERF, dibanding §12.4 dan §12.5

Sesudah 15.1, T1 dibangun ulang (`beban:data -- --survei=744 --respons=20`,
30,2 detik): 744 survei, 14.880 respons, 133.920 jawaban, 0 jawaban teks,
0 pengaduan. Sama dengan §12.4.

Jalur hangat, `--semua`:

| Skenario         | Pertama      | p50          | p95          | p99          | Maks         | req/s      |
| ---------------- | ------------ | ------------ | ------------ | ------------ | ------------ | ---------- |
| statistik        | 365 / 472 ms | 9 / 9 ms     | 17 / 18 ms   | 28 / 22 ms   | 76 / 38 ms   | 966 / 1.001 |
| dashboard-ikm    | 313 / 282 ms | 135 / 80 ms  | 369 / 102 ms | 487 / 111 ms | 550 / 210 ms | 62 / 121   |
| hasil-ikm        | 74 / 59 ms   | 52 / 30 ms   | 99 / 66 ms   | 114 / 75 ms  | 174 / 134 ms | 180 / 294  |
| daftar-pengaduan | 63 / 19 ms   | 38 / 22 ms   | 62 / 32 ms   | 83 / 36 ms   | 147 / 47 ms  | 244 / 422  |
| isi-survei-baca  | 44 / 27 ms   | 47 / 28 ms   | 71 / 43 ms   | 80 / 51 ms   | 91 / 123 ms  | 203 / 337  |
| dashboard-opd    | 64 / 45 ms   | 123 / 66 ms  | 237 / 108 ms | 274 / 125 ms | 353 / 179 ms | 76 / 144   |

Jalur dingin, `--semua --dingin`:

| Skenario         | Pertama      | p50        | p99          | Maks             | req/s       |
| ---------------- | ------------ | ---------- | ------------ | ---------------- | ----------- |
| statistik        | 306 / 344 ms | 6 / 10 ms  | 14 / 48 ms   | 268 / 310 ms     | 1.358 / 736 |
| dashboard-ikm    | 273 / 620 ms | 70 / 76 ms | 101 / 254 ms | 371 / **1.104** ms | 137 / 111 |
| hasil-ikm        | 86 / 35 ms   | 23 / 27 ms | 36 / 69 ms   | 129 / 145 ms     | 412 / 338   |
| daftar-pengaduan | 29 / 23 ms   | 22 / 26 ms | 44 / 113 ms  | 255 / 386 ms     | 413 / 302   |
| isi-survei-baca  | 58 / 45 ms   | 42 / 40 ms | 143 / 70 ms  | 240 / 111 ms     | 208 / 235   |
| dashboard-opd    | 42 / 49 ms   | 78 / 85 ms | 124 / 165 ms | 170 / 202 ms     | 125 / 114   |

Dibanding §12.4 dan §12.5:

| Ukuran                   | 3-4 Nov                 | 9 Nov (empat jalan)  |
| ------------------------ | ----------------------- | -------------------- |
| Pertama `/statistics`    | 498 ms; dingin 352 ms   | 306 - 472 ms         |
| Pertama `dashboard-ikm`  | 248 ms; dingin 424 ms   | 273 - 620 ms         |
| `dashboard-ikm` maks     | 139 ms; dingin 458 ms   | 210 - 550 ms; satu jalan 1.104 ms |
| `dashboard-opd` p50      | 73 / 80 ms              | 66 - 123 ms          |
| `dashboard-opd` maks     | 190 / 365 ms            | 170 - 353 ms         |

**Syarat QA-PERF "dashboard < 3 detik" tetap terpenuhi.** Permintaan terburuk
dari kedua endpoint dashboard dan `/statistics` di kedelapan jalan T1 adalah
1.104 ms. Itu naik dari 498 ms pada §12.4, tetapi hanya satu sampel: tiga jalan
lain berhenti di 550 ms atau kurang. Satu sampel tak cukup untuk menyebutnya
kemunduran, dan belum diselidiki.

Jalan `--semua` pertama sesudah pembangunan ulang lebih lambat di hampir setiap
skenario (`dashboard-ikm` p50 135 ms lawan 80 ms pada jalan kedua). Dugaan:
basis data baru saja menerima sisipan massal dan statistik tabelnya belum
segar. Dugaan ini belum dibuktikan.

### 15.3 Cacat pada pembangun dataset

**`beban:data -- --pengaduan=` tak dapat lagi membangun pengaduan.**
`bangunPengaduan` di `apps/api/scripts/beban/siapkan-data.ts` masih menyisipkan
status `diterima` dan `diproses` lewat `::complaint_status`, serta kategori
`aduan`/`lapor`/`lainnya`. Migrasi `20261104150000_alur_status_pengaduan` membuang
kedua status itu dari enum (`DROP TYPE "complaint_status"`), dan ketiga kategori
itu sudah tak berlaku sejak `20261104090000_tingkat_pengaduan`. Pernyataan
`INSERT`-nya juga tak mengisi `tingkat`, `tanggal_kejadian`, maupun
`lokasi_kejadian`.

Ini **dibaca dari kode dan migrasinya, tidak dijalankan.** Akibatnya pasti untuk
status: nilai yang tak ada di enum ditolak Postgres saat di-cast, jadi seluruh
`INSERT` gagal. Kategori lama tidak akan menggagalkannya: `kategori` hanya
`VARCHAR(50)` tanpa `CHECK` di migrasi mana pun, dan penolakannya hanya ada di
DTO yang tak dilewati skrip ini. Bila status diperbaiki sendirian, skrip akan
diam-diam menulis kategori yang tak sepadan dengan `tingkat` bakunya
(`kabupaten`).

Akibatnya dataset B, C, dan D di §12.6 tak dapat dibangun ulang sampai fungsi
itu diperbarui. D masih dapat diukur di 15.1 hanya karena barisnya sudah ada
dan ikut dimigrasikan. Perbaikannya perubahan pada skrip pengukur di `main`,
bukan pada kode aplikasi.

### 15.4 Keadaan sesudahnya

- `skm_beban` kini memuat **T1**. D sudah tak ada dan baru dapat dibangun lagi
  sesudah 15.3 diperbaiki.
- Tak ada temuan BUG baru. Angka BUG_REPORTS tetap.
- Catatan §14.2 lainnya tetap berlaku apa adanya.
