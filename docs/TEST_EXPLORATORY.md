# Panduan Pengujian Eksploratori (Exploratory Testing Charters)

## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

|                        |                                                         |
| ---------------------- | ------------------------------------------------------- |
| **Dokumen Pendamping** | TEST_PLAN.md · TEST_CASES.md                            |
| **Versi**              | 2.4                                                     |
| **Tanggal**            | 15 September 2026 (v2.4 — **charter C-15 dijalankan**: berpindah peran dalam satu sesi, nihil cacat, 2 catatan (CAT-016, CAT-017); v2.3 — **charter C-14 dijalankan**: Sampah survei & hapus permanen; 3 temuan (BUG-013 High, BUG-014 & BUG-015 Medium) dari 12 hal yang ditelusuri; v2.2 — `pnpm db:seed` rusak terhadap skema peran jamak ([CAT-014](BUG_REPORTS.md#cat-014)); alamat container Docker tak lagi dipakai sebagai tanda pengenal basis data; sisa rujukan sub-kategori di C-07 dikoreksi; v2.1 — skrip pembersih dipindah ke `apps/web/e2e/support/bersihkan-data-uji.mjs` agar bertahan dan dapat dipakai tim; v2.0 — putaran pembersihan ketiga: 7.986 notifikasi yatim yang menunjuk tiket lenyap; aturan menyaring notifikasi lewat `link` sebelum induknya dihapus; v1.9 — penghapusan paksa tiga survei uji tersisa; basis data dev nol baris bertanda `[UJI `; §3.1 baru: data uji tak boleh menyentuh basis data produksi, beserta palang keselamatannya; v1.8 — pembersihan data uji dari basis data dev dicatat beserta tiga jebakannya; v1.7 — formulir C-13 dijalankan, charter tuntas; v1.6 — C-05, C-06, C-07 & C-08 dijalankan; seluruh charter yang tak terhalang pihak lain kini selesai; v1.5 — C-12 dijalankan; v1.4 — C-13 dijalankan sebagian; v1.3 — C-04 & C-11 dijalankan, charter C-12 & C-13 baru; v1.2 — status sesi & C-09 terkunci; v1.1 — penyesuaian; v1.0 — 11 Agu 2026) |
| **Lingkup**            | Frontend (`apps/web`) — dijalankan manual lewat browser |

---

## 1. Kenapa dokumen ini ada

`TEST_CASES.md` berisi skenario yang **sudah diketahui** harus diperiksa. Pengujian
eksploratori mencari hal yang **belum terpikirkan** — dan pada fase integrasi seperti
sekarang, di situlah sebagian besar cacat berada.

Sasaran di bawah bukan tebakan. Semuanya diturunkan dari tiga sumber:

1. **Catatan `GAP` yang ditulis tim dev sendiri** di dalam kode — 17 titik di mana
   kemampuan backend dan harapan UI berbeda.
2. **Data perubahan kode 60 hari terakhir** — makin sering sebuah area diubah, makin
   besar peluang ada yang terlewat: `complaints` 95 commit, `surveys` 91, `users` 49.
3. **Fitur yang belum punya cakupan uji otomatis sama sekali.**

## 2. Cara menjalankan satu sesi

Satu sesi = **satu charter, 60–90 menit, tanpa jeda**. Jangan menguji sambil
mengerjakan hal lain — daya temu turun drastis.

| Langkah | Isi                                                                             |
| ------- | ------------------------------------------------------------------------------- |
| 1       | Siapkan lingkungan (§3), catat waktu mulai                                      |
| 2       | Baca misi charter, jalankan **hanya** area itu                                  |
| 3       | Catat **semua** keanehan seketika, jangan ditunda — termasuk yang terasa sepele |
| 4       | Kalau menemukan jalur menarik di luar misi, catat sebagai charter baru          |
| 5       | Tutup sesi: isi ringkasan hasil, jumlah temuan, dan area yang belum sempat      |

Aturan penting: **jangan berhenti untuk memperbaiki apa pun.** Tugas sesi ini
menemukan, bukan membetulkan.

## 3. Persiapan lingkungan

> **DIPERBARUI 2 September 2026.** Sejak reverse proxy satu origin dipasang
> (`83d4230`), aplikasi **tidak lagi** diakses lewat `localhost:3000`. Membuka
> alamat itu langsung akan menghasilkan 404 pada semua rute. Gunakan
> **`http://skema.local`** (port 80).

```bash
# 1. Basis data — compose hanya memuat service `db` (PostgreSQL);
#    backend & frontend dijalankan langsung di mesin, bukan di container.
docker compose up -d db

# 2. Backend (terminal sendiri)
cd apps/api
pnpm prisma:migrate    # menyiapkan skema
pnpm db:seed           # ⚠️ RUSAK per 15 Sep 2026 — lihat peringatan di bawah
pnpm dev               # nest start --watch

# 3. Frontend (terminal sendiri)
cd apps/web
pnpm dev
```

Pastikan semuanya benar-benar hidup sebelum sesi dimulai:

```bash
curl -s -o /dev/null -w "WEB  %{http_code}\n" http://skema.local              # 200 = hidup
curl -s -o /dev/null -w "API  %{http_code}\n" http://skema.local/api/v1/opd   # 401 = hidup
```

`401` pada API justru pertanda benar — endpoint itu memang menuntut autentikasi.

⚠️ **Jangan jalankan `pnpm build` selagi `pnpm dev` hidup.** Keduanya menulis ke
`.next` yang sama, dan build akan menimpa berkas milik dev sehingga seluruh rute
mendadak 404. Hentikan dev dulu bila perlu build.

Akun uji: lihat **TEST_PLAN.md §3.3**. Login lewat tombol "Masuk via SSO Helpdesk"
di beranda, isi **email saja** — tidak ada kata sandi.

> ⛔ **`pnpm db:seed` TIDAK DAPAT DIJALANKAN per 15 September 2026.** `seed.ts`
> masih menulis `role: Role.x` (tunggal) sedangkan skema sudah memakai
> `roles Role[]` sejak peran jamak 5 September — kolom `role` **sudah dibuang**.
> Lima galat tipe, dan `prisma/` berada di luar `include` tsconfig sehingga
> `tsc` proyek tetap hijau. Akibatnya **titik awal yang dapat direproduksi tidak
> tersedia**: basis data dev yang ada sekarang tak bisa disetel ulang, dan
> lingkungan baru tak bisa disiapkan sama sekali. Lihat
> [CAT-014](BUG_REPORTS.md#cat-014) — pekerjaan tim backend, bukan penguji.

> ⚠️ Basis data dev bisa menyimpang dari `seed.ts` (per 10 Agustus 2026 sudah berbeda:
> akun `warga@gmail.com`, 54 OPD hasil sinkronisasi Helpdesk). Sebelum sesi, jalankan
> ulang seed bila ingin titik awal yang dapat direproduksi, dan **catat di laporan**
> versi data mana yang dipakai.

### 3.1 Data uji tidak boleh menyentuh basis data produksi

Aturan pokok pengujian ini, dan yang paling mahal bila dilanggar: **pengujian
menulis baris sungguhan**, jadi ia hanya boleh diarahkan ke basis data
pengembangan lokal.

**Sasaran yang sah, diperiksa 4 September 2026:**

```
DATABASE_URL  postgresql://skm:***@localhost:5432/skm_db   (apps/api/.env)
server        skm_db @ 172.18.0.x — PostgreSQL 18.4, container Docker lokal
```

Alamat itu jaringan bridge Docker di mesin penguji — bukan alamat yang dapat
dicapai dari luar. Baris `DATABASE_URL` pada `.env` akar yang menunjuk
`db:5432` **dinonaktifkan** (berawalan `#`) dan tak dipakai.

> ⚠️ **Jangan menjadikan angka terakhirnya sebagai tanda pengenal.** Pada
> 15 September 2026 container yang sama menjawab dari `172.18.0.2` pagi hari lalu
> `172.18.0.3` beberapa jam kemudian — berubah **dua kali dalam satu hari
> pengujian**. Docker membagikan ulang alamat bridge setiap kali container
> disusun ulang. Yang menentukan **bukan** angka
> persisnya, melainkan bahwa alamatnya berada di rentang privat/loopback **dan**
> nama basisnya `skm_db`. Palang di skrip pembersih memang memeriksa kedua hal
> itu, bukan mencocokkan alamat harfiah.

**Yang harus diperiksa sebelum menjalankan apa pun yang menulis:**

1. `DATABASE_URL` menunjuk `localhost`/`127.0.0.1`/`db` **dan** nama basisnya
   `skm_db`. Nama basis saja tak cukup: `localhost` bisa saja diterowongkan.
2. Server yang **benar-benar menjawab** beralamat loopback atau privat —
   diperiksa lewat `SELECT current_database(), inet_server_addr()`, bukan lewat
   URL-nya saja.
3. `E2E_BASE_URL` (bila disetel) menunjuk `skema.local`, bukan domain publik.

Skrip pembersih data uji memikul palang keselamatan yang menegakkan syarat 1 & 2
dan **menolak jalan** bila salah satunya tak terpenuhi — diuji dua arah: URL
berhost publik ditolak, dan `localhost` dengan nama basis lain juga ditolak.

**Letaknya: `apps/web/e2e/support/bersihkan-data-uji.mjs`** (versi 15 September
2026; sebelumnya hidup di direktori sementara dan dua kali hilang bersamanya).

```bash
node apps/web/e2e/support/bersihkan-data-uji.mjs --dry   # lihat dulu apa yang kena
node apps/web/e2e/support/bersihkan-data-uji.mjs         # hapus
```

Ia hanya menyentuh baris berpenanda `[UJI `, membaca `DATABASE_URL` dari
`apps/api/.env` bila belum disetel, dan **tidak pernah menyentuh `audit_logs`** —
jejak itu wajib menurut rancangan. Jalankan sesudah suite E2E: fixture survei
pun ikut terhapus, sebab `globalSetup` membuatnya kembali pada jalan berikutnya.

> **Catatan tentang layanan luar.** `HELPDESK_OPD_API_URL` menunjuk
> `https://api.madiunkab.go.id/api/tenants`, sebuah **layanan pemerintah
> sungguhan**. Tombol "Sinkronkan dari Helpdesk" pada halaman OPD memanggilnya.
> Sejauh yang diamati pada sesi C-06 ia hanya **membaca** daftar tenant — tak ada
> tulisan ke sistem mereka — tetapi tetap: itu trafik ke sistem produksi pihak
> lain, jadi jangan dipanggil berulang-ulang tanpa keperluan.

---

## 4. Charter

Urutan sudah disusun dari yang paling berpeluang menemukan cacat serius.

### C-01 — Survei kustom bertipe teks & pilihan ganda `P0` — ✅ dijalankan 11 Agu & 2 Sep 2026

**Misi:** cari tahu apa yang dialami warga ketika mengisi survei yang memuat pertanyaan
selain skala 1–4.

> **DITULIS ULANG 2 September 2026 — premis lamanya sudah terbalik.** Charter ini
> semula berangkat dari kecurigaan bahwa `QuestionCard.jsx` hanya merender skala
> 1–4. Sejak `95cb251` dan `4a3df9c`, ketiga tipe pertanyaan **benar-benar bisa
> dipakai**, opsi jawabannya dapat diubah setelah dibuat, dan label skala 1–4 pun
> dapat disesuaikan. Sesi C-01 pertama (11 Agu) sudah dijalankan atas premis lama
> dan menghasilkan BUG-004, yang kini ditutup. Yang tersisa diperiksa adalah
> **perilaku ketiga tipe itu setelah benar-benar jadi.**

**Dasar kecurigaan:** area ini baru saja dikerjakan besar-besaran, dan tiga hal
sudah terbukti rapuh: penerjemahan jawaban antar-tipe (skala mengirim **skor**,
pilihan ganda mengirim **id opsi** — dulu tertukar dan ditolak backend), label
skala tersuai yang disimpan sebagai `question_options`, dan
[BUG-005](BUG_REPORTS.md#bug-005) yang membuat salinan survei kehilangan opsinya.

**Arah penelusuran:**

- Sebagai Admin OPD, buat survei draft berisi **ketiga tipe sekaligus**: skala 1–4
  (dengan label diubah dari baku), Isian Teks Terbuka, dan Pilihan Ganda 3 opsi.
  Terbitkan.
- Sebagai warga, isi survei itu sampai selesai. Apakah setiap tipe merender bentuk
  jawaban yang benar? Apakah label skala yang disesuaikan benar-benar muncul?
- Periksa tab Network saat submit: pertanyaan skala harus mengirim `nilai` 1–4,
  pilihan ganda mengirim `selectedOptionId`, teks mengirim `teks`. Tertukar
  sedikit saja akan ditolak backend.
- Kosongi pertanyaan Isian Teks — ia **tidak wajib**, jadi submit harus tetap bisa.
  Bandingkan dengan pertanyaan skala yang wajib.
- Ubah opsi jawaban pilihan ganda **setelah** ada yang menjawab. Apa yang terjadi
  pada jawaban yang sudah masuk?
- **Reproduksi BUG-005:** duplikat survei itu, buka salinannya sebagai warga.
  Pertanyaan pilihan ganda seharusnya memunculkan kotak peringatan, dan label
  skala tersuai kembali ke label baku tanpa pemberitahuan.

---

### C-02 — Alur pengaduan lintas peran `P0` — ✅ dijalankan 2 Sep 2026

**Misi:** telusuri satu pengaduan dari pengajuan warga sampai selesai ditangani, dan
pastikan setiap peran melihat keadaan yang konsisten.

**Dasar kecurigaan:** area `complaints` berubah 95 kali dalam 60 hari — paling panas di
seluruh proyek. Notifikasi lintas peran baru ditambahkan (D9) dan belum pernah diuji
manual.

**Arah penelusuran:**

- Warga mengajukan pengaduan → catat nomor tiket yang muncul.
- Admin OPD membuka pengaduan itu → apakah muncul di daftarnya? Ubah status bertahap
  `diterima → diproses → selesai`.
- Setiap kali status berubah, periksa **lonceng notifikasi warga**: apakah lencana
  muncul? Apakah pesan sesuai? Apakah tautannya membuka pengaduan yang benar?
- Admin Kabupaten membuka pengaduan yang sama. **Koreksi 12 Agu 2026:** versi
  pertama charter ini bertanya "apakah benar hanya bisa memantau?" — asumsi itu
  **salah** dan akan menghasilkan laporan palsu. `RolesGuard` memberi peran
  `kabupaten` pelewatan penuh atas seluruh `@Roles` (sejak penggabungan peran
  superuser, 5 Agu 2026), jadi Admin Kabupaten memang **boleh** mengubah status
  dan membalas. Yang diuji karena itu bukan "boleh atau tidak", melainkan:
  apakah aksinya benar-benar berhasil sampai ke backend, dan apakah pengaduan
  milik OPD mana pun bisa dibuka olehnya.
- Coba transisi mundur (`selesai → diproses`). Perlu diketahui lebih dulu:
  dropdown hanya menawarkan target yang sah, dan status `selesai`/`ditolak`
  bersifat terminal sehingga daftarnya kosong. Jadi yang diperiksa bukan apakah
  ditolak, melainkan apakah UI **menerangkan** kenapa tidak ada pilihan, atau
  hanya diam.
- Balas percakapan dari kedua sisi. **Pembaruan 2 Sep 2026:** label pengirim yang
  dulu selalu tertulis generik "Admin OPD" sudah diperbaiki (`3a1905c feat(web):
  seret-lepas urutan pertanyaan + label pengirim chat tidak lagi keliru`). Yang
  diperiksa kini bukan lagi apakah labelnya keliru, melainkan apakah label barunya
  **benar untuk keempat peran** — termasuk Superuser, yang belum ada saat
  perbaikan itu ditulis.

---

### C-03 — Lampiran pengaduan `P0` — ✅ dijalankan 2 Sep 2026

**Misi:** uji batas dan perilaku unggah berkas.

**Arah penelusuran:**

- Unggah beberapa berkas sekaligus; unggah berkas sangat besar; unggah tipe tak lazim
  (`.exe`, `.svg`, berkas tanpa ekstensi).
- Apa yang terjadi bila jaringan terputus di tengah unggahan?
- Buka pratinjau gambar — apakah bisa ditutup? Apakah gambar rusak ditangani dengan baik?
- Apakah lampiran pengaduan orang lain bisa diakses langsung lewat URL berkasnya?
  **(Periksa dengan sungguh-sungguh — ini menyangkut kerahasiaan pengaduan, FR-CMP-08.)**

---

### C-04 — Proteksi route & peralihan peran `P0` — ✅ dijalankan 2 September 2026

**Misi:** buktikan matriks proteksi route (TEST_CASES **A.5.1**) berlaku di aplikasi
sungguhan, bukan hanya di test.

**Hasil: 0 cacat.** Rincian lengkap di
[BUG_REPORTS.md — Sesi C-04](BUG_REPORTS.md#sesi-c-04--proteksi-route--peralihan-peran).

| Yang ditelusuri                                  | Hasil                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Matriks A.5.1 (8 rute × 4 kondisi peran)          | Seluruhnya sesuai. **Kini terkunci otomatis** di `apps/web/e2e/proteksi-route.spec.js` |
| Cookie `role` disunting warga → `kabupaten`       | Halaman admin **terbuka**, tetapi endpoint istimewa menolak **403**. Tak ada data istimewa yang bocor → **CAT-007** (konsekuensi rancangan) |
| Logout lalu tombol Back                           | **Tidak ada cacat.** Hanya kerangka halaman yang tersisa; nama & surel tak lagi tampil, `GET /auth/me` membalas **401** |
| Dua tab dengan peran berbeda                      | **Berperilaku benar.** Tab lama dipantulkan ke area peran yang baru dengan identitas yang tepat |

> **Dugaan yang dicabut.** Pemeriksaan pertama menyimpulkan halaman terlindungi
> "masih tampil" sesudah logout — padahal yang cocok hanyalah judul halamannya,
> bukan datanya. Penelusuran lanjutan membatalkan dugaan itu. Cocokkan isi, bukan
> judul, sebelum menyatakan sebuah halaman masih terbuka.

> Konteks: `TC-AUTH-031` mencatat logout bersifat _stateless_ — token lama tetap sah di
> backend. Sesi ini memeriksa dampak nyatanya bagi pengguna, dan jawabannya: tak ada
> dampak yang terlihat, karena artefak sesi di sisi klien benar-benar dibersihkan.

---

### C-05 — Form buat & ubah akun admin `P1` — ✅ dijalankan 3 September 2026

**Misi:** cari data yang diminta ke pengguna tetapi tidak pernah disimpan.

**Dasar kecurigaan:** `user.adapter.js` mencatat form mengumpulkan `phone` dan
`isActive`, padahal `CreateUserDto` tidak punya keduanya — sengaja tidak dikirim.

**Arah penelusuran:**

- Buat akun Admin OPD sambil mengisi nomor telepon. Simpan, buka lagi akunnya —
  masih ada? Apakah pengguna diberi tahu bahwa data itu tidak tersimpan?
- Matikan sakelar "Aktif" saat membuat akun. Apakah akun tetap dibuat dalam keadaan
  aktif? Apakah itu bertentangan dengan yang ditampilkan?
- Buat akun `opd` tanpa memilih OPD. Apakah pesan errornya jelas?
- Coba surel yang sudah terdaftar.

**Hasil 3 September 2026 — 1 temuan ([BUG-009](BUG_REPORTS.md#bug-009), Medium).**

> ⚠️ **Dasar kecurigaan di atas sudah usang.** Keduanya sudah diperbaiki tim:
> `phone` dihapus dari formulir (skema `User` memang tak punya kolomnya), dan
> `isActive` kini benar-benar bekerja lewat panggilan status susulan. Dua butir
> penelusuran pertama karena itu tak lagi berlaku.

| Yang diuji                              | Hasil                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Admin OPD tanpa memilih OPD             | ✅ ditahan, pesan "Silakan pilih instansi / OPD."                              |
| Surel yang sudah terdaftar              | ✅ ditolak, pesan backend ditampilkan (tak ditelan) — lihat [CAT-012](BUG_REPORTS.md#cat-012) |
| Sakelar "Aktif" dimatikan               | ✅ tersimpan `isActive=false`                                                  |
| **Panggilan kedua gagal sendirian**     | ❌ [BUG-009](BUG_REPORTS.md#bug-009) — akun terlanjur dibuat **dan aktif**, tanpa pemberitahuan |

Risiko terakhir itu **lahir justru dari perbaikan `isActive`**: pembuatan akun
nonaktif kini dua panggilan berurutan, dan yang kedua bisa gagal sendirian.
Charter aslinya tak mungkin memuatnya — inilah gunanya menjalankan sesi
eksploratori ulang setelah kode berubah, bukan sekadar mencentang daftar lama.

---

### C-06 — Sinkronisasi & daftar OPD `P1` — ✅ dijalankan 3 September 2026

**Misi:** uji perilaku daftar OPD pada volume data sungguhan (54 entri, bukan 3 dari seed).

**Arah penelusuran:**

- Tekan tombol Sinkronisasi. Berapa lama? Apakah ada indikator proses? Apa yang terjadi
  bila ditekan dua kali beruntun?
- Uji pencarian dengan kata yang tidak ada, dengan huruf besar-kecil campur, dan dengan
  spasi di awal/akhir.
- Cari sesuatu di halaman 3 — apakah halaman kembali ke 1? Kalau tidak, apakah tabelnya
  kosong padahal hasil ada?
- Bandingkan jumlah pada indikator paginasi dengan jumlah baris yang benar-benar tampil.

**Hasil 3 September 2026 — 3 temuan + 1 catatan.** Lihat TC-FE-049 🟡.

> **Tombol sinkronisasi sungguhan TIDAK ditekan.** `POST /opd/sync` dapat
> menonaktifkan OPD yang tak lagi ada di Helpdesk — perubahan tak terbalikkan
> pada basis data pengembangan bersama. Bagian frontend-nya (tampilan laporan &
> kegagalan) diuji dengan memalsukan jawaban lewat pencegatan rute.

| Yang diuji                            | Hasil                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| 62 OPD terjangkau paginasi            | ✅ 62/62 unik dalam 7 halaman, indikator cocok dengan backend             |
| Pencarian huruf besar-kecil           | ✅ nama maupun kode tak peka kapitalisasi                                 |
| Pencarian dengan spasi berlebih       | ❌ [BUG-011](BUG_REPORTS.md#bug-011) — "&nbsp;&nbsp;DINAS" → 0 dari 18    |
| Menyaring dari halaman 3              | ✅ kembali ke baris 1                                                     |
| Penyaring "Jenis Layanan"             | ⚠️ [CAT-011](BUG_REPORTS.md#cat-011) — seluruh 62 OPD `jenisLayanan: null` |
| Laporan sinkron berhasil              | ❌ [BUG-012](BUG_REPORTS.md#bug-012) — angka `skipped` tak ditampilkan     |
| Sinkron gagal 503                     | ✅ diberitahukan, tabel lama utuh, tombol bisa ditekan lagi               |
| Nama tombol paginasi                  | ❌ [BUG-010](BUG_REPORTS.md#bug-010) — dua tombol tanpa nama sama sekali   |

**Batas yang belum tersentuh:** halaman ini mengambil `limit: 100` sekali lalu
menyaring & memaginasi di peramban. Dengan 62 OPD hari ini aman; melewati 100,
kelebihannya hilang dari tabel **dan** dari pencarian, tanpa peringatan apa pun.

---

### C-07 — Profil responden & pemakaian ulang data `P1` — ✅ dijalankan 3 September 2026

**Misi:** periksa FR-AUTH-05 — data profil dipakai ulang otomatis saat mengisi survei.

**Dasar kecurigaan:** `me.adapter.js` mencatat "dummy mengharapkan banyak field identitas
yang TIDAK ADA" di backend.

**Arah penelusuran:**

- Isi profil demografis lengkap, lalu isi survei. Apakah identitas terisi sendiri?
- Ubah profil sebagian saja (mis. hanya pekerjaan). Apakah field lain tetap utuh?
- Kosongkan salah satu field wajib. Apa pesan errornya, dan apakah bisa dipahami awam?
- Apakah ada field di halaman profil yang tampil kosong terus-menerus?

**Hasil 3 September 2026 — 1 catatan ([CAT-010](BUG_REPORTS.md#cat-010)).**

FR-AUTH-05 punya dua sisi, dan keduanya berakhir berbeda.

**Sisi "tidak isi ulang" — terpenuhi.** Formulir survei tak meminta satu pun
label identitas; formulir pengaduan hanya meminta OPD, kategori, judul, uraian
(sub-kategori masih ada saat sesi ini dijalankan; taksonomi itu **dihapus dari
produk 4 September 2026**). Respons survei yang tersimpan bahkan tak memuat `userId` — SKM
memang anonim.

**Sisi "data profil" — tak ada apa pun untuk dipakai ulang.** Halaman profil
sepenuhnya baca-saja (nol kolom isian, nol tombol ubah), sementara
`updateMyProfile()` sudah tersedia di lapisan service dan **tak dipanggil satu
komponen pun**. Demografi karena itu hanya ada pada akun hasil seed.

Tiga kolom biodata (NIK, telepon, alamat) bernilai `-` bagi setiap warga —
**bukan temuan**: kartunya menyatakannya terus terang dan `me.adapter.js`
menandainya gap yang disengaja, bukan nilai yang dikarang.

---

### C-08 — Ketahanan saat backend bermasalah `P1` — ✅ dijalankan 3 September 2026, **nihil cacat**

**Misi:** pastikan aplikasi gagal dengan anggun, bukan layar putih.

**Arah penelusuran:**

- Matikan backend, lalu buka bergantian: dashboard, statistik, daftar survei, pengaduan,
  audit log. Mana yang menampilkan pesan error yang jelas, mana yang kosong tanpa
  penjelasan?
- Nyalakan lagi backend, tekan tombol "Coba Lagi". Apakah benar pulih?
- Matikan backend **di tengah** pengisian survei, lalu tekan Submit. Apakah jawaban yang
  sudah diisi hilang?
- Perlambat jaringan lewat DevTools (throttling). Apakah tombol bisa ditekan dua kali
  sebelum indikator proses muncul?

**Hasil 3 September 2026 — tidak ada cacat.** Lihat TC-FE-048 ✅.

> **Backend sungguhan TIDAK dimatikan.** Ia milik lingkungan pengembangan
> bersama. Kegagalannya dihasilkan dengan mencegat permintaan di peramban — cara
> yang lebih tajam, karena bisa menjatuhkan **satu** endpoint saja atau menunda
> jawaban tanpa menggagalkannya. `/auth/me` sengaja dibiarkan lewat; kalau ikut
> dijatuhkan, yang teruji berubah menjadi alur logout.

| Yang diuji                                        | Hasil                                                     |
| ------------------------------------------------- | --------------------------------------------------------- |
| Enam halaman admin, seluruh data 503              | ✅ semuanya: pesan galat **dan** tombol "Coba Lagi"        |
| "Coba Lagi" sesudah backend pulih                 | ✅ benar-benar memulihkan halaman                          |
| Pengiriman survei ditolak 503                     | ✅ pesan tampil, **seluruh jawaban bertahan**, bisa diulang |
| Empat klik kirim, jaringan ditahan 5 detik        | ✅ tepat **1** `POST /responses` (respons 34 → 35)         |

**Tiga hasil probe dibatalkan sesudah diperiksa ulang** — dan itu bagian
terpenting dari sesi ini:

1. *"Log Aktivitas terkunci pada Memuat..."* — salah. Kompilasi dingin `next dev`
   memakan **182 detik** pada kunjungan pertama, sementara sapuannya hanya
   menunggu 4 detik. Sesudah rutenya panas, pesan galat muncul dalam 2,4 detik
   beserta tombol "Coba Lagi". Ini kali **ketiga** kompilasi dingin menghasilkan
   tuduhan palsu.
2. *"Pengiriman survei gagal tanpa pemberitahuan"* dan 3. *"jawaban hilang"* —
   keduanya salah. Skrip menekan keempat radio sekaligus di layar pertama,
   padahal pengisiannya wizard satu pertanyaan per layar dengan opsi
   `<input class="hidden peer">` di dalam `<label>`. **Nol POST terkirim**, tetapi
   laporannya menuduh kode yang tak pernah dijalankan.

Sejak itu setiap probe menghitung permintaan yang benar-benar terkirim, lalu
**menolak menyimpulkan apa pun bila angkanya nol.**

---

### C-09 — Masuk lewat SSO Helpdesk & persetujuan PDP `P0` — ⛔ TERKUNCI

> **TIDAK DAPAT DIJALANKAN SIAPA PUN per 2 September 2026.** `HELPDESK_SSO_CLIENT_ID`
> dan `HELPDESK_SSO_CLIENT_SECRET` masih dikomentari di `apps/api/.env` — menunggu
> kredensial dari tim Helpdesk/Diskominfo. `SsoService` menolak dengan
> `ServiceUnavailableException` ("SSO Helpdesk belum dikonfigurasi") bila salah satu
> kunci kosong, sehingga menekan tombol SSO hanya menghasilkan 503.
>
> Ini hambatan eksternal, bukan pekerjaan yang tertunda. Charter dibiarkan utuh
> supaya siap dijalankan begitu kredensialnya turun. Sementara itu jalankan
> **[C-10](#c-10--area-superuser-p0)** yang bisa diuji lewat `dev-login`.

**Misi:** telusuri alur masuk yang sesungguhnya — bukan `dev-login` yang selama ini
dipakai untuk menguji — dari klik pertama sampai berada di dalam aplikasi.

**Dasar kecurigaan:** SSO Helpdesk baru terpasang 27 Agustus (`d8d8ada`) dan
**belum pernah diuji manual sama sekali dari sisi frontend**. Ia mengubah hal yang
paling mendasar: sesi kini dipegang cookie HttpOnly, bukan token di `localStorage`.
Setiap halaman bergantung padanya. Ditambah satu langkah yang benar-benar baru,
persetujuan PDP, yang hanya muncul bagi responden.

**Arah penelusuran:**

- Masuk lewat tombol SSO sebagai responden **baru**. Muncul layar persetujuan PDP?
  Apa yang terjadi bila ditolak, atau bila halamannya ditutup di tengah jalan?
- Buka DevTools → Application → Storage. Pastikan **tidak ada token** di
  `localStorage`, dan cookie `session` bertanda HttpOnly.
- Tutup peramban, buka lagi. Apakah sesinya bertahan? Setelah `expiresAt` lewat,
  apa yang terjadi saat menekan tombol yang memanggil API?
- Tekan **Keluar**. Apakah benar-benar keluar, ataukah menekan Kembali masih
  menampilkan halaman admin dari cache?
- Ganti peran: masuk sebagai Admin OPD, keluar, masuk sebagai Superuser. Apakah
  ada sisa keadaan peran sebelumnya (menu, nama, area yang boleh dibuka)?
- Batalkan di tengah alur SSO (tekan Kembali di halaman Helpdesk). Ke mana
  aplikasi mendarat, dan apakah pesannya bisa dimengerti orang awam?

---

### C-10 — Area Superuser `P0` — ✅ dijalankan 2 Sep 2026

> **Charter baru, 2 September 2026.**

**Misi:** periksa apakah area khusus Superuser benar-benar terkurung, dan apakah
peran lain tidak bisa menembusnya.

**Dasar kecurigaan:** peran `superuser` sempat **dihapus** pada 5 Agustus lalu
**dikembalikan** pada 26 Agustus (`e1eb8b1`, `ea44ca1`, `5585d63`, `49ad3d8`).
Peran yang dicabut lalu dipasang kembali dalam tiga minggu adalah tempat yang
wajar bagi sisa-sisa asumsi lama — apalagi `RolesGuard` masih memberi
`kabupaten` pelewatan penuh atas seluruh `@Roles`.

**Arah penelusuran:**

- Masuk sebagai Superuser. Menu apa saja yang muncul yang tidak dimiliki peran
  lain? Manajemen user dan log aktivitas khusus benar-benar tampil?
- Buka dashboard OPD sebagai Superuser — ia harus **memilih OPD** dulu. Apa yang
  terjadi bila tidak memilih? Bisakah ia melihat data OPD mana pun?
- Masuk sebagai **Admin Kabupaten**, lalu ketik langsung URL area Superuser.
  Ditolak atau lolos? Catatan komit menyebut Admin Kabupaten "tetap ditolak" pada
  dashboard OPD — pastikan itu benar, sebab guard-nya justru mengizinkan
  `kabupaten` melewati semua `@Roles`.
- Ulangi dari peran Admin OPD dan Responden.
- Periksa log aktivitas: apakah aksi Superuser tercatat dengan pelaku yang benar?

### C-11 — Sapuan seluruh halaman `P1` — ✅ dijalankan 2 September 2026

**Misi:** buka **setiap** halaman aplikasi dengan peran yang berhak dan cari yang
patah — bukan menguji satu alur mendalam, melainkan memastikan tak ada layar
yang selama ini luput dari perhatian.

**Hasil: 35 halaman, 1 cacat nyata ([BUG-008](BUG_REPORTS.md#bug-008)), 6 alarm
palsu.** Rincian di
[BUG_REPORTS.md — Sesi C-11](BUG_REPORTS.md#sesi-c-11--sapuan-seluruh-halaman).

Yang direkam per halaman: galat konsol & `pageerror`, panggilan API yang gagal,
penanda galat yang terlihat pengguna, halaman yang nyaris kosong, dan pengalihan
tak terduga.

> **Bagian terpenting sesi ini bukan temuannya, melainkan enam alarm palsunya.**
> Tiga jenis penyebab yang wajib disingkirkan sebelum melaporkan apa pun:
> **(1)** 502 sesaat dari gateway — beberapa endpoint tak berhubungan gagal
> serentak; ulangi dulu. **(2)** Parameter URL yang salah bentuk — rute detail
> pengaduan admin menerima `ticketNo`, bukan `id` numerik yang dikembalikan
> daftarnya. **(3)** Kompilasi dingin `next dev` — kunjungan pertama ke rute berat
> bisa melebihi batas waktu, dan yang gagal **berpindah-pindah** tiap kali
> dijalankan.

---

### C-12 — Analisis & ekspor (`/admin-opd/analytics`) `P1` — ✅ dijalankan 2 September 2026

**Hasil: 0 cacat.** Rincian di
[BUG_REPORTS.md — Sesi C-12](BUG_REPORTS.md#sesi-c-12--analisis--ekspor).

| Yang ditelusuri                                     | Hasil                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| Konsistensi IKM antar tiga endpoint                   | **Cocok persis** untuk kedua survei ber-9-unsur                  |
| Survei tanpa unsur IKM                                | Dikecualikan dari papan peringkat; layar berbunyi "Belum dapat dinilai", bukan 0 |
| Sebaran kategori & jumlah pengaduan                   | Cocok dengan `GET /complaints` untuk OPD yang sama               |
| Ekspor CSV / Excel / PDF dari peramban                | Ketiganya benar-benar terunduh, dan **isinya memang format itu** |

**Misi:** halaman ini **tak pernah disebut** di dokumen pengujian mana pun sampai
2 September 2026 — kata "analytics" dan "analisis" nol kali di kedua dokumen.
Lima komponen (`AnalyticsTabs`, `SkmAnalysisView`, `ComplaintAnalysisView`,
`ExportButton`, `AnalyticsHeader`) belum pernah tersentuh pengujian.

**Arah penelusuran:**

- Buka kedua tab (analisis SKM dan analisis pengaduan). Apakah angkanya cocok
  dengan yang ditampilkan `/admin-opd/dashboard` untuk periode yang sama?
- Nilai IKM: apakah rumusnya konsisten dengan `/admin-kab/dashboard`? Perbedaan
  sekecil apa pun antara dua layar yang mengaku menghitung hal sama adalah temuan.
- Tekan **Ekspor**. Berkasnya benar-benar terunduh? Isinya cocok dengan yang di
  layar? Format apa, dan apakah dapat dibuka?
- OPD tanpa respons survei sama sekali — tampil keadaan kosong yang jujur, atau
  nilai 0 yang menyesatkan?
- Ganti periode. Apakah data ikut berubah, atau layar menampilkan data lama?

---

### C-13 — Gerbang persetujuan PDP (`/persetujuan`) `P1` — ✅ tuntas 3 September 2026, **nihil cacat**

**Hasil: 0 cacat pada yang dapat diuji; formulirnya sendiri TERKUNCI.** Rincian di
[BUG_REPORTS.md — Sesi C-13](BUG_REPORTS.md#sesi-c-13--gerbang-persetujuan-pdp).

| Yang ditelusuri                                   | Hasil                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| Cookie `consent` dihapus                            | Dipantulkan ke `/persetujuan` — proxy bekerja                 |
| Cookie **dan** cerminan localStorage dihapus        | Tetap dipantulkan                                             |
| Gerbang memeriksa ulang lewat `GET /auth/me`        | Memulihkan cookie lalu meneruskan — cookie basi tak mengurung |
| Peran non-warga membuka `/persetujuan`              | Keduanya dipantulkan ke berandanya                            |
| Sisa persetujuan sesudah logout                     | **Bersih** — tak terwaris ke warga berikutnya                 |
| Kotak centang, "Setuju & Lanjutkan", jalur menolak  | ⛔ **TERKUNCI** — lihat di bawah                               |

> ⛔ **Yang menguncinya.** Gerbang hanya muncul bagi `responden` ber-`consentAt`
> kosong. Satu-satunya akun responden di dev sudah menyetujui, dan akun baru tak
> dapat dibuat lewat jalur frontend mana pun: `CreateUserDto` hanya menerima
> peran admin, dan `dev-login` membalas 404 untuk identifier tak dikenal.
> **Yang dibutuhkan: satu akun responden seed tanpa persetujuan** — pekerjaan
> seed/backend, bukan penguji.

**Misi:** gerbang hukum yang dipasang 27 Agustus 2026 dan **belum punya satu
kasus uji pun**. `proxy.js` memantulkan setiap `responden` yang cookie
`consent`-nya bukan `'1'` ke halaman ini.

**Arah penelusuran:**

- Warga baru yang belum menyetujui: dipantulkan dari **semua** halaman warga?
- Hapus cookie `consent` lewat DevTools, lalu buka `/dashboard`. Dipantulkan?
- Sudah menyetujui, lalu buka `/persetujuan` langsung — dipantulkan balik ke
  beranda, atau membiarkan warga menyetujui dua kali?
- Tolak persetujuannya. Apa yang terjadi — dibiarkan menggantung, atau dikeluarkan
  dengan jelas?
- Setujui, lalu logout dan masuk sebagai warga LAIN. Apakah persetujuan warga
  pertama ikut terbawa? (`clearSession()` membuang cookie & cerminannya justru
  untuk mencegah ini — buktikan bahwa pencegahannya bekerja.)
- Peran non-warga membuka `/persetujuan` — dipantulkan?

---

---

---

**Bagian FORMULIR akhirnya dijalankan — 3 September 2026, 10 probe, nol temuan.**

Yang selama ini menahannya bukan kesulitan teknis melainkan ketiadaan fixture:
gerbang hanya muncul bagi responden ber-`consentAt` kosong, dan tak ada satu pun
di dev. User menyediakan `warga@gmail.com` (id 21, `consentRequired: true`,
`respondentProfile: null`), dan sesi ini memakainya.

> ⚠️ **Fixture sekali pakai.** `POST /auth/consent` hanya menulis; `ConsentService.record`
> mengembalikan nilai lama bila sudah terisi, dan tak ada endpoint reset di mana pun.
> Karena itu urutan probenya disusun sengaja: **sembilan pemeriksaan yang tak
> menghabiskan fixture dikerjakan lebih dulu**, penerimaan sungguhan paling akhir.
> Probe kegagalan pencatatan bahkan dijalankan dengan mencegat permintaannya di
> peramban, sehingga backend tak pernah tersentuh dan fixture tetap utuh.

| Probe | Yang diuji                                        | Hasil                                                                     |
| :---: | ------------------------------------------------- | ------------------------------------------------------------------------- |
|   1   | Masuk sebagai warga tanpa persetujuan             | ✅ dipantulkan ke `/persetujuan`                                          |
|   2   | Isi gerbang                                       | ✅ 4 rincian UU PDP, rujukan UU 27/2022, hak menarik — **0** tautan keluar |
|   3   | Kunci tombol mengikuti kotak centang              | ✅ terkunci → aktif → **terkunci lagi** saat centang dibatalkan            |
|   4   | Aksesibilitas kotak centang                       | ✅ label tertaut, `aria-describedby`, target sentuh 80px lewat label       |
|   5   | Backend menolak kiriman tanpa persetujuan         | ✅ **403** dengan pesan yang menyebut halaman Persetujuan                  |
|   6   | Cookie `consent` dipalsukan jadi `1`              | ✅ navigasi tembus (memang begitu), pengiriman **tetap 403**               |
|   7   | `POST /auth/consent` gagal 500                    | ✅ `role="alert"`, fokus pindah ke sana, tetap di gerbang, **tak tercatat** |
|   8   | Menyetujui sungguhan                              | ✅ ke `/dashboard`, `consentRequired` false, cookie `consent=1`            |
|   9   | Membuka `/persetujuan` sesudah menyetujui         | ✅ dipantulkan ke `/dashboard`                                            |
|  10   | Kiriman sesudah menyetujui                        | ✅ **201** — terbukti gerbang itulah yang menahannya tadi                  |

**Yang paling layak dicatat: probe 5 & 6 membuktikan klaim yang selama ini hanya
tertulis di komentar.** `ConsentGate.jsx` menyatakan halaman itu "pembatas
NAVIGASI, dan penegakan sesungguhnya ada di backend". Probe 6 menguji klaim itu
dengan cara yang paling tak bersahabat — memalsukan cookie `consent` — dan
hasilnya: halaman warga memang terbuka, tetapi `POST /surveys/:id/responses` tetap
403. Melewati gerbang hanya menghasilkan halaman yang gagal mengirim, persis
seperti yang dijanjikan.

**Sisa jejak — sudah dibersihkan 3 September 2026.** Respons uji dari probe 10
dihapus, dan `consentAt` milik `warga@gmail.com` disetel `null` kembali lewat
basis data. Persetujuan itu memang tak dapat dibatalkan **lewat aplikasi**
(`POST /auth/consent` hanya menulis), tetapi dapat lewat basis data — jadi
gerbang PDP tetap dapat diuji ulang tanpa seed responden baru.

### C-14 — Sampah survei & hapus permanen `P0` — ✅ dijalankan 15 September 2026

**Misi:** fitur Sampah (11 September 2026) memberi Admin Kabupaten kemampuan yang
sebelumnya tak dimiliki siapa pun di aplikasi ini: **memusnahkan survei beserta
jawaban responden secara permanen**. Sampai fitur ini ada, survei hanya dapat
dihapus selagi berstatus `draft`, dan tak ada endpoint yang dapat menghilangkan
jawaban yang sudah masuk. Charter ini berdiri di urutan pertama karena
kegagalannya berarti data hilang dan tak dapat dikembalikan.

**Hasil: 3 temuan — 1 High, 2 Medium.** Rincian di
[BUG_REPORTS.md — Sesi C-14](BUG_REPORTS.md#bug-013).

| Yang ditelusuri | Hasil |
| --------------- | ----- |
| Dialog buang-ke-Sampah menyebutkan akibatnya | ✅ menyebut penutupan survei aktif **dan** jumlah jawaban yang ikut terbawa |
| Pengaman ketik-ulang judul | ✅ terkunci saat kosong & saat teks salah; memangkas spasi; **peka kapitalisasi** |
| Escape menutup, ketikan tak terbawa ke baris lain | ✅ kolom kosong lagi dan tombol terkunci saat dialog dibuka untuk baris berikutnya |
| Dua survei **berjudul sama** di Sampah | ✅ yang termusnahkan tepat barisnya — kunci sasarannya `row.id`, bukan judul yang diketik |
| Pemusnahan menghapus seluruh turunannya | ✅ respons, jawaban, pertanyaan, opsi, dan snapshot IKM habis dalam satu transaksi |
| Pemulihan dari Sampah | ✅ kembali ke daftar, **status tidak diam-diam dibuka** — pesannya mengatakannya terus terang |
| Isolasi Sampah antar-OPD | ✅ Admin OPD hanya melihat survei OPD-nya; memulihkan milik OPD lain ditolak **403** |
| Pemusnahan oleh Admin OPD | ✅ **403** baik atas survei OPD lain maupun OPD-nya sendiri — tombolnya pun tak ditawarkan |
| Survei di Sampah bagi responden | ✅ `GET /surveys/:id/fill` menjawab **404** |
| **Survei di Sampah pada statistik publik** | ❌ [BUG-013](BUG_REPORTS.md#bug-013) — **tetap terhitung** |
| **Notifikasi sesudah hapus permanen** | ❌ [BUG-014](BUG_REPORTS.md#bug-014) — 5 tautan mati tertinggal |
| **Dialog konfirmasi bagi pembaca layar** | ❌ [BUG-015](BUG_REPORTS.md#bug-015) — fokus tertinggal di luar dialog |

**Yang paling layak diingat dari sesi ini: angka publik tidak ikut berubah saat
survei dibuang.** Membuang survei ke Sampah menghilangkan barisnya dari daftar
admin, tetapi IKM kabupaten, papan peringkat OPD, jumlah responden, dan tren
triwulan di beranda publik tetap memuatnya. Dugaan itu tak dilaporkan begitu
terlihat: sesudahnya survei yang sama **dimusnahkan permanen**, dan seluruh angka
kembali persis ke keadaan semula — barulah sebabnya pasti.

Pola uji kendali itu lahir dari kesalahan sesi-sesi sebelumnya (§Y.5): angka yang
berubah bersamaan dengan sebuah tindakan belum tentu disebabkan olehnya. Yang
membuktikan bukan pengamatan pertama, melainkan pengembalian keadaan.

> **Data uji sesi ini sudah dibersihkan.** Enam survei `[UJI C-14]`, seluruh
> responsnya, dan **10 notifikasi yatim** yang ditinggalkan dua kali pemusnahan
> dihapus sesudah sesi. Notifikasi yatim itu harus dicari lewat id survei yang
> sudah tak ada — persis aturan nomor 2 pada putaran ketiga di bawah, dan kali
> ini aturannya dipakai atas sisa yang dibuat sendiri.

> **Alamat container berubah lagi di tengah sesi** — `172.18.0.2` pada pagi hari
> dan `172.18.0.3` sesudahnya. Bukti langsung bahwa alamat bridge Docker tak
> boleh dipakai sebagai tanda pengenal basis data (§3.1).

---

### C-15 — Berpindah peran dalam satu sesi `P0` — ✅ dijalankan 15 September 2026, **nihil cacat**

**Misi:** peran jamak (5 September 2026) mengubah hal paling mendasar dalam
sistem ini — **hak akses tidak lagi ditentukan oleh siapa Anda, melainkan oleh
peran yang sedang Anda pakai**. Satu akun kini dapat memegang tiga peran
sekaligus dan berpindah di antaranya tanpa keluar-masuk. Kontrak inilah yang
mematahkan 16 kasus uji pada tarikan `main`, dan ia mengubah penjagaan akses,
jadi ia layak diuji sendiri.

**Hasil: 0 cacat, 2 catatan.** Rincian di
[CAT-016](BUG_REPORTS.md#cat-016) dan [CAT-017](BUG_REPORTS.md#cat-017).

| Yang ditelusuri | Hasil |
| --------------- | ----- |
| Pemilih peran pada akun ber-peran tiga | ✅ muncul; ketiganya ditawarkan dengan label yang benar |
| Akun ber-peran **tunggal** | ✅ "Ganti Peran" tak ditawarkan sama sekali — tak ada yang membingungkan |
| Memilih peran yang **tidak dimiliki** (`superuser`) | ✅ **403** "Akun Anda tidak memiliki peran tersebut" |
| Token `dev-login` sebelum peran dipilih | ✅ **401** "Peran yang ingin dipakai belum dipilih" |
| Berpindah peran lewat menu akun → `/pilih-peran` | ✅ token baru terbit, `act` berubah, mendarat di beranda peran barunya |
| Membuka area peran lama sesudah berpindah | ✅ dipantulkan ke area peran yang sedang dipakai |
| **Tombol Back** peramban sesudah berpindah | ✅ tak menghidupkan kembali layar peran lama — menu OPD tak muncul |
| Endpoint admin dengan token `responden` | ✅ **403** |
| Gerbang PDP saat berpindah ke `responden` | ✅ akun tanpa persetujuan **dipantulkan ke `/persetujuan`** tepat saat mengambil peran warga |
| Galat konsol sepanjang sesi | ✅ nol |

**Satu hal yang sengaja diperiksa dan ternyata benar: akun tanpa persetujuan PDP
tetap boleh memakai area Admin Kabupaten.** Sekilas itu terlihat seperti gerbang
yang jebol, dan mudah sekali dilaporkan sebagai temuan. Ia justru tepat:
persetujuan PDP menyangkut pemrosesan **data pribadi orang itu sebagai
responden**, bukan tugas jabatannya sebagai admin. Begitu ia mengambil peran
Masyarakat, gerbangnya langsung berdiri. Yang membuktikan bukan penalaran itu
melainkan percobaannya: satu akun ber-peran `responden`+`kabupaten` disetel
tanpa persetujuan, masuk sebagai Admin Kabupaten (lolos), lalu berpindah ke
Masyarakat — dan mendarat di `/persetujuan`.

> **Data yang disentuh sesi ini sudah dikembalikan.** `consentAt` milik
> `warga@gmail.com` dikosongkan sementara untuk probe di atas, lalu **disetel
> kembali ke nilai semula** (`2026-09-14 02:10:47.017`), bukan ke waktu sekarang.
> Satu survei yang lahir dari probe token dimusnahkan.

---

### Pembersihan data uji — 3 September 2026

Pengujian eksploratori dan E2E menulis baris **sungguhan** ke basis data dev.
Itu disengaja: probe yang tak menembus basis data tak membuktikan apa-apa. Yang
tak boleh dibiarkan adalah sisanya menumpuk, karena sebagian ikut terbaca sebagai
angka resmi di halaman `/statistics` publik.

**Yang dihapus**

| Objek                                 |   Jumlah | Asal                                    |
| ------------------------------------- | -------: | --------------------------------------- |
| Pengaduan bertanda `[UJI …]`          |        6 | C-02, C-03, E2E `ajukan-pengaduan`      |
| Balasan pengaduan                     |        4 | ikut cascade                            |
| Lampiran (baris + berkas)             |        1 | C-03                                    |
| Notifikasi bertaut tiket uji          |       30 | tanpa FK — **tak ikut cascade**         |
| Survei mati (334, 335)                |        2 | probe kontrak & duplikat balapan worker |
| Respons survei                        |       43 | fixture E2E & survei mati               |
| Jawaban                               |    104 + | terukur di jalan pertama; sisanya cascade |
| Akun karangan `uji.c05.*`             |        2 | C-05, sudah soft-delete                 |
| Berkas unggahan yatim                 | 22 (56 KB) | unggahan yang validasinya menolak     |

**Putaran kedua — 4 September 2026, penghapusan paksa**

Tiga survei uji yang semula saya pertahankan **ikut dihapus atas permintaan
penguji**. Keberatan sudah saya sampaikan lebih dulu dan keputusannya tetap di
penguji; ini catatannya, bukan pembelaan:

| Survei | Semula dipertahankan karena | Akibat penghapusan |
| ------ | --------------------------- | ------------------ |
| 332, 333 | reproduksi hidup BUG-005 yang masih terbuka | peragaannya hilang; **bukti tertulisnya utuh** di BUG_REPORTS dan dapat dibangun ulang ± 1 menit lewat API |
| 336 | fixture yang dipakai suite E2E | tak melumpuhkan apa pun: `globalSetup` membuatnya kembali otomatis pada jalan berikutnya, dengan id baru |

Ketiganya nol respons, jadi tak ada jawaban yang ikut hilang, dan ketiganya
dicadangkan lebih dulu. Sesudah putaran ini basis data dev **nol baris bertanda
`[UJI `**: tersisa 3 survei asli (masing-masing 9 unsur IKM), 6 pengaduan asli,
3 respons, 27 jawaban, 7 akun seed, 62 OPD, dan 1.606 baris audit — semuanya utuh.

**Yang tetap tak boleh disentuh**

- **Seluruh `audit_logs`** — jejak wajib menurut rancangan (UU PDP) sekaligus
  bukti. Jumlahnya tak berkurang sedikit pun (1.606 baris).
- **62 OPD** — hasil sinkronisasi Helpdesk, data sungguhan, bukan karangan.
- **Survei 22, 24, 281 dan enam pengaduan tanpa penanda** — tak satu pun berasal
  dari pengujian ini; survei 281 dan pengaduan #182 lahir 28–29 Agustus, sebelum
  sesi mana pun yang saya jalankan.

**Dampak yang terukur.** `/statistics` publik: `totalRespondents` 44 → **3**,
`totalComplaints` 11 → **6**, `completionRate` 36,36 % → **50 %**. Angka IKM tak
bergerak (77,78) — survei uji tanpa unsur IKM memang selalu dikecualikan, dan itu
justru yang membuat cacatnya lama tak terlihat: yang tercemar bukan IKM-nya,
melainkan hitungan mentah di halaman publik.

**Tiga hal yang perlu diketahui penguji berikutnya**

1. **Aplikasi tak dapat membersihkan ini sendiri.** Survei hanya boleh dihapus
   saat berstatus `draft` dan statusnya tak pernah kembali ke `draft`
   (`SurveysService.remove` + `ALLOWED_TRANSITIONS`); pengaduan tak punya endpoint
   `DELETE` sama sekali. Pembersihan menuntut akses basis data langsung.
2. **Urutan penghapusan menentukan.** `Survey → Question` memang `Cascade`, tetapi
   `Answer → Question` berperilaku `RESTRICT`: menghapus survei lebih dulu ditolak
   Postgres (`answers_question_id_fkey`). Hapus responsnya dulu — jawaban ikut
   lewat cascade — baru survei-nya.
3. **Notifikasi menaut pengaduan lewat teks `link`, bukan foreign key.** Ia tak
   ikut cascade; kalau dilewatkan, 30 tautan mati mengendap di lonceng notifikasi
   milik lima akun sekaligus.

**Cadangan lebih dulu, bukan sesudah.** Seluruh baris disalin apa adanya ke
`cadangan.json` (38 KB) beserta 22 berkas unggahannya sebelum satu pun dihapus.
Penghapusan tanpa cadangan bukan "rollback", melainkan sekadar hilang.

**Tiap jalannya suite E2E menambah sisa baru** — kira-kira 1 pengaduan, 2
notifikasi, dan 2 respons. Skrip pembersih yang dapat dijalankan ulang (bermode
`--dry` untuk melihat dulu tanpa menghapus) tersedia; jalankan sesudah suite,
bukan sesudah menumpuk berhari-hari.

### Putaran ketiga — 15 September 2026, notifikasi yatim

Sebelas hari tanpa pembersihan menunjukkan berapa cepat sisanya menumpuk, dan
satu bentuk sisa yang sebelumnya luput sama sekali:

| Objek | Jumlah |
| ----- | -----: |
| Pengaduan `[UJI E2E]` + survei fixture + responsnya | 5 + 1 + 6 |
| Notifikasi bertaut data uji | 25 |
| Berkas unggahan yatim | 50 |
| **Notifikasi menunjuk tiket yang sudah lenyap** | **7.986** |

Angka terakhir itu pelajarannya. Notifikasi pengaduan **disiarkan ke setiap akun
kabupaten, superuser, dan admin OPD** — jadi satu pengaduan uji melahirkan
beberapa baris notifikasi, dan baris itu **milik akun sungguhan**. Menghapus
pengaduannya tidak menyentuh mereka: tautannya berupa TEKS pada kolom `link`,
bukan kunci asing. Hasilnya 7.986 tautan mati di lonceng notifikasi para admin,
menumpuk diam-diam sejak akhir Agustus.

Dua aturan yang lahir dari situ:
1. **Saring notifikasi lewat `link`, dan lakukan SEBELUM induknya dihapus** —
   sesudah pengaduannya hilang, nomor tiketnya tak dapat dicari lagi.
2. **Periksa juga yang sudah telanjur yatim**: cocokkan `link` tiap notifikasi
   dengan tiket & id survei yang benar-benar masih ada. Itu satu-satunya cara
   menemukan sisa dari pembersihan-pembersihan sebelumnya yang belum tahu aturan
   nomor 1.

Sesudahnya tersisa 254 notifikasi, seluruhnya menunjuk pengaduan yang ada.

## 5. Format laporan temuan

Satu temuan satu entri. Tulis segera saat ditemukan, jangan menunggu sesi berakhir.

```markdown
### BUG-00X — [Judul singkat yang menjelaskan gejala]

|                       |                                         |
| --------------------- | --------------------------------------- |
| **Charter**           | C-0X                                    |
| **Tanggal**           | 11 Agustus 2026                         |
| **Peran**             | Responden / Admin OPD / Admin Kabupaten |
| **Halaman**           | /surveys/12                             |
| **Severity**          | Critical / High / Medium / Low          |
| **Kasus uji terkait** | TC-FE-0XX (bila ada)                    |

**Langkah reproduksi** 1. 2. 3.

**Hasil yang diharapkan**

**Hasil sebenarnya**

**Bukti** — tangkapan layar, pesan di Console, atau respons di tab Network

**Catatan** — apakah selalu terjadi atau kadang-kadang; apakah ada jalan memutar
```

### Panduan severity

| Severity     | Kriteria                                                               |
| ------------ | ---------------------------------------------------------------------- |
| **Critical** | Data bocor antar-pengguna/OPD, data hilang, atau alur inti buntu total |
| **High**     | Fitur utama tidak berfungsi, tidak ada jalan memutar                   |
| **Medium**   | Fitur bermasalah tetapi ada jalan memutar                              |
| **Low**      | Kosmetik, salah ketik, ketidakrapian tampilan                          |

> Isi kolom **Severity** berdasarkan dampak ke pengguna, bukan seberapa sulit
> memperbaikinya. Menentukan prioritas perbaikan adalah urusan tim dev.

---

## 6. Catatan penutup sesi

Setiap sesi berakhir dengan ringkasan singkat:

| Isi              | Contoh                                                |
| ---------------- | ----------------------------------------------------- |
| Charter          | C-01                                                  |
| Durasi           | 75 menit                                              |
| Cakupan tercapai | ~70% — tipe Pilihan Ganda belum sempat diuji          |
| Temuan           | 3 (1 High, 2 Medium)                                  |
| Hambatan         | Seed perlu dijalankan ulang, memakan ~10 menit        |
| Charter baru     | C-09 — perilaku duplikasi survei berpertanyaan kustom |

Ringkasan inilah yang menjadi bahan laporan pengujian, bukan daftar temuan saja.
