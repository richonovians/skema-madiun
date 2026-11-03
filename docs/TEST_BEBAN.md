# Pengujian Beban Backend SKEMA

**Tanggal pengukuran:** 13 Oktober 2026
**Direvisi:** 13 Oktober 2026, sore — hari yang sama. Lihat kotak di bawah.
**Diukur ulang:** 3 November 2026 pada `main` `9e72abb` (QA-PERF) — §12. Jalan dingin `/statistics` mundur 2-3,5 kali sejak `f1c132e` ([BUG-067](BUG_REPORTS.md#bug-067)); pada T1 dan T2 syarat "< 3 detik" terpenuhi (§12.4, §12.5).
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

### 12.6 Yang belum diukur

- `dashboard-opd` pada T3 (12.000 respons per OPD).
- Jawaban teks dan pengaduan di dataset beban (lihat 12.5).
- Ketersediaan dan seluruh jalur tulis (§11, tetap ditunda).
