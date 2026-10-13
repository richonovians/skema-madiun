# Pengujian Beban Backend SKEMA

**Tanggal pengukuran:** 13 Oktober 2026
**Cabang:** catatan ini hanya ada di `tester`. Kode pelarinya ada di `main`
(`apps/api/scripts/beban/`, commit `e4f24de`).

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

| Sumber daya | Milik aplikasi dev | Milik pelari beban |
| ----------- | ------------------ | ------------------ |
| Basis data  | `skm_db`           | `skm_beban`        |
| Redis       | basis data logis 0 | basis data logis 1 |
| Porta       | 3001               | 3002               |
| Keluaran tsc | `dist/`           | `dist-beban/`      |

Pemisahan Redis diperlukan dan itu terukur: kunci singgahan tidak membawa
pembeda basis data (`singgahan:ikm-hasil:<surveyId>`), sehingga jalan beban
pertama mencemari angka IKM yang disinggahkan aplikasi dev. Ia pulih sendiri
dalam 60 detik, tetapi penyebabnya tetap harus dipalang.

Yang diukur adalah jalur kode **produksi**, yaitu `main.ts` yang sama dengan
yang digelar, dikompilasi tsc. Bukan aplikasi yang dibangun lewat harness
ts-jest. Mengukur jalur yang tidak digelar menghasilkan angka yang tak dapat
dipakai siapa pun.

Beban per skenario: 10 koneksi, 10 detik (autocannon), plus satu permintaan
tunggal lebih dahulu untuk mencatat waktu **dingin** dan memastikan jawabannya
2xx. Jumlah baris dihitung sebelum dan sesudah setiap jalan, dan selisihnya
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

| Skenario                               | 133.920 jawaban  | 1.339.200 jawaban | 6.696.000 jawaban |
| -------------------------------------- | ---------------- | ----------------- | ----------------- |
| `GET /api/v1/statistics` (publik)      | 12 ms, 781 req/s | 11 ms, 829 req/s  | **HTTP 500**      |
| `GET /api/v1/dashboard/ikm`            | 1.159 ms, 8 req/s | 1.100 ms, 8 req/s | **HTTP 500**      |
| `GET /api/v1/surveys/:id/results`      | 32 ms, 296 req/s | 33 ms, 278 req/s  | 32 ms, 290 req/s  |
| `GET /api/v1/complaints`               | 37 ms, 249 req/s | 32 ms, 299 req/s  | 32 ms, 293 req/s  |
| `GET /api/v1/surveys/:id/fill`         | 44 ms, 212 req/s | 44 ms, 216 req/s  | 48 ms, 201 req/s  |

Angka pada kolom adalah p50 dan permintaan per detik. Rincian p95/p99 dan waktu
dingin ada di bagian 5.

Pemisahannya bersih: **dua endpoint yang mengipas satu panggilan per survei
patah; tiga yang tidak, sama sekali tak bergerak pada data lima puluh kali lebih
banyak.** Ketiganya tetap seluruhnya 2xx di 6,7 juta jawaban.

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

| Skenario         | Dingin | p50    | p95   | p99   | Maks   | req/s |
| ---------------- | ------ | ------ | ----- | ----- | ------ | ----- |
| statistik        | —      | —      | —     | —     | —      | **0, HTTP 500** |
| dashboard-ikm    | —      | —      | —     | —     | —      | **0, HTTP 500** |
| hasil-ikm        | 142 ms | 32 ms  | 52 ms | 63 ms | 135 ms | 290   |
| daftar-pengaduan | 26 ms  | 32 ms  | 53 ms | 63 ms | 152 ms | 293   |
| isi-survei-baca  | 32 ms  | 48 ms  | 72 ms | 79 ms | 134 ms | 201   |

Waktu pembangunan dataset: 997 detik.

## 6. Titik patahnya

Pada 6,7 juta jawaban, `GET /api/v1/statistics` dan `GET /api/v1/dashboard/ikm`
menjawab **HTTP 500** pada permintaan **tunggal**, tanpa beban sama sekali:

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

## 7. Temuan kedua: jalan dingin `/statistics`

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

## 9. Saran, berurutan

1. **Batasi kipasnya.** Ganti `findMany` tanpa `take` + `Promise.all` di kedua
   berkas dengan satu agregat di Postgres, atau paginasi survei aktif, atau
   batasi konkurensinya di bawah batas kolam koneksi. Satu perubahan menutup
   kedua endpoint yang patah.
2. **Naikkan `connection_limit` hanya sebagai penahan sementara.** Ia menggeser
   titik patahnya, tidak menghapusnya, dan menukar 500 dengan permintaan yang
   makin lambat.
3. **Tambahkan penahan *stampede*** pada `/statistics`: satu kunci agar hanya
   satu permintaan menghitung ulang, sisanya menunggu atau menerima nilai lama.
4. **Ukur jalur tulis** sebelum penggelaran. Separuh sistem belum punya angka.

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
