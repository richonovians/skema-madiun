# Daftar Temuan Pengujian — SKM & SPM Kabupaten Madiun

| Butir               | Isi                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Versi**           | 1.0                                                                                                        |
| **Tanggal**         | 12 Agustus 2026                                                                                            |
| **Penguji**         | Mohammad Fakhriza Maftukhin (Tester — Frontend)                                                            |
| **Lingkup**         | `apps/web` saja                                                                                            |
| **Dokumen terkait** | [TEST_PLAN.md](TEST_PLAN.md) · [TEST_CASES.md](TEST_CASES.md) · [TEST_EXPLORATORY.md](TEST_EXPLORATORY.md) |

Berkas ini menampung **temuan**, yaitu perilaku nyata yang menyimpang dari yang
diharapkan. Kasus uji terencana ada di `TEST_CASES.md`; charter pengujian
eksploratori ada di `TEST_EXPLORATORY.md`. Yang di sini adalah hasilnya.

---

## 1. Cara memakai berkas ini

1. Temuan baru ditulis **saat itu juga** ketika ditemukan, bukan diingat-ingat
   sampai sesi selesai. Ingatan memburuk lebih cepat daripada yang kita kira.
2. Nomor urut tidak pernah dipakai ulang. Temuan yang ternyata bukan cacat
   ditandai `Ditolak` beserta alasannya, bukan dihapus — supaya tidak ada yang
   melaporkannya lagi bulan depan.
3. Satu temuan = satu perbaikan. Kalau dua gejala sembuh oleh satu perubahan
   kode, keduanya masuk satu nomor.
4. Kolom **Severity** diisi berdasarkan dampak ke pengguna, bukan seberapa sulit
   memperbaikinya. Prioritas perbaikan adalah keputusan tim dev.

### Cara bukti diverifikasi

Kejujuran tentang _bagaimana_ sesuatu diverifikasi sama pentingnya dengan
temuannya sendiri, karena menentukan seberapa besar tim boleh memercayainya.

| Label             | Artinya                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| **Terkonfirmasi** | Direproduksi langsung di peramban, langkahnya sudah dijalankan sendiri |
| **Bukti statis**  | Terbaca pasti dari kode sumber, tetapi belum dijalankan di peramban    |
| **Dugaan**        | Ada indikasi, belum cukup bukti — butuh penelusuran lanjutan           |

### Panduan severity

| Severity     | Kriteria                                                               |
| ------------ | ---------------------------------------------------------------------- |
| **Critical** | Data bocor antar-pengguna/OPD, data hilang, atau alur inti buntu total |
| **High**     | Fitur utama tidak berfungsi, tidak ada jalan memutar                   |
| **Medium**   | Fitur bermasalah tetapi ada jalan memutar                              |
| **Low**      | Kosmetik, salah ketik, ketidakrapian tampilan                          |

### Status

`Baru` → `Dilaporkan` → `Diperbaiki` → `Diverifikasi ulang` → `Ditutup`
Cabang lain: `Ditolak` (bukan cacat) · `Ditunda` (diakui, belum dikerjakan)

---

## 2. Ringkasan temuan

| ID                  | Judul                                                          | Severity | Verifikasi    | Status | Charter |
| ------------------- | -------------------------------------------------------------- | -------- | ------------- | ------ | ------- |
| [BUG-001](#bug-001) | Navbar admin menampilkan identitas mati, bukan akun yang login | High     | Terkonfirmasi | Baru   | —       |
| [BUG-002](#bug-002) | Lencana notifikasi tidak terbaca pembaca layar                 | Low      | Terkonfirmasi | Baru   | —       |
| [BUG-003](#bug-003) | `MapSection.jsx` kode mati berisi iframe Google Maps           | Low      | Terkonfirmasi | Baru   | —       |

**Rekap** — 3 temuan: 0 Critical · 1 High · 0 Medium · 2 Low
Belum ada yang berasal dari sesi eksploratori; ketiganya muncul dari penelaahan
kode dan penulisan uji otomatis, lalu dikonfirmasi di peramban. Kolom _Charter_
akan terisi begitu sesi C-01 dan seterusnya dijalankan.

---

## 3. Rincian temuan

<a id="bug-001"></a>

### BUG-001 — Navbar admin menampilkan identitas mati, bukan akun yang sedang login

|                       |                                                     |
| --------------------- | --------------------------------------------------- |
| **Charter**           | — (ditemukan saat penelaahan kode, 11 Agustus 2026) |
| **Tanggal**           | 12 Agustus 2026                                     |
| **Peran**             | Admin OPD dan Admin Kabupaten                       |
| **Halaman**           | Seluruh halaman `/admin-opd/*` dan `/admin-kab/*`   |
| **Severity**          | High                                                |
| **Verifikasi**        | Terkonfirmasi di peramban, 12 Agustus 2026          |
| **Kasus uji terkait** | Belum ada (usulan kasus uji baru di bagian bawah)   |

**Langkah reproduksi**

1. Jalankan `pnpm dev`, buka `http://localhost:3000`
2. Login sebagai Admin OPD dengan akun yang **bukan** Dinas Kesehatan
   (lihat daftar akun uji di TEST_PLAN.md §3.3)
3. Perhatikan pojok kanan atas navbar dan nama instansi di pojok kiri atas
4. Ulangi dengan login sebagai Admin Kabupaten

**Hasil yang diharapkan**

Navbar menampilkan nama, jabatan, dan instansi milik akun yang sedang login.

**Hasil sebenarnya**

Navbar menampilkan nilai tetap yang tertulis langsung di kode, sama untuk
siapa pun yang login:

| Lokasi                                                                                   | Yang ditampilkan                                     |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [AdminNavbar.jsx:29-31](apps/web/src/components/layouts/AdminNavbar.jsx#L29-L31)         | Instansi selalu tertulis "Dinas Kesehatan"           |
| [AdminNavbar.jsx:51-52](apps/web/src/components/layouts/AdminNavbar.jsx#L51-L52)         | Nama "Dr. Handoko", jabatan "Kepala Dinas"           |
| [AdminNavbar.jsx:54-58](apps/web/src/components/layouts/AdminNavbar.jsx#L54-L58)         | Foto profil ditarik dari `lh3.googleusercontent.com` |
| [AdminKabNavbar.jsx:94-100](apps/web/src/components/layouts/AdminKabNavbar.jsx#L94-L100) | Nama generik "Admin Kabupaten", inisial "AK"         |

**Bukti**

Kedua berkas navbar tidak memuat pemanggilan API sama sekali — tidak ada
`useEffect`, tidak ada impor service. Nilai-nilai itu memang literal di JSX,
jadi tidak mungkin berubah mengikuti sesi.

Data yang dibutuhkan sebenarnya sudah tersedia: `GET /auth/me` mengembalikan
`nama`, dan adapternya sudah ditulis di
[me.adapter.js:34-35](apps/web/src/features/profile/adapters/me.adapter.js#L34-L35).
Endpoint itu sudah dipakai di dua tempat lain
([ProfileContent.jsx](apps/web/src/features/profile/components/ProfileContent.jsx),
[WelcomeHeader.jsx](apps/web/src/features/dashboards/components/WelcomeHeader.jsx))
— jadi ini bukan fitur yang belum ada, melainkan yang belum dipasang di navbar.

**Catatan**

Selalu terjadi, di semua halaman admin, tanpa syarat khusus. Dikonfirmasi
langsung di peramban pada 12 Agustus 2026: bagian profil admin memang belum
tersambung ke backend sama sekali, sesuai dugaan dari kode.

Ada tiga alasan temuan ini dinilai **High**, bukan kosmetik:

1. **Nama instansi adalah informasi kerja, bukan hiasan.** Admin Dinas
   Pendidikan melihat tulisan "Dinas Kesehatan" di layarnya sepanjang sesi.
   Data di baliknya memang tetap tersaring benar oleh backend, tetapi
   pengguna tidak punya cara membedakan mana yang benar dari layar.
2. **Tim sudah memutuskan hal yang sama sebelumnya.** Bug identik pernah
   ditemukan pada dashboard warga dan diperbaiki (lihat catatan audit
   2026-08-05 di `WelcomeHeader.jsx`). Navbar admin adalah kasus yang sama
   yang belum ikut dibereskan.
3. **Aplikasi pemerintah hampir pasti gagal UAT** dengan nama fiktif seorang
   "Dr. Handoko" terpampang di setiap halaman admin.

Foto profil dari domain Google ikut selesai bila navbar diperbaiki. Namun
perlu dicatat terpisah: memuat gambar dari server pihak ketiga membocorkan
alamat halaman internal ke Google dan membuat tampilan rusak di jaringan yang
memblokir domain luar — hal yang lumrah terjadi di jaringan pemerintahan.

**Usulan kasus uji setelah diperbaiki**

Kunci perbaikannya dengan uji otomatis, supaya tidak diam-diam kembali:

> **TC-FE-028** — Navbar admin menampilkan nama dari `GET /auth/me`
> Render `AdminNavbar` dengan MSW membalas `nama: "Budi Santoso"`; pastikan
> teks itu muncul dan `"Dr. Handoko"` tidak ada di dokumen.

---

<a id="bug-002"></a>

### BUG-002 — Lencana notifikasi tidak terbaca pembaca layar

|                       |                                           |
| --------------------- | ----------------------------------------- |
| **Charter**           | — (ditemukan saat menulis uji otomatis)   |
| **Tanggal**           | 12 Agustus 2026                           |
| **Peran**             | Semua peran yang punya lonceng notifikasi |
| **Halaman**           | Navbar `/admin-opd/*`, `/admin-kab/*`     |
| **Severity**          | Low                                       |
| **Verifikasi**        | Terkonfirmasi lewat uji otomatis          |
| **Kasus uji terkait** | TC-FE-019 (ditandai ❌ di TEST_CASES.md)  |

**Langkah reproduksi**

1. Login sebagai admin yang punya notifikasi belum dibaca
2. Coba jangkau lonceng notifikasi memakai papan ketik saja (Tab)
3. Dengarkan apa yang dibacakan pembaca layar untuk tombol itu

**Hasil yang diharapkan**

Tombol lonceng mengumumkan jumlah notifikasi belum dibaca, misalnya
"Notifikasi, 3 belum dibaca".

**Hasil sebenarnya**

Lonceng tidak punya nama yang bisa diakses sama sekali, dan lencananya adalah
`<span>` berwarna kosong tanpa teks:

```jsx
// NotificationDropdown.jsx:84
<span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
```

Pengguna pembaca layar tidak mendapat petunjuk apa pun bahwa ada notifikasi
baru. Informasinya disampaikan murni lewat warna.

**Bukti**

Terbukti dari sisi pengujian: pada
[NotificationDropdown.test.jsx:69](apps/web/src/components/ui/__tests__/NotificationDropdown.test.jsx#L69)
tombol lonceng hanya bisa dijangkau dengan `getByRole('button', { name: '' })`
— namanya benar-benar kosong. Lencananya sendiri terpaksa dikueri lewat kelas
CSS `.bg-error` karena tidak ada teks yang bisa dicari.

**Catatan**

Selalu terjadi. Jalan memutarnya ada: pengguna tetap bisa membuka panel dan
membaca daftarnya. Karena itu dinilai Low, bukan lebih tinggi.

Meski begitu, aksesibilitas pada layanan publik pemerintah umumnya termasuk
persyaratan, bukan penyempurnaan — ada baiknya dipastikan ke pemilik produk
apakah ini terikat aturan tertentu. Perbaikannya sendiri ringan: tambahkan
`aria-label` pada tombol dan `<span className="sr-only">` berisi jumlah.

---

<a id="bug-003"></a>

### BUG-003 — `MapSection.jsx` kode mati berisi iframe Google Maps

|                       |                                    |
| --------------------- | ---------------------------------- |
| **Charter**           | — (ditemukan saat penelaahan kode) |
| **Tanggal**           | 12 Agustus 2026                    |
| **Peran**             | —                                  |
| **Halaman**           | Tidak dirender di halaman mana pun |
| **Severity**          | Low                                |
| **Verifikasi**        | Terkonfirmasi                      |
| **Kasus uji terkait** | —                                  |

**Langkah reproduksi**

Tidak ada langkah dari sisi pengguna — komponen ini tidak pernah tampil.

**Hasil yang diharapkan**

Komponen yang tidak dipakai tidak ikut disimpan di basis kode, atau kalau
memang direncanakan dipakai, ada catatan yang menerangkannya.

**Hasil sebenarnya**

[MapSection.jsx](apps/web/src/components/sections/MapSection.jsx) tidak diimpor
oleh berkas mana pun. Penelusuran seluruh `apps/web/src` hanya menemukan satu
kemunculan, yaitu barisan definisinya sendiri.

**Bukti**

Isinya sebuah `<iframe>` yang menyematkan `maps.google.com` dengan
`referrerPolicy="no-referrer-when-downgrade"`.

**Catatan**

Dampak ke pengguna saat ini nol, karena komponen tidak dirender. Dilaporkan
karena dua alasan yang baru menggigit nanti:

- Kalau suatu saat dipasang tanpa ditinjau ulang, penyematan pihak ketiga itu
  langsung aktif di situs publik pemerintah.
- Selama masih ada, komponen ini menyesatkan siapa pun yang menelusuri kode —
  saya sendiri sempat menduganya sebagai penyebab galat `jw is not defined`
  di Console, sebelum tahu bahwa ia tidak pernah dimuat.

Keputusan hapus atau simpan ada di tim dev; laporan ini hanya menyampaikan
keadaannya.

---

## 4. Catatan yang bukan cacat produk

Bagian ini menampung hal-hal yang tidak berdampak langsung ke pengguna,
sehingga tidak diberi nomor `BUG`, tetapi tetap perlu diketahui tim.

### CAT-001 — Uji frontend tidak pernah dijalankan oleh CI

`.gitlab-ci.yml` menjalankan `pnpm --filter @skm-spm/api test` dan `test:e2e`
untuk backend, serta `web:lint` dan `web:build` untuk frontend — tetapi
**tidak ada job yang menjalankan `pnpm --filter @skm-spm/web test`**.

Akibatnya 46 uji frontend yang sudah ada hanya berjalan bila seseorang
mengetiknya sendiri di komputernya. Perlindungannya terhadap regresi jadi
bergantung pada kebiasaan, bukan pada proses.

Perbaikannya sekitar lima baris di `.gitlab-ci.yml`, mengikuti pola job
`web:lint` yang sudah ada.

### CAT-002 — Pertanyaan desain yang menunggu jawaban tim

Ketiga hal berikut mungkin memang disengaja. Dicatat sebagai **pertanyaan**,
bukan tuduhan, dan menunggu konfirmasi sebelum dinaikkan jadi temuan:

| Hal                              | Yang perlu dipastikan                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Logout tidak menggugurkan token  | Token lama tetap sah sampai kedaluwarsa sendiri. Disengaja karena SSO Helpdesk akan menangani, atau memang celah? |
| Token disimpan di `localStorage` | Terbaca oleh skrip mana pun di halaman. Apakah rencananya pindah ke cookie `HttpOnly` saat SSO dipasang?          |
| Cookie sesi bukan `HttpOnly`     | Pertanyaan yang sama dengan di atas                                                                               |

Ketiganya berada di wilayah backend/keamanan, di luar lingkup pengujian
frontend saya. Yang saya lakukan hanya menandainya agar tidak lolos tanpa
seorang pun sempat memutuskan.

### CAT-003 — Galat `jw is not defined` di Console

Muncul berulang pada `VM1058`, `VM1059`, `VM1060` saat membuka aplikasi.
**Bukan berasal dari kode aplikasi**: penanda `VM` menunjukkan skrip yang
dievaluasi saat berjalan, bukan berkas milik proyek, dan penelusuran seluruh
`apps/web/src` tidak menemukan pengenal `jw` di satu berkas sumber pun (satu-satunya
kecocokan ada di dalam `app/icon.png`, kebetulan urutan byte pada berkas gambar).

Hampir pasti berasal dari ekstensi peramban. Cara memastikannya: buka aplikasi
di jendela Samaran dengan semua ekstensi nonaktif — bila galatnya hilang,
tuntas. Tidak perlu ditindaklanjuti sebagai cacat produk.

---

## 5. Riwayat revisi

| Versi | Tanggal         | Perubahan                                                                                                                                        |
| ----- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0   | 12 Agustus 2026 | Berkas dibuat. BUG-001 s.d. BUG-003 dan CAT-001 s.d. CAT-003 dari penelaahan kode dan penulisan uji otomatis, sebelum sesi eksploratori dimulai. |
