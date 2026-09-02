# Panduan Pengujian Eksploratori (Exploratory Testing Charters)

## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

|                        |                                                         |
| ---------------------- | ------------------------------------------------------- |
| **Dokumen Pendamping** | TEST_PLAN.md · TEST_CASES.md                            |
| **Versi**              | 1.1                                                     |
| **Tanggal**            | 2 September 2026 (v1.0 — 11 Agustus 2026)               |
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
pnpm db:seed           # PAKAI INI — `prisma db seed` gagal, tidak ada blok
                       # `prisma.seed` di package.json
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

> ⚠️ Basis data dev bisa menyimpang dari `seed.ts` (per 10 Agustus 2026 sudah berbeda:
> akun `warga@gmail.com`, 54 OPD hasil sinkronisasi Helpdesk). Sebelum sesi, jalankan
> ulang seed bila ingin titik awal yang dapat direproduksi, dan **catat di laporan**
> versi data mana yang dipakai.

---

## 4. Charter

Urutan sudah disusun dari yang paling berpeluang menemukan cacat serius.

### C-01 — Survei kustom bertipe teks & pilihan ganda `P0`

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

### C-02 — Alur pengaduan lintas peran `P0`

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

### C-03 — Lampiran pengaduan `P0`

**Misi:** uji batas dan perilaku unggah berkas.

**Arah penelusuran:**

- Unggah beberapa berkas sekaligus; unggah berkas sangat besar; unggah tipe tak lazim
  (`.exe`, `.svg`, berkas tanpa ekstensi).
- Apa yang terjadi bila jaringan terputus di tengah unggahan?
- Buka pratinjau gambar — apakah bisa ditutup? Apakah gambar rusak ditangani dengan baik?
- Apakah lampiran pengaduan orang lain bisa diakses langsung lewat URL berkasnya?
  **(Periksa dengan sungguh-sungguh — ini menyangkut kerahasiaan pengaduan, FR-CMP-08.)**

---

### C-04 — Proteksi route & peralihan peran `P0`

**Misi:** buktikan matriks proteksi route (TEST_CASES **A.5.1**) berlaku di aplikasi
sungguhan, bukan hanya di test.

**Arah penelusuran:**

- Untuk tiap peran, coba buka langsung setiap route pada matriks lewat bilah alamat.
- Login sebagai warga, lalu **ubah cookie `role` menjadi `kabupaten`** lewat DevTools.
  Apakah halaman admin terbuka? Apakah datanya ikut tampil, atau API tetap menolak?
- Logout, lalu tekan tombol Back. Apakah halaman terlindungi masih tampil dari cache?
- Buka dua tab dengan peran berbeda secara bersamaan. Apa yang terjadi?

> Konteks: `TC-AUTH-031` mencatat logout bersifat _stateless_ — token lama tetap sah di
> backend. Sesi ini memeriksa dampak nyatanya bagi pengguna.

---

### C-05 — Form buat & ubah akun admin `P1`

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

---

### C-06 — Sinkronisasi & daftar OPD `P1`

**Misi:** uji perilaku daftar OPD pada volume data sungguhan (54 entri, bukan 3 dari seed).

**Arah penelusuran:**

- Tekan tombol Sinkronisasi. Berapa lama? Apakah ada indikator proses? Apa yang terjadi
  bila ditekan dua kali beruntun?
- Uji pencarian dengan kata yang tidak ada, dengan huruf besar-kecil campur, dan dengan
  spasi di awal/akhir.
- Cari sesuatu di halaman 3 — apakah halaman kembali ke 1? Kalau tidak, apakah tabelnya
  kosong padahal hasil ada?
- Bandingkan jumlah pada indikator paginasi dengan jumlah baris yang benar-benar tampil.

---

### C-07 — Profil responden & pemakaian ulang data `P1`

**Misi:** periksa FR-AUTH-05 — data profil dipakai ulang otomatis saat mengisi survei.

**Dasar kecurigaan:** `me.adapter.js` mencatat "dummy mengharapkan banyak field identitas
yang TIDAK ADA" di backend.

**Arah penelusuran:**

- Isi profil demografis lengkap, lalu isi survei. Apakah identitas terisi sendiri?
- Ubah profil sebagian saja (mis. hanya pekerjaan). Apakah field lain tetap utuh?
- Kosongkan salah satu field wajib. Apa pesan errornya, dan apakah bisa dipahami awam?
- Apakah ada field di halaman profil yang tampil kosong terus-menerus?

---

### C-08 — Ketahanan saat backend bermasalah `P1`

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

---

### C-09 — Masuk lewat SSO Helpdesk & persetujuan PDP `P0`

> **Charter baru, 2 September 2026.**

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

### C-10 — Area Superuser `P0`

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

---

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
