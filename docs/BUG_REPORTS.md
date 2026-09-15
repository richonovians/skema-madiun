# Daftar Temuan Pengujian — SKM & SPM Kabupaten Madiun

| Butir               | Isi                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Versi**           | 3.5                                                                                                        |
| **Tanggal**         | 15 September 2026                                                                                          |
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

| ID                  | Judul                                                          | Severity | Verifikasi    | Status     | Charter |
| ------------------- | -------------------------------------------------------------- | -------- | ------------- | ---------- | ------- |
| [BUG-005](#bug-005) | Duplikasi survei membuang opsi jawaban — survei jadi buntu total | **Critical** | Terkonfirmasi | Baru       | —       |
| [BUG-003](#bug-003) | `MapSection.jsx` kode mati berisi iframe Google Maps           | Low      | Terkonfirmasi | Baru       | —       |
| [BUG-001](#bug-001) | Navbar admin menampilkan identitas mati, bukan akun yang login | High     | Terkonfirmasi | **Ditutup** | —       |
| [BUG-002](#bug-002) | Lencana notifikasi tidak terbaca pembaca layar                 | Low      | Terkonfirmasi | **Ditutup** | —       |
| [BUG-004](#bug-004) | Tipe "Pilihan Ganda" tampil seolah tersedia padahal ditolak    | Low      | Terkonfirmasi | **Ditutup** | C-01    |
| [BUG-006](#bug-006) | Sesi hantu: tampak sudah login, tombol mati, data tetap terisi | High     | Terkonfirmasi | **Ditutup** | —       |
| [BUG-007](#bug-007) | Lampiran tak sah baru ditolak setelah diunggah, bukan dicegah  | Low      | Terkonfirmasi | Baru       | C-03    |
| [BUG-008](#bug-008) | Beranda publik menawarkan formulir yang tak dapat dipakai pengunjung | Medium   | Terkonfirmasi | Baru       | C-11    |
| [BUG-009](#bug-009) | Akun terlanjur dibuat ketika penetapan statusnya gagal          | Medium   | Terkonfirmasi | Baru       | C-05    |
| [BUG-010](#bug-010) | Tombol paginasi tak punya nama yang dapat dibacakan             | Low      | Terkonfirmasi | Baru       | C-06    |
| [BUG-011](#bug-011) | Pencarian daftar OPD tak memangkas spasi                        | Low      | Terkonfirmasi | Baru       | C-06    |
| [BUG-012](#bug-012) | Angka `skipped` pada laporan sinkronisasi OPD tak ditampilkan   | Low      | Terkonfirmasi | Baru       | C-06    |
| [BUG-013](#bug-013) | Survei di Sampah tetap terhitung pada statistik publik           | **High** | Terkonfirmasi | Baru       | C-14    |
| [BUG-014](#bug-014) | Hapus permanen meninggalkan notifikasi menunjuk survei yang tiada | Medium   | Terkonfirmasi | Baru       | C-14    |
| [BUG-015](#bug-015) | Dialog konfirmasi destruktif tak dapat dipakai pembaca layar     | Medium   | Terkonfirmasi | Baru       | C-14    |
| [BUG-016](#bug-016) | Captcha gagal → tombol kirim mati selamanya tanpa pesan          | Medium   | Terkonfirmasi | Baru       | C-16    |
| [BUG-017](#bug-017) | Dropdown menyebut namanya, tak pernah menyebut pilihannya        | Medium   | Terkonfirmasi | Baru       | C-17    |

**Rekap** — 16 temuan: 4 ditutup, **12 terbuka (1 Critical, 1 High, 6 Medium, 4 Low)**

> ⚠️ **BUG-005 menuntut perhatian lebih dulu.** Ia satu-satunya temuan Critical,
> sudah terkonfirmasi, dan akibatnya menimpa warga langsung: survei terbit yang
> tidak dapat diselesaikan sama sekali. Reproduksi hidupnya bisa dibuka di
> `/surveys/333` pada lingkungan dev.

Tiga temuan pertama sudah diperbaiki tim dev dan diverifikasi ulang pada
2 September 2026. BUG-002 kini terkunci uji otomatis; BUG-001 belum.

BUG-006 dilaporkan **dan** diperbaiki pada 2 September 2026. Ia bersaudara
dekat dengan keluhan 18 Agustus ("baru akses localhost sudah terlihat login"):
gejalanya mirip, tetapi sebabnya berlawanan arah — waktu itu sesi mati yang
tampak hidup, kali ini sesi hidup yang cookienya sudah mati.

**BUG-005 adalah CAT-004 yang menjadi kenyataan.** Pada 12 Agustus ia dicatat
sebagai peringatan yang "belum berdampak karena tipe pilihan memang belum bisa
dibuat". Tipe pilihan kini bisa dibuat, dan `duplicate()` masih tidak menyalin
opsi — jadi peringatannya berubah menjadi cacat. Dikonfirmasi di peramban pada
2 September 2026, dan **dinaikkan dari High ke Critical** setelah terlihat bahwa
akibatnya bukan satu pertanyaan yang tak terjawab, melainkan seluruh survei yang
tak dapat dilewati.

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
| [AdminNavbar.jsx:29-31](../apps/web/src/components/layouts/AdminNavbar.jsx#L29-L31)         | Instansi selalu tertulis "Dinas Kesehatan"           |
| [AdminNavbar.jsx:51-52](../apps/web/src/components/layouts/AdminNavbar.jsx#L51-L52)         | Nama "Dr. Handoko", jabatan "Kepala Dinas"           |
| [AdminNavbar.jsx:54-58](../apps/web/src/components/layouts/AdminNavbar.jsx#L54-L58)         | Foto profil ditarik dari `lh3.googleusercontent.com` |
| [AdminKabNavbar.jsx:94-100](../apps/web/src/components/layouts/AdminKabNavbar.jsx#L94-L100) | Nama generik "Admin Kabupaten", inisial "AK"         |

**Bukti**

Kedua berkas navbar tidak memuat pemanggilan API sama sekali — tidak ada
`useEffect`, tidak ada impor service. Nilai-nilai itu memang literal di JSX,
jadi tidak mungkin berubah mengikuti sesi.

Data yang dibutuhkan sebenarnya sudah tersedia: `GET /auth/me` mengembalikan
`nama`, dan adapternya sudah ditulis di
[me.adapter.js:34-35](../apps/web/src/features/profile/adapters/me.adapter.js#L34-L35).
Endpoint itu sudah dipakai di dua tempat lain
([ProfileContent.jsx](../apps/web/src/features/profile/components/ProfileContent.jsx),
[WelcomeHeader.jsx](../apps/web/src/features/dashboards/components/WelcomeHeader.jsx))
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

**Penyelesaian — 2 September 2026, `Ditutup`**

Diperbaiki tim dev pada dua commit terpisah: `efb7b9f` untuk navbar Admin OPD
dan `4e3e0c9` untuk Admin Kabupaten. Kedua navbar kini memanggil
`GET /auth/me` (ditambah `GET /opd/:id` untuk nama instansi) lewat `useEffect`,
dan seluruh nilai karangan sudah hilang — termasuk foto `googleusercontent`.

Catatan cara mereka menyelesaikannya, karena berbeda dari usulan saya: baris
kedua diisi **label peran** ("Admin OPD"), bukan jabatan. Itu keputusan yang
lebih jujur daripada usulan awal saya, sebab `MeEntity` memang tidak punya
kolom jabatan sama sekali — mengarangnya berarti mengulang cacat yang sama
dalam bentuk lain.

**Masih terbuka:** TC-FE-028 belum ditulis, jadi perbaikan ini **belum
terkunci uji otomatis**. Kalau navbar dirombak lagi, tidak ada yang menahannya
kembali ke identitas mati. Bandingkan dengan BUG-002 yang sudah terkunci.

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
[NotificationDropdown.test.jsx:69](../apps/web/src/components/ui/__tests__/NotificationDropdown.test.jsx#L69)
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

**Penyelesaian — 2 September 2026, `Ditutup`**

Tombol lonceng kini punya
[`aria-label` yang menyebutkan jumlahnya](../apps/web/src/components/ui/NotificationDropdown.jsx#L105):

```jsx
aria-label={hasIndicator ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
```

Perbaikan ini **mengumumkan dirinya sendiri lewat uji**. Sembilan kasus di
`NotificationDropdown.test.jsx` gagal serentak begitu `aria-label` dipasang,
karena semuanya bergantung pada helper `getByRole('button', { name: '' })` —
kueri yang dulu terpaksa berbunyi begitu justru karena tombolnya tidak punya
nama. Kueri itulah sidik jari cacatnya, jadi kegagalan itu tepat seperti yang
diharapkan dari uji yang merekam sebuah cacat.

Berkas ujinya sudah ditulis ulang: helper memakai `{ name: /notifikasi/i }`,
dan dua kasus lencana kini menegaskan **jumlahnya terbaca**
(`{ name: 'Notifikasi, 1 belum dibaca' }`), bukan lagi memeriksa kelas CSS
`.bg-error`. Dengan begitu perbaikannya terkunci: menghapus `aria-label` akan
langsung memerahkan suite.

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

[MapSection.jsx](../apps/web/src/components/sections/MapSection.jsx) tidak diimpor
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

<a id="bug-004"></a>

### BUG-004 — Tipe "Pilihan Ganda" tampil seolah tersedia padahal selalu ditolak

|                       |                                   |
| --------------------- | --------------------------------- |
| **Charter**           | C-01                              |
| **Tanggal**           | 11 Agustus 2026                   |
| **Peran**             | Admin OPD                         |
| **Halaman**           | `/admin-opd/surveys/builder/[id]` |
| **Severity**          | Low                               |
| **Verifikasi**        | Terkonfirmasi                     |
| **Kasus uji terkait** | —                                 |

**Langkah reproduksi**

1. Login sebagai Admin OPD, buka builder sebuah survei berstatus draf
2. Pada panel kiri "Komponen Pertanyaan Kustom", perhatikan ketiga pilihan
3. Klik "Pilihan Ganda / Multiple Choice"

**Hasil yang diharapkan**

Tipe yang belum didukung terlihat berbeda dari yang didukung — misalnya diberi
gaya nonaktif atau label "segera hadir" — sehingga admin tahu sebelum mengklik.

**Hasil sebenarnya**

Ketiga tipe dirender dengan gaya yang **persis sama**: sama-sama punya kursor
`pointer`, pegangan seret, dan efek sorot saat kursor melintas. Tidak ada
petunjuk apa pun bahwa satu di antaranya tidak bisa dipakai. Barulah setelah
diklik, muncul pesan bahwa tipe itu belum didukung.

**Bukti**

Ketiganya memakai kelas dan struktur yang identik di
[BuilderSidebar.jsx:28-57](../apps/web/src/features/surveys/builder/components/BuilderSidebar.jsx#L28-L57);
tidak ada percabangan `disabled` untuk "Pilihan Ganda".

Penolakannya sendiri **sudah ditangani dengan baik dan disengaja** —
[page.jsx:155-163](<../apps/web/src/app/admin-opd/(builder)/surveys/builder/[id]/page.jsx#L155-L163>):

```js
if (type === 'Pilihan Ganda') {
  // GAP: builder ini belum punya UI pengaturan opsi jawaban, padahal
  // backend WAJIB >=2 opsi utk tipe pilihan (CreateQuestionDto). Daripada
  // kirim payload yg pasti 400, ditolak di sini dgn pesan jelas.
  setActionError('Tipe "Pilihan Ganda" belum didukung builder ini (...)');
  return;
}
```

**Catatan**

Selalu terjadi.

Penting untuk membedakan dua hal, supaya laporan ini tidak salah alamat:

- **Bukan temuan:** tipe Pilihan Ganda belum berfungsi. Itu memang belum
  dikerjakan dan diakui sendiri oleh tim — skema Prisma menandainya "Fase 3",
  dan builder sengaja menahan payload agar tidak menembak backend dengan
  request yang pasti 400. Perilakunya justru rapi.
- **Temuan:** tampilannya tidak mencerminkan keadaan itu. Satu-satunya cara
  admin mengetahuinya adalah dengan mencoba lalu gagal.

Karena itu severity-nya Low: tidak ada kerusakan, tidak ada data salah, dan
pesannya jelas. Perbaikannya pun kecil — beri gaya nonaktif dan label
keterangan pada satu komponen di sidebar.

Satu hal yang perlu dipastikan ke tim: pesan galat muncul sebagai spanduk di
**bagian atas kanvas**, sementara yang diklik ada di **panel kiri**. Bila
kanvas sedang tergulir ke bawah, ada kemungkinan admin mengklik dan merasa
tidak terjadi apa-apa. Belum sempat saya uji pada survei berpertanyaan banyak.

**Penyelesaian — 2 September 2026, `Ditutup`**

Diselesaikan bukan dengan menonaktifkan tombolnya, melainkan dengan
**mengerjakan fiturnya**: `95cb251 feat(web): pertanyaan uraian & pilihan ganda
bisa dipakai sungguhan`, disusul `4a3df9c` yang membuat opsi jawaban dapat
diubah setelah pertanyaan dibuat. Penghadang `if (type === 'Pilihan Ganda')` di
`page.jsx` sudah tidak ada, dan sidebar yang menawarkan ketiga tipe kini jujur.

Pertanyaan terbuka soal spanduk galat yang tergulir menjadi tidak relevan,
karena jalur yang memunculkannya sudah hilang.

Perhatian pindah ke akibat lanjutannya: tipe Pilihan Ganda yang kini nyata
membuat [BUG-005](#bug-005) — yang selama ini tertidur sebagai CAT-004 —
menjadi cacat sungguhan.

---

<a id="bug-005"></a>

### BUG-005 — Duplikasi survei membuang opsi jawaban, responden buntu total

|                       |                                                                   |
| --------------------- | ----------------------------------------------------------------- |
| **Charter**           | — (ditemukan saat menyesuaikan pengujian, 2 September 2026)        |
| **Tanggal**           | 2 September 2026                                                  |
| **Peran**             | Admin OPD, Admin Kabupaten, Superuser (pembuat) — **korbannya warga** |
| **Halaman**           | `/admin-opd/surveys` → tombol Duplikat, lalu `/surveys/<id>`      |
| **Severity**          | **Critical** (dinaikkan dari High setelah dikonfirmasi)           |
| **Verifikasi**        | **Terkonfirmasi** — direproduksi di peramban 2 September 2026     |
| **Kasus uji terkait** | Usulan TC-FE-031 di bawah                                          |
| **Riwayat**           | Diperingatkan sebagai CAT-004 pada 12 Agustus 2026                 |

**Langkah reproduksi**

1. Buat survei berisi satu pertanyaan **Pilihan Ganda** (misal 3 opsi), dan
   satu pertanyaan **Skala 1-4** yang labelnya disesuaikan (bukan label baku)
2. Kembali ke daftar survei, klik **Duplikat** pada survei itu
3. Buka salinannya di builder, lalu terbitkan
4. Buka salinan itu sebagai responden dan mulai mengisi

**Hasil yang diharapkan**

Salinan identik dengan aslinya, termasuk opsi jawaban dan label skala tersuai.

**Hasil sebenarnya**

Dua kerugian sekaligus, keduanya tanpa peringatan apa pun:

| Tipe pertanyaan            | Akibat pada salinan                                        |
| -------------------------- | ---------------------------------------------------------- |
| Pilihan Ganda              | Kehilangan seluruh opsi → **responden buntu, lihat bawah**  |
| Skala 1-4 berlabel tersuai | Label kembali diam-diam ke label baku PermenPANRB          |

**Yang membuatnya Critical, bukan sekadar High**

Akibatnya bukan "satu pertanyaan tak bisa dijawab", melainkan **seluruh survei
tak dapat dilewati**. Pertanyaan pilihan ganda bersifat wajib (`isRequired`
bernilai benar untuk semua tipe selain `teks`), sementara tidak ada satu pun
opsi untuk dipilih. Tombol **"Pertanyaan Selanjutnya" tetap nonaktif selamanya**,
dan responden tersangkut di "Pertanyaan 1 dari 2" tanpa jalan maju, tanpa jalan
mundur, tanpa cara mengirim.

Panduan severity di §1 menyebut Critical mencakup "alur inti buntu total".
Mengisi survei **adalah** alur inti sistem SKM, dan di sini ia buntu total pada
survei yang sudah terbit ke publik. Tim dev boleh menurunkannya bila menilai
kondisinya terlalu sempit — tetapi alasan menaikkannya dicatat di sini.

**Bukti — dikonfirmasi langsung, 2 September 2026**

Dibuktikan dua lapis. Pertama di tingkat API, dengan membuat survei uji berisi
satu pertanyaan pilihan ganda (3 opsi) dan satu skala berlabel tersuai, lalu
menduplikasinya:

```
--- ASLI (id 332) ---
  'Layanan mana yang Anda gunakan?'   pilihan  3 opsi  'Rawat Jalan | Rawat Inap | IGD'
  'Bagaimana kepuasan Anda ...'       skala    4 opsi  'Sangat Tidak Puas (uji) | ... | Sangat Puas (uji)'

--- SALINAN (id 333) ---
  'Layanan mana yang Anda gunakan?'   pilihan  0 opsi  (kosong)
  'Bagaimana kepuasan Anda ...'       skala    0 opsi  (kosong)

total opsi  asli=7  salinan=0
```

Kedua di peramban, membuka kedua survei sebagai responden `warga@example.go.id`:

| Yang diperiksa                        | Asli | Salinan |
| ------------------------------------- | :--: | :-----: |
| Opsi pilihan ganda tampil             |  ✅  |   ❌    |
| Label skala tersuai tampil            |  ✅  |   ❌    |
| Peringatan "opsi belum tersedia"      |  —   |   ⚠️ ya |
| **Responden dapat maju ke soal 2**    |  ✅  | **❌ buntu** |

Pada salinan, tombol "Pertanyaan Selanjutnya" dirender dengan gaya nonaktif
(`bg-surface-dim`, bukan biru primer) dan `isEnabled()` mengembalikan `false`.

Rantai penyebabnya, dapat ditelusuri dari kode:

1. [`duplicate()`](../apps/api/src/modules/surveys/surveys.service.ts#L178-L186)
   menyalin `teks`, `tipe`, `isIkmUnsur`, `kodeUnsur`, dan `urutan` — relasi
   opsi jawaban tidak ikut disalin.
2. Salinan dibuat langsung lewat `prisma.survey.create` dengan `questions.create`
   bersarang, sehingga **melewati `CreateQuestionDto`** yang biasanya mewajibkan
   minimal 2 opsi untuk tipe `pilihan`. Penjaga itu tidak pernah berjalan di
   jalur ini.
3. `GET /surveys/:id/fill` mengembalikan pertanyaan tanpa opsi, dan
   [`adaptFillQuestion`](../apps/web/src/features/surveys/adapters/survey.adapter.js)
   menerjemahkannya jadi `options: undefined`.
4. Di [QuestionCard.jsx:56-69](../apps/web/src/features/surveys/components/QuestionCard.jsx#L56-L69),
   cabang pilihan ganda dengan opsi kosong menampilkan
   _"Opsi jawaban pertanyaan ini belum tersedia. Silakan hubungi pengelola survei."_
5. Untuk skala, [`scaleStepsFromOptions`](../apps/web/src/features/surveys/constants/scaleLabels.js)
   kembali ke `DEFAULT_SCALE_LABELS` bila opsinya tidak berjumlah tepat 4 —
   tanpa memberi tanda bahwa label tersuai hilang.

**Catatan**

Selalu terjadi — tidak bergantung waktu, peran, atau urutan.

Tiga hal memperberatnya:

1. **Duplikasi adalah alur yang dianjurkan**, bukan jalur pinggir. Fitur ini ada
   justru supaya survei triwulan berikutnya tidak dibuat dari nol.
2. **Admin tidak punya cara mengetahuinya sebelum terlambat.** Builder tidak
   memberi tanda apa pun bahwa salinan kehilangan opsi; barulah setelah survei
   terbit dan warga membukanya, masalahnya kelihatan.
3. **Kerugian label skala berlangsung diam-diam.** Pertanyaan pilihan ganda
   setidaknya memunculkan kotak peringatan; label skala hanya berganti tanpa
   tanda apa pun, dan survei tetap tampak normal. Hasil IKM-nya tetap terhitung,
   hanya saja respondennya membaca kalimat yang berbeda dari yang dirancang.

Perbaikannya di ranah backend (menyertakan relasi `options` pada `duplicate()`),
jadi di luar lingkup pengujian saya. Yang dilaporkan di sini gejalanya, yang
seluruhnya terlihat di frontend.

**Data uji yang tertinggal di basis data dev**

Konfirmasi ini menulis ke basis data dev atas izin penguji. Yang tertinggal:

| Id  | Judul                                    | Status |
| --- | ---------------------------------------- | ------ |
| 332 | `[UJI BUG-005] Survei asli ...`          | aktif  |
| 333 | `[UJI BUG-005] Survei asli ... (Salinan)` | aktif  |

Survei **333 adalah reproduksi hidup** — biarkan sampai perbaikannya diverifikasi,
karena ia bukti yang bisa dibuka siapa pun. Keduanya berjudul berawalan
`[UJI BUG-005]` supaya mudah dikenali dan dibersihkan nanti.

> **4 September 2026 — keduanya SUDAH DIHAPUS** atas permintaan penguji, sesudah
> keberatan disampaikan dan tetap diminta. Reproduksi hidupnya karena itu **tidak
> lagi tersedia untuk dibuka**; yang tersisa adalah bukti tertulis di laporan ini
> — keluaran API di atas, tabel perbandingan peramban, dan rantai penyebab di
> kode. Ketiganya cukup untuk menilai temuan, tetapi tim dev yang ingin melihatnya
> sendiri harus **membangun ulang** lewat empat langkah reproduksi di atas
> (± satu menit lewat API: buat survei 2 pertanyaan → `POST /surveys/:id/duplicate`
> → bandingkan jumlah opsinya). Salinan lengkap kedua baris beserta pertanyaan dan
> opsinya dicadangkan ke `cadangan-survei-332-333-336.json` sebelum dihapus.

**Usulan kasus uji setelah diperbaiki**

> **TC-FE-031** — Salinan survei mempertahankan opsi jawaban
> Sesudah `POST /surveys/:id/duplicate`, buka wizard pengisian salinan dan
> pastikan pertanyaan pilihan ganda merender opsi yang sama banyaknya dengan
> aslinya, serta label skala tersuai tidak berganti ke label baku.

Perlu dicatat: perilaku frontend saat opsi kosong **sudah terkunci uji**
(`QuestionCard.test.jsx`, kasus "berterus terang ketika opsi jawabannya
kosong"). Yang belum terkunci adalah duplikasinya sendiri, dan itu memang
harus diuji dari sisi backend.

---

<a id="bug-006"></a>

### BUG-006 — Sesi hantu: tampak sudah login, tombol mati, tetapi data tetap terisi

|                       |                                                              |
| --------------------- | ------------------------------------------------------------ |
| **Charter**           | — (dilaporkan pengguna saat memakai aplikasi)                |
| **Tanggal**           | 2 September 2026                                             |
| **Peran**             | Semua peran (diuji sebagai Superuser)                        |
| **Halaman**           | `/` dan seluruh halaman terlindung                           |
| **Severity**          | High                                                         |
| **Verifikasi**        | Terkonfirmasi — direproduksi & diukur di peramban            |
| **Kasus uji terkait** | Usulan TC-FE-032 di bawah                                    |
| **Riwayat**           | Berlawanan arah dengan keluhan 18 Agustus 2026               |

**Langkah reproduksi**

1. Login (jalur dev-login maupun SSO)
2. **Tutup peramban seluruhnya** — bukan cuma tabnya
3. Buka peramban lagi, akses `http://skema.local`
4. Perhatikan navbar, lalu coba buka halaman mana pun yang terlindung

**Hasil yang diharapkan**

Salah satu dari dua keadaan yang jelas: masih masuk seluruhnya, atau sudah
keluar seluruhnya. Bukan campuran keduanya.

**Hasil sebenarnya**

Tiga gejala sekaligus, dan gejala ketiga itulah yang membuatnya membingungkan:

| Gejala                                       | Sumbernya                                       |
| -------------------------------------------- | ----------------------------------------------- |
| Navbar menampilkan avatar berinisial pengguna | `isAuthenticated()` membaca **localStorage**    |
| Setiap halaman terlindung dipantulkan ke `/`  | `proxy.js` membaca **cookie**                   |
| Dropdown "Pilih Instansi" terisi 62 OPD       | header `Authorization` diambil dari localStorage |

Karena pengguna sudah berada di `/`, pantulan itu tak terlihat sebagai
pantulan — tombol dan tautan menuju halaman terlindung sekadar tampak mati.

**Bukti**

Sebab akarnya satu: artefak sesi disimpan di dua tempat dengan **masa hidup
berbeda**. Terukur di peramban:

```
cookie token    expires=-1  -> COOKIE SESI (hilang saat peramban ditutup)
cookie role     expires=-1  -> COOKIE SESI
cookie consent  expires=-1  -> COOKIE SESI
localStorage token          -> masih sah 24 jam (klaim exp JWT)

diminta : /admin-kab/dashboard
mendarat: /                       <- dipantulkan proxy.js
GET /api/v1/opd -> 200, jumlah OPD=62
```

`saveSession()` menulis cookienya tanpa `Max-Age` sama sekali, sehingga
peramban memperlakukannya sebagai cookie sesi. localStorage tak punya batas
seperti itu.

Jalur SSO kena hal yang sama dengan akibat yang lebih halus: cookie `session`
milik backend **bertahan** (ia memikul `Max-Age`), sedangkan cookie `role` yang
ditulis klien mati. Proxy lalu melihat sesi hidup tanpa peran, `hasFullAccess`
menjadi `false`, dan admin dipantulkan dari areanya sendiri.

**Catatan**

Dinilai **High**: alur inti buntu total tanpa jalan memutar yang bisa ditemukan
sendiri oleh pengguna. Satu-satunya jalan keluar sebelum perbaikan adalah
menghapus data situs atau logout–login manual — dan tak ada apa pun di
antarmuka yang menunjukkan hal itu, karena antarmuka justru menyatakan
pengguna sudah masuk.

**Penyelesaian — 2 September 2026, `Ditutup`**

Yang diperbaiki adalah **cookienya**, bukan sebaliknya, supaya jalur dev-login
sama dengan jalur SSO yang memang sudah benar:

1. Semua cookie navigasi (`token`, `role`, `area`, `opd`, `consent`) kini
   memikul `max-age` yang **diambil dari klaim `exp` tokennya sendiri**, bukan
   angka tetap — cookie yang hidup lebih lama daripada tokennya hanya akan
   membukakan halaman yang seluruh API-nya sudah pasti 401.
2. `selaraskanCookieSesi()` menulis ulang cookie itu dari localStorage bila
   ternyata hilang, supaya peramban yang **sudah** terjebak sembuh sendiri
   tanpa menuntut pengguna menghapus data situs.
3. Penanda persetujuan ikut dicerminkan di localStorage agar bisa dipulihkan,
   dan ikut dibuang saat `clearSession()` — kalau tidak, warga berikutnya di
   peramban yang sama akan memulihkan persetujuan milik orang lain.

Tidak ada hak baru yang diberikan: tokennya sendiri sudah bertahan 24 jam di
localStorage dan sudah dipakai pada setiap panggilan API. Cookie ini hanya
salinan penanda supaya proxy sepakat dengan antarmuka.

**Batas yang perlu dinyatakan jujur:** pada peramban yang sudah terjebak,
percobaan **pertama** membuka halaman terlindung tetap dipantulkan. `proxy.js`
berjalan di server sebelum satu baris JavaScript pun jalan, jadi ia tak bisa
membaca localStorage; pemulihan baru terjadi setelah halaman `/` termuat.
Percobaan berikutnya berhasil. Login baru tidak pernah masuk keadaan ini.

Terverifikasi **9/9** di peramban, mencakup empat keadaan:

| Keadaan diuji                                        | Hasil                                          |
| ---------------------------------------------------- | ---------------------------------------------- |
| Cookie sesudah login                                 | `expires` = exp token (selisih 1 detik)        |
| Peramban dibuka ulang dengan cookie utuh             | `/admin-kab/dashboard` terbuka, tak dipantulkan |
| Peramban yang sudah terjebak (localStorage saja)      | cookie ditulis ulang, halaman terlindung terbuka |
| Token benar-benar kedaluwarsa                        | tetap dibuang; halaman terlindung tetap tertutup |

Keadaan keempat sengaja diuji supaya pemulihan cookie tidak menjadi lubang yang
menghidupkan sesi mati — yaitu cacat yang justru diperbaiki 18 Agustus lalu.

**Usulan kasus uji**

> **TC-FE-032** — Cookie sesi bertahan sesudah peramban ditutup
> Sesudah login, pastikan cookie `token`/`role` memikul `max-age` yang sama
> dengan klaim `exp` token, dan bahwa membuka ulang peramban tidak memantulkan
> halaman terlindung. Uji juga arah sebaliknya: token kedaluwarsa di
> localStorage harus dibuang, bukan dipulihkan menjadi cookie.

---

<a id="bug-007"></a>

### BUG-007 — Lampiran tak sah baru ditolak setelah diunggah, bukan dicegah

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Charter**           | C-03                                                     |
| **Tanggal**           | 2 September 2026                                         |
| **Peran**             | Warga (form pengaduan), Admin OPD & Kabupaten (percakapan) |
| **Halaman**           | `/complaints/new`, panel balasan pengaduan               |
| **Severity**          | Low                                                      |
| **Verifikasi**        | Terkonfirmasi                                            |
| **Kasus uji terkait** | Usulan TC-FE-033 di bawah                                 |

**Langkah reproduksi**

1. Buka form pengaduan sebagai warga, tekan tombol lampirkan berkas
2. Perhatikan jenis berkas apa saja yang ditawarkan pemilih berkas
3. Pilih berkas `.exe`, atau gambar `.gif`, atau PNG berukuran 20 MB
4. Kirim, lalu tunggu

**Hasil yang diharapkan**

Berkas yang pasti ditolak backend tidak ditawarkan sejak awal, dan berkas yang
melebihi 5 MB ditolak seketika tanpa perlu diunggah lebih dulu.

**Hasil sebenarnya**

Tidak ada satu pun pemeriksaan di sisi klien. Pengguna memilih berkas, menunggu
unggahannya selesai, baru ditolak.

| Tempat                                                                                       | Keadaan                                                    |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [FileDropzone.jsx:10](../apps/web/src/components/ui/FileDropzone.jsx#L10)                     | `accept="image/*,.pdf"` — menawarkan GIF, SVG, BMP, TIFF yang semuanya ditolak backend |
| [AdminResolutionWorkspace.jsx:157](../apps/web/src/features/complaints/components/AdminResolutionWorkspace.jsx#L157) | **tanpa `accept` sama sekali** — menawarkan segala jenis berkas |
| [ChatReplyForm.jsx:87](../apps/web/src/features/complaints/components/chat/ChatReplyForm.jsx#L87) | **tanpa `accept` sama sekali**                             |
| Seluruh komponen                                                                             | ukuran berkas hanya **ditampilkan**, tidak pernah diperiksa terhadap batas 5 MB |

**Bukti**

Batas backend: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`;
maksimal 5 MB; maksimal 5 berkas
([complaints.service.ts:37-39](../apps/api/src/modules/complaints/complaints.service.ts#L37-L39)).
Enam berkas diuji lewat API, dan **backend menolak semuanya dengan benar**
(rincian di ringkasan sesi C-03). Jadi tidak ada risiko data — yang hilang
hanyalah waktu dan kuota pengguna.

**Catatan**

Selalu terjadi. Dinilai **Low** karena datanya aman, pesan galatnya jelas
(menyebut tipe yang ditolak sekaligus daftar yang diizinkan), dan jalan
memutarnya sederhana: pilih berkas yang benar.

Namun perlu ditimbang siapa penggunanya. Ini layanan pengaduan publik yang
dibuka warga dari ponsel, kerap dengan kuota terbatas dan jaringan lambat.
Mengunggah foto 20 MB sampai selesai lalu ditolak bukan sekadar merepotkan —
itu kuota yang benar-benar hilang. Tim boleh menaikkannya ke Medium atas dasar
itu.

Perbaikannya kecil dan seluruhnya di frontend: samakan `accept` dengan daftar
backend (`image/jpeg,image/png,image/webp,application/pdf`), pasang atribut itu
pada ketiga input, dan tolak berkas >5 MB di `handleFileChange` sebelum dikirim.

**Usulan kasus uji**

> **TC-FE-033** — Validasi lampiran di sisi klien
> Pilih berkas 6 MB dan berkas `.gif`; pastikan keduanya ditolak **tanpa**
> permintaan jaringan terkirim, dan pesannya menyebutkan batas yang dilanggar.

### BUG-008 — Beranda publik menawarkan formulir yang tak dapat dipakai pengunjung

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Charter**           | C-11                                                     |
| **Tanggal**           | 2 September 2026                                         |
| **Peran**             | Pengunjung yang belum masuk                              |
| **Halaman**           | `/` (beranda publik)                                     |
| **Severity**          | Medium                                                   |
| **Verifikasi**        | Terkonfirmasi — direproduksi dua kali                    |
| **Kasus uji terkait** | TC-FE-034                                                |

**Langkah reproduksi**

1. Buka `http://skema.local/` di jendela penyamaran (belum pernah masuk)
2. Perhatikan formulir "Sampaikan Keluhan & Pengaduan Anda" yang langsung tampil
3. Buka daftar pilihan **Kategori** — lalu pindah ke tab "Survei Kepuasan" dan
   buka daftar pilihan **Instansi / OPD**

**Hasil yang diharapkan**

Salah satu dari dua: pilihannya terisi, atau halaman menerangkan bahwa pengunjung
harus masuk lebih dulu.

**Hasil sebenarnya**

Kedua daftar pilihan kosong, dan **tidak ada satu kalimat pun** di halaman itu
yang menyebutkan perlunya masuk. Pengunjung melihat formulir yang tampak siap
diisi tetapi tak dapat diteruskan, tanpa cara mengetahui sebabnya.

**Bukti**

`src/app/page.jsx` merender `CreateComplaintForm` dan `SurveyForm` tanpa syarat
apa pun. Ketiga permintaan rujukannya menuntut autentikasi dan membalas **401**
bagi pengunjung:

| Permintaan                              | Balasan | Keterangan                                        |
| ----------------------------------------- | :-----: | -------------------------------------------------- |
| `GET /opd?limit=100&isActive=true`        | 401     | `opd.controller.ts:37` tanpa `@Roles` = "seluruh peran **terautentikasi**" |
| `GET /ref/complaint-categories`           | 401     | daftar kategori pengaduan                          |
| `GET /ref/complaint-sub-categories`       | 401     | daftar subkategori                                 |

Kegagalannya **ditelan diam-diam**. `CreateComplaintForm.jsx` mengambil hanya
`data` dari `useAsync` dan membuang `error`-nya:

```js
const { data: categories } = useAsync(fetchCategories);   // `error` tidak diambil
const categoryOptions = (categories ?? []).map(...);      // 401 -> senyap menjadi []
```

`Select.jsx` adalah `<select>` biasa, sehingga hasil akhirnya daftar kosong tanpa
keterangan. Diverifikasi dua kali lewat peramban sungguhan (sapuan C-11 dan
pemeriksaan ulang), dengan hasil sama persis.

**Catatan**

Selalu terjadi, dan hanya menimpa pengunjung yang belum masuk — pengguna yang
sudah masuk tak terpengaruh sama sekali.

Dinilai **Medium**, bukan Critical: tak ada data yang hilang atau bocor, dan
jalan memutarnya ada (masuk dulu lewat tombol di navbar). Tetapi juga bukan Low,
karena inilah pintu masuk utama layanan publik. Beranda menjanjikan sesuatu yang
tak bisa ditepatinya, dan bentuk cacatnya sama persis dengan [BUG-007](#bug-007):
penolakan baru terasa **sesudah** pengguna berusaha, bukan diterangkan jujur di
awal.

Ada satu keputusan produk yang mendahului perbaikan teknisnya: **apakah warga
memang seharusnya bisa mengadu tanpa masuk?** `POST /complaints` menuntut token
warga, jadi jawabannya saat ini "tidak". Bila itu memang keputusannya, yang
kurang hanyalah kejujuran antarmuka. Bila ternyata tidak — bila pengaduan
anonim memang diinginkan — yang perlu berubah jauh lebih besar dan itu ranah
backend.

Perbaikan terkecil yang menutup cacat ini seluruhnya di frontend: ambil `error`
dari `useAsync` (yang memang sudah menyediakannya) dan tampilkan ajakan masuk
menggantikan formulir bagi pengunjung yang belum bersesi.

**Usulan kasus uji**

> **TC-FE-034** — Beranda publik bagi pengunjung yang belum masuk
> Buka `/` tanpa sesi; pastikan pengunjung diberi tahu apa yang harus
> dilakukannya, bukan disodori daftar pilihan kosong tanpa keterangan.

---

---

<a id="bug-009"></a>

### BUG-009 — Akun terlanjur dibuat ketika penetapan statusnya gagal

| Butir          | Isi                                                     |
| -------------- | ------------------------------------------------------- |
| **Severity**   | Medium                                                  |
| **Verifikasi** | Terkonfirmasi di peramban, 3 September 2026 (sesi C-05) |
| **Berkas**     | `src/app/admin-kab/users/create/page.jsx:112-131`       |
| **Peran**      | Superuser (halaman ini `SUPERUSER_ONLY_PREFIXES`)       |

**Yang terjadi.** Membuat akun dengan sakelar "Aktif" dimatikan menempuh **dua
panggilan berurutan**, bukan satu:

```js
const created = await createUser({ ... });        // akun lahir, SELALU aktif
if (!formData.isActive) {
  await updateUserStatus(created.id, false);      // baru di sini dinonaktifkan
}
router.push('/admin-kab/users');
```

Pembagian ini sendiri benar dan disengaja — `UsersService.create` di backend
mematok `isActive: true`, jadi tak ada cara lain mewujudkan sakelar itu. Yang
belum ditangani adalah keadaan ketika **hanya panggilan kedua yang gagal**.

Ketika `PATCH /users/:id/status` dijawab 500, `catch` menangkapnya dan
menampilkan `submitError` di atas formulir. Formulirnya masih terisi lengkap,
halamannya tidak berpindah, dan tak satu kalimat pun menyebut bahwa akunnya
**sudah ada**.

**Bukti.** Hanya `PATCH .../status` yang dijatuhkan; `POST /users` dibiarkan
berjalan sungguhan.

```
   masih di form? YA
   pesan ke pengguna: "Gangguan sementara di server"
   pesan menyebut akun SUDAH terbuat? TIDAK
   akun ada di basis data? YA (id=274, isActive=true)
```

**Mengapa ini merugikan.** Dua akibat, dan keduanya menimpa pengguna yang
melakukan hal paling wajar — mencoba lagi:

1. Akun itu **aktif**, padahal admin justru memintanya nonaktif. Ia bisa dipakai
   masuk sejak detik itu juga, tanpa ada yang tahu.
2. Percobaan kedua **pasti gagal** dengan pesan surel duplikat (terbukti pada
   probe terpisah di sesi yang sama: `"Email atau ssoSubject sudah digunakan"`).
   Admin lalu menghadapi dua pesan galat yang saling bertentangan — "gangguan
   server" lalu "surel sudah dipakai" — tanpa petunjuk bahwa keduanya berasal
   dari satu akun yang memang sudah jadi.

**Yang diharapkan.** Ketika panggilan kedua gagal, pesannya harus mengakui apa
yang sudah terjadi: akun sudah dibuat dan **berstatus aktif**, penonaktifannya
yang gagal, dan penyelesaiannya ada di halaman daftar pengguna — bukan dengan
mengirim ulang formulir ini.

**Catatan cakupan.** Selebihnya formulir ini bersih. Validasi "Admin OPD tanpa
OPD" menahan pengiriman dengan pesan yang tepat, surel duplikat ditolak dan
pesannya ditampilkan (tidak ditelan), dan sakelar nonaktif yang berhasil
benar-benar tersimpan `isActive=false`. Lihat TC-FE-044.

---

<a id="bug-010"></a>

### BUG-010 — Tombol paginasi tak punya nama yang dapat dibacakan

| Butir          | Isi                                                 |
| -------------- | --------------------------------------------------- |
| **Severity**   | Low                                                 |
| **Verifikasi** | Terkonfirmasi, 3 September 2026 (sesi C-06)         |
| **Berkas**     | `src/components/ui/Pagination.jsx:23-45`            |
| **Sebaran**    | **Seluruh tabel aplikasi** — bukan hanya daftar OPD |

**Yang terjadi.** Kedua tombol paginasi berisi ikon `<ChevronLeft>` /
`<ChevronRight>` saja: tanpa teks, tanpa `aria-label`, tanpa `title`.

```
   [{"teks":"","ariaLabel":null,"title":null},{"teks":"","ariaLabel":null,"title":null}]
```

Pembaca layar membacakan keduanya cuma sebagai "tombol", tak terbedakan satu
sama lain. Pengguna tunanetra tak punya cara mengetahui mana maju dan mana
mundur selain menekannya lalu menyimpulkan dari perubahan tabel.

**Mengapa ini penting di sini.** Ini sistem layanan publik pemerintah daerah,
dan aksesibilitas bukan pelengkap. Bentuknya sama persis dengan
[BUG-002](#bug-002) yang sudah diperbaiki dan dikunci uji otomatis — kelasnya
sudah dikenali tim, hanya komponen ini yang belum ikut disisir.

**Yang diharapkan.** `aria-label="Halaman sebelumnya"` dan
`aria-label="Halaman berikutnya"` pada masing-masing tombol.

**Perbaikannya sekaligus menolong pengujian.** Selama tombolnya tak bernama,
`getByRole('button', { name: ... })` mustahil dipakai dan setiap pengujian
paginasi terpaksa menebak lewat posisi — cara yang diam-diam ikut rusak begitu
tata letaknya berubah.

---

<a id="bug-011"></a>

### BUG-011 — Pencarian daftar OPD tak memangkas spasi

| Butir          | Isi                                         |
| -------------- | ------------------------------------------- |
| **Severity**   | Low                                         |
| **Verifikasi** | Terkonfirmasi, 3 September 2026 (sesi C-06) |
| **Berkas**     | `src/app/admin-kab/opd/page.jsx:38-45`      |

**Yang terjadi.** Kata kunci dipakai apa adanya:

```js
const q = searchQuery.toLowerCase();          // tak ada .trim()
opd.name.toLowerCase().includes(q)
```

Kapitalisasinya sudah ditangani dengan benar. Spasinya tidak.

**Bukti.**

```
   OK  "DINAS"       (huruf besar)   -> 18 hasil, diharapkan 18
   OK  "dinas"       (huruf kecil)   -> 18 hasil, diharapkan 18
   OK  "DiNaS"       (campur)        -> 18 hasil, diharapkan 18
   >>> "  DINAS"     (spasi depan)   ->  0 hasil, diharapkan 18
   >>> "DINAS  "     (spasi belakang)->  0 hasil, diharapkan 18
```

**Mengapa ini merugikan.** Menempel nama OPD dari dokumen, surel, atau sel
spreadsheet hampir selalu membawa spasi ikut serta. Yang dilihat pengguna adalah
tabel kosong beserta kalimat "Tidak ada data OPD yang ditemukan." — pesan yang
terdengar pasti dan justru menyesatkan, karena datanya jelas ada. Kata kuncinya
sendiri tampak benar di kotak pencarian, sehingga tak ada apa pun di layar yang
memberi petunjuk apa yang salah.

**Yang diharapkan.** `searchQuery.trim().toLowerCase()`.

---

<a id="bug-012"></a>

### BUG-012 — Angka `skipped` pada laporan sinkronisasi OPD tak ditampilkan

| Butir          | Isi                                         |
| -------------- | ------------------------------------------- |
| **Severity**   | Low                                         |
| **Verifikasi** | Terkonfirmasi, 3 September 2026 (sesi C-06) |
| **Berkas**     | `src/app/admin-kab/opd/page.jsx:79-84`      |

**Yang terjadi.** `syncOpd()` mengembalikan **lima** angka — `fetched`,
`created`, `updated`, `deactivated`, `skipped` (lihat JSDoc di
`features/opd/services/opd.api.js`). Kalimat yang ditampilkan menyebut empat:

```
Sinkron selesai: 64 diambil, 2 baru, 60 diperbarui, 1 dinonaktifkan.
```

Laporan di atas dihasilkan dengan jawaban `POST /opd/sync` yang **dipalsukan**
berisi `skipped: 1`. Angka itu tak muncul di mana pun.

**Mengapa justru angka itu yang paling perlu terlihat.** Empat angka lainnya
melaporkan hal yang berhasil. `skipped` melaporkan OPD yang **tidak** ikut
tersinkron — biasanya karena datanya tak lengkap atau cacat di sisi Helpdesk.
Itulah satu-satunya angka yang menuntut tindak lanjut, dan justru itu yang
dihilangkan. Sinkronisasi yang melewatkan sepuluh OPD terbaca persis sama
suksesnya dengan yang tak melewatkan satu pun.

**Yang diharapkan.** Sebutkan juga jumlah yang dilewati, dan tandai berbeda
(mis. peringatan kuning, bukan hijau) bila nilainya lebih dari nol.

---

### BUG-013 — Survei di Sampah tetap terhitung pada statistik publik

|                       |                                                            |
| --------------------- | ---------------------------------------------------------- |
| **Charter**           | C-14                                                        |
| **Tanggal**           | 15 September 2026                                           |
| **Peran**             | Admin Kabupaten (yang membuang) · **pengunjung publik** (yang melihat akibatnya) |
| **Halaman**           | `/admin-kab/surveys` → Sampah; akibatnya di beranda publik `/` dan `GET /statistics` |
| **Severity**          | **High**                                                    |
| **Kasus uji terkait** | TC-FE-020, TC-FE-021 (statistik), C-14                      |

**Langkah reproduksi**

1. Sebagai Admin Kabupaten, buat survei ber-unsur IKM (`isIkmUnsur: true`,
   `kodeUnsur: 'U1'`) pada Dinas Kesehatan, periode `2026-Q4`, lalu aktifkan.
2. Sebagai warga, isi satu jawaban bernilai **1** (setara IKM 25).
3. Catat angka `GET /statistics`.
4. Buang survei itu ke **Sampah** lewat tombol Hapus pada daftar survei.
5. Baca ulang `GET /statistics`.

**Hasil yang diharapkan** — survei yang sudah dibuang tak lagi ikut menghitung
apa pun yang ditampilkan kepada publik.

**Hasil sebenarnya** — angkanya **tidak bergeser sedikit pun** sesudah dibuang:

| Ukuran | Sebelum survei dibuat | Sesudah dijawab | **Sesudah masuk Sampah** |
| ------ | --------------------: | --------------: | -----------------------: |
| IKM kabupaten | 82,64 | 71,11 | **71,11** |
| Total responden | 5 | 6 | **6** |
| Nilai Dinas Kesehatan (papan peringkat) | 100 | 62,5 | **62,5** |
| Tren IKM `2026-Q4` | tidak ada | 25 | **25** |

**Bukti kendali** — survei yang sama kemudian **dimusnahkan permanen**, dan
seluruh angka kembali persis ke keadaan semula (82,64 · 5 · 100 · tak ada).
Jadi yang menggerakkan angka itu memang survei yang berada di Sampah, bukan
cache, bukan kebetulan.

**Kenapa ini High.** Yang tercemar bukan layar internal, melainkan **angka resmi
yang dipublikasikan kepada warga**: nilai IKM kabupaten, peringkat antar-OPD,
dan garis tren per triwulan. Satu survei uji yang sudah dibuang menurunkan IKM
kabupaten **11,53 poin** dan menjatuhkan Dinas Kesehatan dari 100 menjadi 62,5 —
cukup untuk mengubah urutan papan peringkat. Ia juga memunculkan titik tren
`2026-Q4` yang seluruh datanya hanya ada di Sampah.

Yang membuatnya lebih jauh dari sekadar angka: dialog pembuangannya berjanji
_"dipindahkan ke Sampah dan dapat dipulihkan kembali"_, barisnya lenyap dari
daftar survei, dan `GET /surveys/:id/ikm` menjawab **404** bagi admin. Jadi
admin tak punya cara melihat angka yang justru sedang dipertontonkan kepada
publik atas namanya.

**Catatan** — snapshot IKM memang sengaja dibuat saat survei aktif dibuang
(`SurveysService.remove` memanggil `ikmService.snapshot`), dan itu masuk akal
sebagai arsip. Yang tampaknya terlewat adalah penyaring `deletedAt` pada agregat
yang membaca snapshot itu kembali.

---

### BUG-014 — Hapus permanen meninggalkan notifikasi yang menunjuk survei yang sudah tiada

|                       |                                                 |
| --------------------- | ----------------------------------------------- |
| **Charter**           | C-14                                            |
| **Tanggal**           | 15 September 2026                               |
| **Peran**             | Admin Kabupaten, Admin OPD, Superuser (penerima notifikasi) |
| **Halaman**           | lonceng notifikasi seluruh admin                |
| **Severity**          | Medium                                          |
| **Kasus uji terkait** | TC-FE-017, TC-FE-018, C-14                      |

**Langkah reproduksi**

1. Aktifkan sebuah survei, lalu kirim satu jawaban sebagai warga. Backend
   menyiarkan notifikasi "Survei Mulai Menerima Jawaban" ke setiap akun admin.
2. Buang survei itu ke Sampah, lalu **Hapus Permanen**.
3. Periksa tabel `notifications`, atau buka lonceng notifikasi salah satu admin.

**Hasil yang diharapkan** — notifikasi yang menunjuk survei yang sudah
dimusnahkan ikut dibersihkan, atau setidaknya tak lagi ditawarkan untuk diklik.

**Hasil sebenarnya** — survei, respons, jawaban, pertanyaan, opsi, dan snapshot
IKM-nya memang terhapus bersih, tetapi **5 notifikasi tetap tinggal**, tersebar
di lima akun sungguhan:

```
13022  admin.opd@example.go.id        /admin-opd/surveys/3042/responses
13023  warga@gmail.com                /admin-kab/surveys/3042/responses
13024  budi@gmail.com                 /admin-kab/surveys/3042/responses
13025  admin.kabupaten@example.go.id  /admin-kab/surveys/3042/responses
13026  superuser@example.go.id        /admin-kab/surveys/3042/responses
```

Notifikasi itu tetap tampil di lonceng, dan menekannya mendarat pada halaman
yang berbunyi **"Gagal memuat respons — Survei dengan id 3042 tidak ditemukan"**.

**Sebabnya sudah dikenal.** Notifikasi menaut induknya lewat **teks pada kolom
`link`, bukan kunci asing**, jadi ia tak pernah ikut `ON DELETE CASCADE`.
`SurveysService.purge` menghapus enam tabel secara tersurat dan `notifications`
tidak termasuk.

**Kenapa Medium, bukan Low.** Kegagalannya memang anggun — pengguna melihat
pesan yang jelas, bukan layar putih. Yang membuatnya lebih dari kosmetik adalah
**penumpukannya**: pembersihan 15 September 2026 menemukan **7.986** notifikasi
yatim semacam ini di lingkungan dev, hasil sebelas hari tanpa pembersihan. Kini
jalurnya terbuka lewat antarmuka bagi Admin Kabupaten, bukan hanya lewat skrip
pengujian.

---

### BUG-015 — Dialog konfirmasi tindakan destruktif tak dapat dipakai pembaca layar

|                       |                                              |
| --------------------- | -------------------------------------------- |
| **Charter**           | C-14                                         |
| **Tanggal**           | 15 September 2026                            |
| **Peran**             | seluruh peran admin                          |
| **Halaman**           | `ConfirmActionModal` (buang ke Sampah, tutup survei, salin, aktifkan) dan `ConfirmTypeToDeleteModal` (hapus permanen) |
| **Severity**          | Medium                                       |
| **Kasus uji terkait** | TC-FE-028, C-14                              |

Dua modal, dua kekurangan yang berbeda — dan yang kedua lebih merugikan daripada
yang pertama.

**1. `ConfirmActionModal` bukan dialog bagi teknologi bantu.** Dibaca langsung
dari DOM saat modal terbuka:

```
role=null   aria-modal=null   aria-labelledby=null   fokus di dalam modal=false
```

Tak ada yang memberi tahu pembaca layar bahwa sebuah dialog terbuka. Tombol
tutupnya (ikon `X`) juga tanpa nama yang dapat dibacakan — keluarga yang sama
dengan [BUG-010](#bug-010).

**2. `ConfirmTypeToDeleteModal` menyatakan dirinya dialog, tetapi meninggalkan
penggunanya di luar.** Atributnya justru lengkap (`role="dialog"`,
`aria-modal="true"`, `aria-labelledby`), namun fokus **tidak dipindahkan ke
dalam** saat ia terbuka dan **tidak dikurung** di dalamnya. Jejak fokus, direkam
dengan menekan Tab empat kali sesudah dialog muncul:

```
BUTTON "Hapus Permanen"   [DI LUAR MODAL]   ← fokus awal, tetap di pemicunya
INPUT#ketik-ulang
BUTTON "Batal"
(keluar dari modal)       [DI LUAR MODAL]
BODY                      [DI LUAR MODAL]
```

**Inilah yang membuatnya lebih buruk daripada sekadar tak beratribut.**
`aria-modal="true"` menyuruh pembaca layar menyembunyikan seluruh isi halaman di
luar dialog. Karena fokus tetap tertinggal di tombol pemicu — yang kini berada
di wilayah yang disembunyikan itu — pengguna pembaca layar mendarat di ruang
kosong: dialognya ada, tetapi ia tak berada di dalamnya, dan dua kali Tab
membawanya keluar sama sekali.

**Kenapa Medium.** Yang dijaga dialog ini adalah **penghapusan permanen jawaban
responden**. Pengguna yang tak dapat membaca isi dialognya hanya punya dua
kemungkinan: batal mengerjakan tugasnya, atau menekan tombol tanpa tahu apa yang
tertulis. Pengaman ketik-ulang-judulnya sendiri sudah dirancang bagus — justru
karena itu sayang bila tak terbaca.

**Catatan** — ini bukan cacat yang lahir bersama fitur Sampah; `ConfirmActionModal`
sudah lama ada. Yang baru adalah dipakainya pola ini untuk menjaga tindakan yang
tak dapat dibatalkan.

---

## 4. Ringkasan sesi eksploratori

### Sesi C-01 — Survei kustom bertipe teks & pilihan ganda

| Isi                  | Keterangan                                                                      |
| -------------------- | ------------------------------------------------------------------------------- |
| **Tanggal**          | 11 Agustus 2026                                                                 |
| **Peran**            | Admin OPD                                                                       |
| **Cakupan tercapai** | Tipe Isian Teks, tipe Pilihan Ganda, duplikasi survei, pengisian oleh responden |
| **Temuan**           | 1 (BUG-004, Low)                                                                |

**Yang lulus**

| Yang diuji                               | Hasil                                                                |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Survei bertipe Isian Teks                | Berfungsi, tersimpan dan tampil                                      |
| Duplikasi survei muncul di daftar        | Berfungsi — salinan tampil dengan imbuhan "(Salinan)" berstatus draf |
| Tombol kirim nonaktif bila belum dijawab | Berfungsi — menutup **TC-FE-004**                                    |

Dua di antaranya layak dicatat alasannya, bukan cuma hasilnya:

- **Duplikasi survei** adalah tempat yang wajar bagi kebocoran data, karena
  salinan bisa saja ikut membawa status terbit. Ternyata tidak: backend
  memaksa `status: draft` pada setiap salinan
  ([surveys.service.ts:171-188](../apps/api/src/modules/surveys/surveys.service.ts#L171-L188)),
  sehingga salinan tidak pernah langsung tampil ke warga. Risiko yang
  dikhawatirkan memang tidak ada.
- **Tombol kirim nonaktif** menjawab TC-FE-004, yang ekspektasinya memang
  menerima dua kemungkinan desain — tombol di-disable **atau** peringatan saat
  disubmit. Yang terjadi adalah cabang pertama. Statusnya kini ✅ di
  TEST_CASES.md, dengan catatan bahwa otomatisasinya belum ada.

**Belum tercakup, dibawa ke sesi berikutnya**

- Perilaku duplikasi pada survei yang **sudah terbit dan sudah punya jawaban**
- Apakah spanduk galat builder terlihat saat kanvas tergulir (lihat BUG-004)

---

### Sesi C-02 — Alur pengaduan lintas peran

| Isi                  | Keterangan                                                                    |
| -------------------- | ----------------------------------------------------------------------------- |
| **Tanggal**          | 2 September 2026                                                              |
| **Peran**            | Warga, Admin OPD, Admin Kabupaten, Superuser — keempatnya dalam satu tiket    |
| **Cakupan tercapai** | Pengajuan, tampil di daftar OPD, transisi status, notifikasi warga, percakapan |
| **Temuan**           | 0 cacat; 1 pertanyaan produk ([CAT-005](#cat-005))                            |
| **Tiket uji**        | `PGD202609029O8P` (id 183)                                                    |

**Yang lulus**

| Yang diuji                               | Hasil                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Format nomor tiket                       | `PGD202609029O8P` — sesuai pola `PGD` + tanggal + 4 karakter                     |
| Pengaduan baru tampil di daftar Admin OPD | Ya                                                                               |
| Notifikasi warga tiap perubahan status   | Belum-dibaca naik 1 → 2 → 3; judul "Status Pengaduan Diperbarui"                 |
| Tautan notifikasi                        | `/complaints/PGD202609029O8P` — menunjuk tiket yang benar                        |
| Status terminal ditegakkan               | `selesai → diproses` ditolak 400: _"Transisi status selesai → diproses tidak diizinkan"_ |
| Keempat peran dapat membalas             | Semua 201                                                                        |

Notifikasi lintas peran (D9) ini **belum pernah diuji manual sebelumnya** dan
ternyata bekerja utuh sampai ke tautannya — termasuk bagian yang paling mudah
salah, yaitu menautkan ke tiket yang tepat.

**Satu dugaan temuan yang GUGUR setelah diperiksa**

Sesi ini sempat mencatat bahwa tiga peran admin berbeda (`authorId` 22, 1, 2)
membalas satu tiket sementara adapter frontend hanya membedakan "pelapor vs
bukan". Terlihat seperti cacat — ternyata bukan. Perbaikan `3a1905c` justru
sudah mengganti label dari `'Admin OPD'` menjadi `'Admin'`, sehingga frontend
berhenti mengklaim peran yang bisa keliru. Karena `ComplaintReplyEntity` memang
tidak membawa nama maupun peran penulis, "Admin" adalah keterangan paling jujur
yang mungkin diberikan. Dicatat sebagai pertanyaan produk di
[CAT-005](#cat-005), bukan sebagai cacat.

---

### Sesi C-03 — Batas & perilaku unggah lampiran

| Isi                  | Keterangan                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| **Tanggal**          | 2 September 2026                                                       |
| **Peran**            | Warga                                                                  |
| **Cakupan tercapai** | Tipe berkas terlarang, berkas melebihi batas ukuran, berkas sah        |
| **Temuan**           | 1 ([BUG-007](#bug-007), Low)                                           |

**Yang lulus — penjagaan backend utuh**

Enam berkas diuji; tidak satu pun yang tak sah lolos:

| Berkas        | Tipe                       | Hasil                                                            |
| ------------- | -------------------------- | ---------------------------------------------------------------- |
| `bukti.png`   | image/png, 1 KB            | **201** diterima                                                 |
| `animasi.gif` | image/gif                  | 400 — _"Tipe berkas "image/gif" tidak diizinkan (hanya JPEG/PNG/WEBP/PDF)"_ |
| `gambar.svg`  | image/svg+xml              | 400 — ditolak (penting: SVG dapat memuat skrip)                  |
| `catatan.txt` | text/plain                 | 400 — ditolak                                                    |
| `program.exe` | application/x-msdownload   | 400 — ditolak                                                    |
| `besar.png`   | image/png, 6 MB            | 400 — _"Ukuran berkas "besar.png" melebihi 5MB"_                 |

Pesan galatnya menyebutkan tipe yang ditolak **dan** daftar yang diizinkan —
sudah cukup jelas bagi pengguna awam tanpa perlu menebak.

**Yang gagal** — seluruh penjagaan itu hanya ada di backend; sisi klien tidak
mencegah apa pun lebih dulu. Lihat [BUG-007](#bug-007).

---

### Sesi C-10 — Area Superuser

| Isi                  | Keterangan                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| **Tanggal**          | 2 September 2026                                                        |
| **Peran**            | Keempat peran, terhadap 7 rute terjaga                                  |
| **Cakupan tercapai** | Matriks proteksi rute (28 kombinasi) + kurungan area + penjagaan data   |
| **Temuan**           | 0 cacat                                                                 |

**Lapis 1 — penjagaan navigasi (`proxy.js`), 28 kombinasi peran × rute**

Seluruhnya sesuai rancangan. Yang paling penting:

| Rute                    | superuser | kabupaten             | opd                   | responden       |
| ----------------------- | --------- | --------------------- | --------------------- | --------------- |
| `/admin-kab/audit-logs` | MASUK     | → `/admin-kab/dashboard` | → `/admin-opd/dashboard` | → `/dashboard` |
| `/admin-kab/users`      | MASUK     | → `/admin-kab/dashboard` | → `/admin-opd/dashboard` | → `/dashboard` |
| `/pilih-peran`          | MASUK     | dipantulkan           | dipantulkan           | dipantulkan     |

**Lapis 2 — penjagaan data (URL API dipaksa langsung)**

Ini yang menentukan, karena proxy hanyalah penjaga navigasi yang bisa ditembus
siapa pun yang menyunting cookie di perambannya sendiri:

| Endpoint              | superuser | kabupaten | opd     | responden |
| --------------------- | --------- | --------- | ------- | --------- |
| `GET /api/v1/audit-logs` | 200       | **403**   | **403** | **403**   |
| `GET /api/v1/users`      | 200       | **403**   | **403** | **403**   |

Backend menolak semuanya. **Proxy bukan satu-satunya pertahanan** — inilah hasil
terpenting sesi ini.

**Kurungan area superuser** — bekerja sebagaimana dirancang:

| Rute                   | tanpa area | area=kabupaten | area=opd (opd=1) | area=responden |
| ---------------------- | ---------- | -------------- | ---------------- | -------------- |
| `/admin-kab/dashboard` | MASUK      | MASUK          | dipantulkan      | dipantulkan    |
| `/admin-opd/dashboard` | dipantulkan | dipantulkan   | **MASUK**        | dipantulkan    |
| `/dashboard`           | MASUK      | dipantulkan    | dipantulkan      | MASUK          |
| `/pilih-peran`         | MASUK      | MASUK          | MASUK            | MASUK          |

Ini menjawab pertanyaan charter: superuser **memang bisa** membuka dashboard OPD
(`49ad3d8`), tetapi hanya setelah memilih OPD. Tanpa itu ia dipantulkan —
perilaku yang benar, meski **tanpa penjelasan apa pun** kepada penggunanya.
`/pilih-peran` tetap terbuka di semua area, sesuai rancangan: itu satu-satunya
jalan berpindah tanpa logout.

**Dua jebakan metode yang layak dicatat** — keduanya sempat menghasilkan
kesimpulan palsu sebelum ketahuan:

1. **Batas laju 100 permintaan/60 detik.** Sapuan rute otomatis menembusnya di
   tengah jalan; `/auth/me` membalas 429, aplikasi menyimpulkan sesi mati, dan
   semua rute berikutnya memantul ke `/` **seolah-olah penjagaan akses yang
   bekerja**. Sejak itu setiap 429 dicatat terang-terangan.
2. **Cookie saja tidak cukup untuk memalsukan sesi.** Cookie dibaca `proxy.js`
   di edge, tetapi `api.js` mengambil token dari `localStorage`. Tanpa keduanya,
   rute PERTAMA lolos lalu sisanya memantul — bukan karena hak akses, melainkan
   karena aplikasi menghapus sesinya sendiri setelah `/auth/me` menolak.

Keduanya bukan cacat produk, melainkan sifat lingkungan yang wajib diketahui
siapa pun yang mengotomatiskan pengujian rute di proyek ini.

**Belum tercakup**

- C-09 (alur masuk SSO) **terkunci**: `HELPDESK_SSO_CLIENT_ID` dan
  `CLIENT_SECRET` masih kosong menunggu Diskominfo, dan `SsoService` membalas
  `ServiceUnavailableException`. Tidak dapat diuji siapa pun sampai kredensial
  tersedia.
- Log aktivitas superuser: apakah pelakunya tercatat benar — belum diperiksa.

### Sesi C-04 — Proteksi route & peralihan peran

| Isi                  | Keterangan                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| **Tanggal**          | 2 September 2026                                                            |
| **Peran**            | Tanpa sesi, responden, opd, kabupaten                                       |
| **Cakupan tercapai** | Matriks A.5.1 (32 kombinasi, diotomatiskan) + 3 probe yang tak bisa diotomatiskan lewat tabel |
| **Temuan**           | 0 cacat · 1 catatan rancangan (CAT-007)                                     |

**Matriks A.5.1** — 8 rute × 4 kondisi peran, seluruhnya sesuai. Kini terkunci
otomatis di `apps/web/e2e/proteksi-route.spec.js`, jadi baris `proxy.js` yang
hilang atau tertukar urutannya akan langsung memerahkan suite.

**Probe 1 — pengguna menyunting cookie `role` miliknya sendiri.** Masuk sebagai
warga, lalu cookie `role` diubah `responden` → `kabupaten` lewat DevTools. Token
tetap milik warga.

| Halaman                | Terbuka? | Yang terjadi pada datanya                                        |
| ---------------------- | -------- | ----------------------------------------------------------------- |
| `/admin-kab/dashboard` | ya       | `GET /dashboard/ikm` → **403**, halaman menampilkan galat          |
| `/admin-kab/opd`       | ya       | 10 baris tampil — `GET /opd` memang terbuka bagi **semua peran terautentikasi** (`opd.controller.ts:37`), termasuk warga |

Kesimpulannya: proxy memang **hanya penjaga navigasi** dan bisa ditembus siapa
pun di perambannya sendiri, tetapi **tak ada data istimewa yang bocor**. Yang
tampil di `/admin-kab/opd` adalah daftar yang formulir survei di beranda publik
pun memakainya. Endpoint yang benar-benar istimewa menolak. Dicatat sebagai
**CAT-007**, bukan bug.

**Probe 2 — logout lalu tombol Back.** *Dugaan awal saya keliru dan sudah
dikoreksi.* Pemeriksaan pertama menyimpulkan halaman `/profile` "masih tampil"
sesudah logout — padahal yang cocok hanyalah judul halamannya. Penelusuran
lanjutan menunjukkan keadaan sebenarnya:

| Yang diperiksa sesudah menekan Back            | Hasil                       |
| ----------------------------------------------- | ---------------------------- |
| Nama pengguna masih terlihat?                   | **tidak**                    |
| Surel akun masih terlihat?                      | **tidak**                    |
| Halaman tampak sebagai "sudah masuk"?           | **tidak**                    |
| `GET /auth/me` dari halaman itu                 | **401** — sesi memang mati   |

Tidak ada cacat. Yang tersisa hanyalah kerangka halaman kosong; React sudah
membersihkan datanya dan sesinya benar-benar berakhir.

**Probe 3 — dua tab, dua peran.** Tab 1 dibiarkan terbuka sebagai warga, tab 2
keluar lalu masuk sebagai Admin Kabupaten. Cookie dipakai bersama, jadi sesi tab
1 ikut berganti. Saat tab 1 dipakai lagi, ia dipantulkan ke `/admin-kab/dashboard`
dan menampilkan identitas yang **benar** ("Admin Kabupaten"), tanpa satu pun
panggilan API yang ditolak. Berperilaku benar. Satu-satunya ketidaksempurnaan —
layar lama di tab 1 masih menyapa warga sampai tab itu disentuh — melekat pada
setiap aplikasi web bertab banyak dan tak layak dicatat sebagai cacat.

**Catatan metodologi.** Percobaan pertama probe 3 gagal karena premis saya
sendiri salah: saya mengira bisa langsung masuk sebagai peran lain di tab kedua,
padahal peramban sudah memegang sesi warga sehingga navbar menampilkan avatar,
bukan tombol masuk. Skenario yang mungkin dilakukan pengguna adalah keluar dulu —
dan itulah yang akhirnya diuji.

---

### Sesi C-11 — Sapuan seluruh halaman

| Isi                  | Keterangan                                                          |
| -------------------- | --------------------------------------------------------------------- |
| **Tanggal**          | 2 September 2026                                                      |
| **Peran**            | Tanpa sesi, warga, opd, kabupaten, superuser                          |
| **Cakupan tercapai** | 35 halaman — seluruh rute `src/app/**/page.jsx` yang dapat dijangkau |
| **Temuan**           | 1 cacat nyata ([BUG-008](#bug-008)) · 6 alarm palsu                   |

Tiap halaman dibuka dengan peran yang berhak, memakai id nyata untuk rute
berparameter, sambil merekam galat konsol, panggilan API yang gagal, penanda
galat yang terlihat pengguna, dan halaman yang nyaris kosong.

Tujuh halaman tertandai. Ketujuhnya diperiksa ulang satu per satu, dan **enam di
antaranya bukan cacat aplikasi** — bagian ini justru yang paling berharga dari
sesi ini, karena melaporkannya sebagai bug akan membuang waktu tim.

| Halaman                       | Tanda awal          | Sesudah diperiksa ulang                                                |
| ----------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `/` tanpa sesi                | 401 di 3 endpoint   | **CACAT NYATA** → [BUG-008](#bug-008)                                   |
| `/complaints/{tiket}` (warga) | 502 di 3 endpoint   | Gangguan sesaat — pemeriksaan ulang: seluruh API berhasil               |
| `/admin-opd/dashboard`        | 502 di 2 endpoint   | Gangguan sesaat — pemeriksaan ulang: seluruh API berhasil               |
| `/admin-opd/complaints/184`   | 404                 | **Salah skrip saya** — rute ini menerima `ticketNo`, bukan id numerik   |
| `/admin-kab/complaints/184`   | 404                 | **Salah skrip saya** — sama seperti di atas                            |
| `/admin-opd/surveys/336`      | dialihkan           | **Memang dirancang** — Admin OPD tak punya halaman detail survei; alasannya tertulis di kode sumbernya |
| `/admin-kab/users/24/edit`    | batas waktu 45 detik | **Kompilasi dingin `next dev`** — kunjungan kedua: 3,4 detik           |

**Tiga jenis alarm palsu yang perlu diingat pada sesi berikutnya:**

1. **502 sesaat dari gateway.** Beberapa endpoint yang tak berhubungan gagal
   serentak — pertanda gangguan sisi server, bukan cacat halaman. Selalu ulangi
   sebelum melaporkan.
2. **Parameter URL yang salah bentuk.** Rute detail pengaduan admin menerima
   `ticketNo`, sedangkan daftarnya mengembalikan `id` numerik juga. Memakai yang
   keliru menghasilkan 404 yang tampak persis seperti cacat.
3. **Kompilasi dingin `next dev`.** Kunjungan pertama ke rute berat bisa melebihi
   batas waktu. Gejalanya menyesatkan karena yang gagal **berpindah-pindah** tiap
   kali dijalankan — begitu satu rute terkompilasi, giliran rute berikutnya.

---

### Sesi C-13 — Gerbang persetujuan PDP

| Isi                  | Keterangan                                                     |
| -------------------- | ---------------------------------------------------------------- |
| **Tanggal**          | 2 September 2026                                                 |
| **Peran**            | Warga, Admin Kabupaten, Admin OPD                                |
| **Cakupan tercapai** | Penjagaan cookie & pemantulan peran — **formulir persetujuannya sendiri terkunci** |
| **Temuan**           | 0 cacat                                                          |

**Terkunci lebih dulu, dan perlu dikatakan di muka.** Gerbang hanya muncul bagi
`responden` yang `consentAt`-nya masih kosong. Satu-satunya akun responden di
basis data pengembangan sudah menyetujui (`consentRequired: false`), dan akun
responden baru **tak dapat dibuat lewat jalur mana pun yang dicapai frontend**:
`CreateUserDto` hanya menerima peran admin (`opd`/`kabupaten`/`superuser`), dan
`dev-login` membalas 404 untuk identifier yang belum terdaftar — ia tidak
membuat akun. Jadi kotak centang, tombol "Setuju & Lanjutkan", dan jalur
penolakannya belum teruji sama sekali. Yang dibutuhkan: satu akun responden
seed tanpa persetujuan — pekerjaan seed/backend.

**Yang tetap dapat dibuktikan** justru bagian paling rawan, karena cookie
`consent` ada di tangan pengguna:

| Yang diuji                                              | Hasil                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Cookie `consent` dihapus, lalu buka `/complaints`         | Dipantulkan ke `/persetujuan` — proxy bekerja                          |
| Cookie **dan** cerminan localStorage dihapus, buka `/surveys` | Tetap dipantulkan ke `/persetujuan`                                |
| Gerbang lalu memeriksa `GET /auth/me`                     | Melihat persetujuan tak diperlukan, memulihkan cookie, meneruskan ke `/dashboard` |
| Admin Kabupaten & Admin OPD membuka `/persetujuan`        | Keduanya dipantulkan ke berandanya masing-masing                       |
| Logout, lalu periksa sisa persetujuan                     | Cookie `consent` dan cerminannya **dibuang** — warga berikutnya di peramban yang sama wajib menyetujui sendiri |

Kesimpulannya: **cookie basi tak dapat membuka gerbang, dan tak dapat mengurung
pengguna di dalamnya.** Sumber kebenarannya API, persis seperti yang diklaim
komentar pada `persetujuan/page.jsx`. Baris terakhir tabel adalah yang paling
penting bagi privasi, dan ia lulus.

**Catatan metodologi — alarm palsu ketiga dari sebab yang sama.** Jalan pertama
probe ini menyimpulkan warga tanpa cookie `consent` **tidak** dipantulkan. Salah.
Halaman dilayani dari **cache peramban**, sehingga navigasinya tak pernah sampai
ke server dan proxy tak pernah ditanya. Dengan cache dimatikan, pemantulannya
terjadi persis seperti seharusnya. Ini kali ketiga cache peramban menghasilkan
kesimpulan palsu pada sesi-sesi ini — lihat juga TEST_CASES §Y.4.

---

**Bagian FORMULIR dijalankan 3 September 2026 — 10 probe, nol temuan.**

Yang menahannya selama ini bukan kesulitan teknis melainkan ketiadaan fixture:
gerbang hanya muncul bagi responden ber-`consentAt` kosong, dan tak ada satu pun
di dev. User menyediakan `warga@gmail.com` (id 21).

> ⚠️ **Fixture sekali pakai, dan itu menentukan urutan kerjanya.**
> `POST /auth/consent` hanya menulis; `ConsentService.record` mengembalikan nilai
> lama bila sudah terisi, dan tak ada endpoint reset. Sembilan probe yang tak
> menghabiskan fixture dikerjakan lebih dulu; penerimaan sungguhan paling akhir.
> Probe kegagalan pencatatan dijalankan dengan mencegat permintaannya **di
> peramban**, sehingga backend tak pernah tersentuh dan fixture tetap utuh —
> diperiksa langsung sesudahnya lewat `GET /auth/me` (`consentRequired` masih true).

| Probe | Yang diuji                                | Hasil                                                                |
| :---: | ----------------------------------------- | -------------------------------------------------------------------- |
|   1   | Masuk sebagai warga tanpa persetujuan     | ✅ dipantulkan ke `/persetujuan`                                     |
|   2   | Isi gerbang                               | ✅ 4 rincian PDP, rujukan UU 27/2022, **0** tautan keluar ke area warga |
|   3   | Kunci tombol ↔ kotak centang              | ✅ terkunci → aktif → **terkunci lagi** saat centang dibatalkan        |
|   4   | Aksesibilitas kotak centang               | ✅ label tertaut, `aria-describedby`, target sentuh 80px lewat label   |
|   5   | Kiriman tanpa persetujuan                 | ✅ **403** dengan pesan yang menyebut halaman Persetujuan             |
|   6   | Cookie `consent` dipalsukan `1`           | ✅ navigasi tembus, pengiriman **tetap 403**                          |
|   7   | `POST /auth/consent` gagal 500            | ✅ `role="alert"` + fokus pindah, tetap di gerbang, **tak tercatat**   |
|   8   | Menyetujui sungguhan                      | ✅ ke `/dashboard`, `consentRequired` false, cookie `consent=1`        |
|   9   | `/persetujuan` sesudah menyetujui         | ✅ dipantulkan ke `/dashboard`                                        |
|  10   | Kiriman sesudah menyetujui                | ✅ **201**                                                            |

**Probe 5 & 6 membuktikan klaim yang selama ini hanya berupa komentar.**
`ConsentGate.jsx` menyatakan halaman itu "pembatas NAVIGASI, dan penegakan
sesungguhnya ada di backend". Probe 6 mengujinya dengan cara paling tak
bersahabat — memalsukan cookie `consent` menjadi `1` — dan hasilnya persis
seperti yang dijanjikan: halaman warga terbuka, tetapi
`POST /surveys/:id/responses` tetap 403. Melewati gerbang hanya menghasilkan
halaman yang gagal mengirim.

**Sisa jejak — sudah dibersihkan 3 September 2026.** Probe 10 meninggalkan satu
respons uji pada survei fixture `[UJI E2E]` (#336), dan `warga@gmail.com` berubah
menjadi sudah menyetujui. Keduanya dikembalikan lewat basis data: responsnya
dihapus, `consentAt` disetel `null` kembali.

> **Koreksi.** Kalimat sebelumnya menyebut persetujuan itu "tak dapat
> dikembalikan". Itu benar **lewat aplikasi** — `POST /auth/consent` hanya
> menulis dan tak ada endpoint reset — tetapi tidak benar lewat basis data.
> Akun responden tanpa persetujuan kini tersedia lagi sebagai fixture, sehingga
> gerbang PDP dapat diuji ulang tanpa menunggu seed responden baru.

---

### Sesi C-12 — Analisis & ekspor

| Isi                  | Keterangan                                                          |
| -------------------- | --------------------------------------------------------------------- |
| **Tanggal**          | 2 September 2026                                                      |
| **Peran**            | Admin OPD, Admin Kabupaten, Superuser                                 |
| **Cakupan tercapai** | Konsistensi IKM lintas tiga endpoint + ketiga format ekspor + tab pengaduan |
| **Temuan**           | 0 cacat                                                               |

Halaman ini tak pernah disebut sekali pun di dokumen pengujian sebelum hari ini.
Pertanyaan pokoknya bukan "apakah tampil", melainkan **apakah angkanya
konsisten** — tiga layar berbeda mengaku menghitung IKM dari data yang sama, dan
pengelola yang melihat dua angka berbeda untuk hal yang sama tak punya cara tahu
mana yang benar.

**Konsistensi IKM.** Tujuh survei layak diperiksa satu per satu:

| Survei | Unsur IKM | Responden | `nilaiIkm` | Papan peringkat Kabupaten |
| ------ | :-------: | :-------: | :--------: | -------------------------- |
| 24     | 9         | 2         | 77,78 (B)  | peringkat 1 — **cocok persis** |
| 22     | 9         | 1         | 77,78 (B)  | peringkat 2 — **cocok persis** |
| 332–336 | 0        | 0–34      | `null`     | dikecualikan               |

Pengecualian itu **benar, bukan cacat**: IKM hanya bermakna bagi survei yang
disusun dari 9 unsur baku. Karena itu `totalResponden` pada dasbor Kabupaten
(3) memang lebih kecil daripada jumlah seluruh responden di semua survei (38) —
ia menghitung responden survei ber-IKM, sebagaimana mestinya sebuah papan
peringkat IKM.

**Yang paling penting bagi pengguna:** survei tanpa unsur IKM ditampilkan
sebagai **"Belum dapat dinilai"**, bukan angka **0**. Pada skala IKM, 0 berarti
pelayanan terburuk — menampilkannya untuk "belum ada data" akan memfitnah OPD
yang bersangkutan. Antarmukanya jujur.

**Ekspor.** Ketiganya diuji dari peramban sungguhan, bukan hanya lewat API, dan
isi berkasnya diperiksa — bukan sekadar status HTTP-nya:

| Format | Content-Type                        | Isi berkas                     | Nama berkas                        |
| ------ | ----------------------------------- | ------------------------------ | ---------------------------------- |
| CSV    | `text/csv; charset=utf-8`           | teks CSV berjudul "Laporan Hasil IKM" | `hasil-ikm-336-2026-Q3.csv`  |
| Excel  | `application/vnd.openxmlformats-…`  | **arsip ZIP/XLSX asli**        | `hasil-ikm-336-2026-Q3.xlsx`       |
| PDF    | `application/pdf`                   | **diawali `%PDF`**             | `hasil-ikm-336-2026-Q3.pdf`        |

Pemeriksaan isi ini disengaja: proyek ini pernah punya tombol "PDF" yang
sebenarnya mengunduh berkas teks (lihat catatan pada `handleExportPDF` di
halaman daftar pengaduan). Status 200 saja tak membuktikan formatnya benar.

**Catatan data uji — sudah dibersihkan 3 September 2026.** Survei fixture E2E
(id 336) sempat menumpuk sampai **40 respons**, bertambah dua tiap kali suite E2E
dijalankan. Seluruh responsnya dihapus pada 3 September, dan **survei-nya sendiri
menyusul pada 4 September** atas permintaan penguji. Itu tidak melumpuhkan suite:
`globalSetup` (`e2e/support/api.js`, `pastikanSurveiUji()`) membuatnya kembali
secara otomatis pada `pnpm test:e2e` berikutnya — dengan id baru, dan akan
kembali menumpuk respons kalau tak dibersihkan lagi.

Angka IKM memang tak pernah terganggu — survei itu tanpa unsur IKM, jadi selalu
dikecualikan. Yang terganggu adalah **halaman `/statistics` publik**, dan itu
baru terlihat setelah dihitung:

| Angka `/statistics`  | Sebelum dibersihkan | Sesudah | Isi sebenarnya                    |
| -------------------- | ------------------: | ------: | --------------------------------- |
| `totalRespondents`   | 44                  | **3**   | 41 di antaranya respons uji       |
| `totalComplaints`    | 11                  | **6**   | 5 di antaranya pengaduan uji      |
| `completionRate`     | 36,36 %             | **50 %**| ikut bergeser karena pembilangnya |

Pelajarannya bukan "jangan menulis ke basis data" — E2E memang harus menembus
sampai ke sana supaya buktinya sahih — melainkan bahwa **sisa pengujian ikut
terbaca sebagai angka resmi di halaman publik**, dan karena itu harus dibersihkan
sebagai bagian dari pengujian, bukan sesudahnya kalau sempat.

---

---

### Sesi C-05 — Form buat akun admin

**Dijalankan:** 3 September 2026 · **Peran:** Superuser · **Hasil:** 1 temuan
([BUG-009](#bug-009), Medium) · **TC terkait:** TC-FE-044 ✅

**Dasar kecurigaan charter ternyata sudah usang.** Charter ini ditulis ketika
formulirnya masih meminta `phone` (kolom yang tak pernah ada di skema backend)
dan ketika sakelar `isActive` belum tersambung ke mana pun. Keduanya sudah
diperbaiki tim: `phone` dihapus, dan `isActive` kini benar-benar bekerja lewat
panggilan status susulan. Sesi ini karena itu menguji yang tersisa — **termasuk
satu risiko yang lahir justru dari perbaikan itu.**

| Probe | Yang diuji                                  | Hasil                                                                          |
| :---: | ------------------------------------------- | ------------------------------------------------------------------------------ |
|   1   | Peran Admin OPD tanpa memilih OPD           | ✅ ditahan di formulir, pesan "Silakan pilih instansi / OPD."                   |
|   2   | Surel yang sudah terdaftar                  | ✅ ditolak, pesan backend ditampilkan apa adanya                                |
|   3   | Sakelar "Aktif" dimatikan                   | ✅ tersimpan `isActive=false` — dua panggilan berurutan, keduanya berhasil       |
|   4   | Panggilan **kedua** gagal sendirian         | ❌ [BUG-009](#bug-009) — akun terlanjur dibuat dan aktif, admin tak diberi tahu |

**Dua kekeliruan saya sendiri, dicatat supaya tak terulang.**

1. *Percobaan pertama gagal masuk.* Skrip menunggu superuser mendarat di
   `/admin-kab/dashboard`; superuser justru ditahan pada pemilih peran
   (`SSOLoginButton.jsx:73`). Jalan keluarnya bukan berpindah ke
   `admin.kabupaten@example.go.id`: `proxy.js:54` menaruh `/admin-kab/users` di
   `SUPERUSER_ONLY_PREFIXES`, sehingga Admin Kabupaten biasa dipantulkan dari
   halaman yang hendak diuji. **Superuser + memilih area "Admin Kabupaten"
   adalah satu-satunya jalan masuk.**
2. *Locator salah.* Peran dipilih lewat komponen `Dropdown` (tombol `#role` plus
   panel berisi `<button>`), bukan `<select>`, dan sakelarnya ber-`role="switch"`.

**Pembersihan.** Dua akun uji yang tercipta (`uji.c05.c.*`, `uji.c05.d.*`)
dihapus lewat `DELETE /users/:id` sesudah sesi selesai.

---

### Sesi C-06 — Daftar & sinkronisasi OPD pada volume nyata

**Dijalankan:** 3 September 2026 · **Peran:** Superuser (area Kabupaten) ·
**Hasil:** 3 temuan + 1 catatan · **TC terkait:** TC-FE-049 🟡

**Tombol sinkronisasi sungguhan tidak ditekan.** `POST /opd/sync` menarik data
dari Helpdesk dan dapat **menonaktifkan** OPD yang tak lagi ada di sumbernya —
perubahan pada basis data pengembangan bersama yang tak bisa dibatalkan dari
sini. Yang perlu diuji adalah bagian frontend-nya (bagaimana laporan dan
kegagalannya ditampilkan), dan itu dihasilkan dengan memalsukan jawaban lewat
pencegatan rute. Tak satu baris pun di basis data tersentuh.

| Probe | Yang diuji                                  | Hasil                                                             |
| :---: | ------------------------------------------- | ----------------------------------------------------------------- |
|   1   | 62 OPD terjangkau paginasi                  | ✅ 62/62 unik dalam 7 halaman; indikator cocok dengan backend      |
|   2   | Pencarian nama & kode                       | ✅ tak peka huruf besar-kecil · ❌ [BUG-011](#bug-011) soal spasi   |
|   3   | Menyaring mengembalikan ke halaman 1        | ✅ dari halaman 3 kembali ke baris 1                               |
|   4   | Penyaring "Jenis Layanan"                   | ⚠️ [CAT-011](#cat-011) — tak pernah bisa menyaring apa pun         |
|   5   | Laporan sinkron berhasil                    | ❌ [BUG-012](#bug-012) — angka `skipped` tak ditampilkan            |
|   6   | Sinkron gagal 503                           | ✅ diberitahukan, tabel lama tak dibuang, tombol bisa ditekan lagi  |
|   7   | Nama tombol paginasi                        | ❌ [BUG-010](#bug-010) — dua tombol tanpa nama sama sekali          |

**Probe 2 harus diulang karena hasil pertamanya tidak sah.** Ia menghitung
`tbody tr`, padahal keadaan kosong `OPDTable` **juga sebuah `<tr>`**
("Tidak ada data OPD yang ditemukan.", `OPDTable.jsx:123-129`). Akibatnya setiap
kasus mengembalikan angka 1 — baik ketika benar-benar menemukan satu OPD maupun
ketika tak menemukan apa pun — dan ketujuh kasus tampak seragam. Hasilnya
kebetulan terlihat menenangkan, dan justru itu bahayanya: **laporan bersih yang
tak berdasar sama sekali.** Pengulangannya mengecualikan baris keadaan-kosong,
memakai kata kunci yang cocok dengan 18 OPD (bukan 1) supaya angka nolnya tak
bisa tertukar, dan membandingkan dengan hitungan dari backend.

**Catatan volume.** 62 OPD, sementara halaman ini mengambil `limit: 100` **sekali**
lalu menyaring dan memaginasi di peramban (`page.jsx:14`). Hari ini aman dengan
sisa 38, tetapi begitu jumlah OPD melewati 100, kelebihannya takkan muncul di
tabel **maupun di pencarian** — dan tak ada apa pun di layar yang akan
memberitahukannya.

---

### Sesi C-07 — Profil responden & pemakaian ulang data (FR-AUTH-05)

**Dijalankan:** 3 September 2026 · **Peran:** Warga · **Hasil:** 1 catatan
([CAT-010](#cat-010))

FR-AUTH-05 berbunyi: *"Data profil responden dipakai ulang otomatis pada setiap
survei/pengaduan baru (tidak isi ulang)."* Sesi ini memeriksa kedua sisinya.

**Sisi "tidak isi ulang" — terpenuhi.** Formulir survei tak meminta satu pun
label identitas (NIK, nama, telepon, alamat, jenis kelamin, pendidikan,
pekerjaan, umur), dan formulir pengaduan hanya meminta OPD, kategori,
sub-kategori, judul, dan uraian. Respons survei yang tersimpan pun tak memuat
`userId` sama sekali — SKM memang dirancang anonim.

**Sisi "data profil" — kosong, dan tak ada cara mengisinya.** Halaman profil
sepenuhnya baca-saja: nol `<input>`, nol `<select>`, nol tombol ubah, dan
berlencana "Read-Only". Lihat [CAT-010](#cat-010).

Tiga dari enam kolom biodata (NIK, telepon, alamat domisili) bernilai `-` bagi
setiap warga karena backend memang tak punya kolomnya. **Ini bukan temuan:**
kartunya sendiri sudah menyatakannya terus terang — *"Kolom bertanda '-' belum
tersedia karena tidak disimpan sistem"* — dan `me.adapter.js` menandai
masing-masing sebagai gap yang disengaja, bukan nilai yang dikarang.

---

### Sesi C-08 — Ketahanan saat backend bermasalah

**Dijalankan:** 3 September 2026 · **Peran:** Superuser & Warga ·
**Hasil: tidak ada cacat** · **TC terkait:** TC-FE-048 ✅

**Backend sungguhan tidak dimatikan.** Ia milik lingkungan pengembangan bersama.
Yang perlu diuji adalah perilaku frontend ketika jawaban tak datang, dan itu
dihasilkan persis dengan mencegat permintaannya di peramban — cara yang justru
lebih tajam, karena bisa menjatuhkan **satu** endpoint saja atau menunda jawaban
tanpa menggagalkannya, dua keadaan yang mustahil dibuat dengan mencabut seluruh
backend. `/auth/me` sengaja dibiarkan lewat: kalau ia ikut dijatuhkan, aplikasi
menganggap sesinya batal dan yang teruji berubah menjadi alur logout.

| Probe | Yang diuji                                        | Hasil                                                       |
| :---: | ------------------------------------------------- | ----------------------------------------------------------- |
|   1   | Enam halaman admin saat seluruh data gagal 503    | ✅ semuanya: pesan galat + tombol "Coba Lagi"                |
|   2   | "Coba Lagi" sesudah backend pulih                 | ✅ benar-benar memulihkan halaman                            |
|   3   | Pengiriman survei ditolak 503                     | ✅ pesan tampil, **seluruh jawaban bertahan**, bisa diulang  |
|   4   | Empat klik kirim pada jaringan ditahan 5 detik    | ✅ tepat **1** `POST /responses` (respons 34 → 35)           |

**Satu "temuan" dibatalkan setelah diperiksa ulang.** Sapuan Probe 1 mula-mula
melaporkan Log Aktivitas "terkunci pada Memuat...". Kode halamannya jelas
menangani galat (`isLoading → error → ErrorState`), jadi kesimpulan itu
berselisih dengan yang tertulis. Pemeriksaan ulang dengan rute yang dipanaskan
lebih dahulu memberi jawabannya: **kompilasi dingin `next dev` memakan 182 detik**
pada kunjungan pertama, sementara sapuan hanya menunggu 4 detik. Sesudah panas,
pesan galatnya muncul dalam 2,4 detik beserta tombol "Coba Lagi". Ini kali
**ketiga** kompilasi dingin menghasilkan tuduhan palsu — lihat §Y.3 di
`TEST_CASES.md`.

**Probe 3 & 4 juga harus diulang.** Percobaan pertama menekan keempat `<input
type="radio">` sekaligus di layar pertama lalu mencari tombol "Kirim".
Pengisian survei berupa **wizard satu pertanyaan per layar**, dan opsinya
`<input class="hidden peer">` di dalam `<label>` (`RadioCard.jsx`) yang tak dapat
diklik langsung. Hasilnya nol `POST` terkirim — tetapi laporannya berbunyi
"pengiriman gagal tanpa pemberitahuan" dan "jawaban hilang", **dua tuduhan berat
terhadap kode yang tak pernah dijalankan sama sekali.** Pengulangannya menyalin
alur `e2e/isi-survei.spec.js` yang sudah terbukti, dan menambahkan penjaga:
setiap probe kini menghitung `POST` yang benar-benar terkirim, lalu menolak
mengambil kesimpulan apa pun bila angkanya nol.

---

## 5. Catatan yang bukan cacat produk

Bagian ini menampung hal-hal yang tidak berdampak langsung ke pengguna,
sehingga tidak diberi nomor `BUG`, tetapi tetap perlu diketahui tim.

### CAT-001 — Uji frontend tidak pernah dijalankan oleh CI

`.gitlab-ci.yml` menjalankan `pnpm --filter @skm-spm/api test` dan `test:e2e`
untuk backend, serta `web:lint` dan `web:build` untuk frontend — tetapi
**tidak ada job yang menjalankan `pnpm --filter @skm-spm/web test`**.

**Diperiksa ulang 2 September 2026: masih belum ada.** Jumlah ujinya kini 57
(bukan 46 lagi), dan tetap tidak satu pun dijalankan oleh CI. Perlindungannya
terhadap regresi masih bergantung pada kebiasaan, bukan pada proses.

Ini menjadi lebih penting daripada bulan lalu. Dua dari sepuluh kegagalan yang
ditemukan hari ini baru ketahuan setelah 81 commit menumpuk — kalau CI
menjalankannya, keduanya akan ketahuan di commit yang menyebabkannya.

Perbaikannya sekitar lima baris di `.gitlab-ci.yml`, mengikuti pola job
`web:lint` yang sudah ada.

### CAT-002 — Pertanyaan desain keamanan — **sebagian besar sudah terjawab**

Ketiga pertanyaan berikut diajukan pada 12 Agustus 2026, saat SSO Helpdesk
belum ada. SSO kini terpasang (`d8d8ada`, 27 Agustus 2026), dan jawabannya
datang dengan sendirinya:

| Pertanyaan 12 Agustus            | Keadaan 2 September 2026                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Logout tidak menggugurkan token  | **Terjawab.** `POST /auth/logout` kini nyata — menghapus cookie `session` HttpOnly yang diterbitkannya, dan mencatat aksinya ke audit         |
| Token disimpan di `localStorage` | **Terjawab untuk jalur SSO.** Lewat SSO tidak ada token di sisi klien sama sekali; yang tersimpan hanya `role`, `expiresAt`, dan penanda masuk |
| Cookie sesi bukan `HttpOnly`     | **Terjawab.** Cookie `session` terbitan SSO bersifat HttpOnly dan tak dapat disentuh JavaScript                                              |

Yang **masih tersisa**: jalur `POST /auth/dev-login` tetap ada dan masih
menyimpan token di `localStorage` serta cookie non-HttpOnly
([authStorage.js](../apps/web/src/features/authentication/services/authStorage.js)).
Itu wajar untuk pengembangan, dan endpoint-nya dijaga `NonProductionGuard`.
Yang perlu dipastikan ke tim hanya satu: **penjaga itu benar-benar aktif di
produksi**, sehingga jalur token-di-localStorage tidak pernah bisa dipakai
pengguna sungguhan. Ini pemeriksaan konfigurasi, bukan cacat.

Perlu dicatat juga bahwa TC-FE-015 di TEST_CASES.md ditulis untuk keadaan lama
dan sudah disesuaikan pada revisi hari ini.

### CAT-003 — Galat `jw is not defined` di Console

Muncul berulang pada `VM1058`, `VM1059`, `VM1060` saat membuka aplikasi.
**Bukan berasal dari kode aplikasi**: penanda `VM` menunjukkan skrip yang
dievaluasi saat berjalan, bukan berkas milik proyek, dan penelusuran seluruh
`apps/web/src` tidak menemukan pengenal `jw` di satu berkas sumber pun (satu-satunya
kecocokan ada di dalam `app/icon.png`, kebetulan urutan byte pada berkas gambar).

Hampir pasti berasal dari ekstensi peramban. Cara memastikannya: buka aplikasi
di jendela Samaran dengan semua ekstensi nonaktif — bila galatnya hilang,
tuntas. Tidak perlu ditindaklanjuti sebagai cacat produk.

### CAT-004 — Duplikasi survei belum menyalin opsi jawaban (untuk Fase 3)

Ditemukan saat memastikan hasil sesi C-01, dan **berada di wilayah backend**,
di luar lingkup pengujian frontend saya. Dicatat semata sebagai pengingat
supaya tidak terlewat nanti.

`duplicate()` di
[surveys.service.ts:178-186](../apps/api/src/modules/surveys/surveys.service.ts#L178-L186)
menyalin `teks`, `tipe`, `isIkmUnsur`, `kodeUnsur`, dan `urutan`, tetapi tidak
menyalin relasi opsi jawaban.

Saat ini tidak berdampak apa-apa, karena tipe `pilihan` memang belum bisa
dibuat (lihat [BUG-004](#bug-004)). Namun begitu Fase 3 aktif, menduplikasi
survei berpertanyaan Pilihan Ganda akan menghasilkan pertanyaan tanpa satu pun
opsi — dan backend sendiri mensyaratkan minimal dua. Lebih murah diketahui
sekarang daripada ditemukan setelah fiturnya rilis.

> **Naik status menjadi [BUG-005](#bug-005) pada 2 September 2026.** "Fase 3"
> sudah tiba: tipe Pilihan Ganda bisa dipakai, label skala tersuai juga
> disimpan sebagai opsi, dan `duplicate()` masih belum menyalinnya. Catatan ini
> ditinggalkan apa adanya sebagai jejak, bukan dihapus.

<a id="cat-005"></a>

### CAT-005 — Warga tak dapat membedakan admin mana yang membalas

Muncul dari sesi C-02, dan **bukan cacat** — dicatat sebagai pertanyaan produk.

Satu pengaduan dapat dibalas oleh Admin OPD, Admin Kabupaten, maupun Superuser.
Pada uji C-02 ketiganya membalas satu tiket yang sama (`authorId` 22, 1, dan 2).
Bagi warga, ketiganya tampil dengan nama pengirim yang sama: **"Admin"**.

Ini bukan kelalaian frontend. `ComplaintReplyEntity` hanya membawa `authorId`
berupa angka — tanpa nama, tanpa peran — sehingga
[`adaptComplaintReplyToChatMessage`](../apps/web/src/features/complaints/adapters/complaint.adapter.js)
tidak punya bahan untuk membedakannya. Perbaikan `3a1905c` justru mengganti
label lama `'Admin OPD'` menjadi `'Admin'` **supaya frontend berhenti mengklaim
peran yang bisa keliru**. Dengan data yang tersedia, itu pilihan paling jujur.

Yang perlu diputuskan pemilik produk: **apakah warga memang perlu tahu siapa
yang membalas?** Pada layanan pengaduan pemerintah, mengetahui bahwa jawaban
datang dari dinas terkait — bukan dari admin kabupaten yang meneruskan — bisa
jadi bagian dari akuntabilitas. Bila jawabannya ya, `ComplaintReplyEntity`
perlu ikut membawa nama/peran penulis, dan itu pekerjaan backend.

Selama belum diputuskan, keadaan sekarang aman: tidak ada informasi salah yang
ditampilkan, hanya informasi yang tidak ditampilkan.

### CAT-006 — Dua sisa kode mati

**Berkas kosong.** `apps/web/src/features/complaints/services/helpdesk.api.js`
berukuran **0 byte** dan tidak diimpor dari mana pun. Satu-satunya berkas kosong
di seluruh `src/`.

**Kunci localStorage yang hanya ditulis, tak pernah dibaca.** `sso_logged_in`
disetel di tiga tempat pada `authStorage.js` (dua kali `'true'` saat masuk, satu
kali `'false'` saat keluar) dan **tidak dibaca di satu berkas pun**.

Keduanya tidak berbahaya — perilaku aplikasi sama persis dengan atau tanpanya.
Dicatat karena sejenis [BUG-003](#bug-003): sisa yang menyesatkan pembaca kode
berikutnya. Seseorang yang melihat `helpdesk.api.js` wajar mengira ada integrasi
Helpdesk yang belum selesai di sisi pengaduan, padahal tidak ada.

---

### CAT-007 — Proxy dapat ditembus dengan menyunting cookie sendiri (memang begitu rancangannya)

Warga yang mengubah cookie `role` miliknya menjadi `kabupaten` lewat DevTools
**dapat membuka halaman admin**. Ini bukan celah yang terlewat, melainkan
konsekuensi rancangan yang tertulis jelas di `proxy.js`: proxy adalah penjaga
**navigasi**, dan keabsahan sesungguhnya ditegakkan backend pada setiap panggilan
API.

Dibuktikan pada sesi C-04 bahwa penjagaan datanya memang bekerja:
`GET /dashboard/ikm` menolak dengan **403** meski halamannya terbuka.

Yang tetap layak diketahui tim: **`/admin-kab/opd` terbuka penuh dengan 10 baris
data dan tanpa tanda apa pun bahwa ada yang tak beres**, sedangkan
`/admin-kab/dashboard` setidaknya menampilkan galat. Datanya sendiri tidak
istimewa — `GET /opd` memang terbuka bagi seluruh peran terautentikasi
(`opd.controller.ts:37`), dan formulir survei di beranda publik pun memakainya.
Jadi tak ada kebocoran.

Bobotnya rendah dan tak menuntut perbaikan: pengguna harus merusak perambannya
sendiri untuk sampai ke sana, dan tak ada yang bisa diperbuatnya di sana —
seluruh aksi pengelolaan OPD dijaga `@Roles(Role.kabupaten)` di backend.

---

### CAT-008 — Fixture MSW menyimpang dari bentuk API sungguhan

`src/mocks/handlers.ts` mengembalikan sub-kategori pengaduan dengan field
**`kategori`**, sedangkan API sungguhan memakai **`kategoriKode`** — diverifikasi
dua lapis: `complaint-sub-category.entity.ts:13` dan pemanggilan langsung ke
`GET /ref/complaint-sub-categories` di lingkungan pengembangan.

`CreateComplaintForm.jsx` menyaring dengan `s.kategoriKode === kategori terpilih`,
jadi **kode produksinya benar dan fixture-nyalah yang salah.**

Bukan cacat produk — tak seorang pengguna pun terpengaruh. Dicatat karena
inilah jenis kekeliruan mock yang paling mahal: uji yang bersandar padanya
melaporkan dropdown sub-kategori "tak pernah muncul", dan penguji yang
mempercayainya akan membuka laporan bug atas fitur yang sebenarnya sehat.
Sudah diperbaiki agar mencerminkan API sungguhan.

---

### CAT-009 — Penyiapan Jest melumpuhkan `File`, membuat seluruh permukaan lampiran mustahil diuji

`jest.setup.js` mengambil `File` dari `undici`:

```js
const { fetch, Headers, Request, Response, FormData, File } = require('undici');
global.File = File;
```

Sejak **undici 8** (proyek ini memakai 8.10.0) `File` tak lagi diekspor dari
sana, sehingga nilainya `undefined` — dan menugaskannya ke `global.File`
**menimpa implementasi jsdom yang sebenarnya berfungsi.**

Akibatnya setiap uji yang membangun sebuah berkas gagal dengan
`TypeError: File is not a constructor`, pesan yang menuding uji-nya padahal
penyiapan inilah yang merusaknya. Selama itu berlaku, seluruh permukaan
lampiran — formulir pengaduan maupun balasan percakapan — mustahil diuji, dan
itu menjelaskan sebagian kenapa area ini tak pernah punya cakupan.

Sudah diperbaiki: `File` diambil dari `node:buffer`, dan hanya ditugaskan bila
benar-benar ada. Ditemukan saat menulis TC-FE-040.

---

---

<a id="cat-010"></a>

### CAT-010 — Warga tak punya cara mengisi profil demografisnya (FR-AUTH-05)

**Ditemukan:** 3 September 2026 (sesi C-07) · **Butuh keputusan produk, bukan
perbaikan langsung**

Tiga fakta yang saling menutup:

1. Halaman `/profile` sepenuhnya baca-saja — nol kolom isian, nol tombol ubah,
   dan berlencana "Read-Only" (`ProfileBiodataCard.jsx`).
2. `updateMyProfile()` di `features/profile/services/profile.api.js` — pemanggil
   `PATCH /auth/profile` untuk `jenisKelamin`, `kelompokUmur`, `pendidikan`, dan
   `pekerjaan` — **tidak dipanggil satu komponen pun.** Ia kode mati.
3. Backend menerima keempat field itu, dan `RespondentProfile` memang ada untuk
   menyimpannya.

Akibatnya: data demografis hanya ada pada akun hasil *seed*. Akun `warga@example.go.id`
memilikinya lengkap (`perempuan` / `26-35` / `S1` / `Wiraswasta`) karena
ditanamkan langsung ke basis data. Warga yang lahir dari SSO Helpdesk takkan
pernah punya, dan tak ada layar mana pun tempat ia bisa mengisinya.

**Mengapa ini dicatat sebagai catatan, bukan cacat.** Arahnya bergantung pada
keputusan produk yang belum tertulis di mana pun:

- Bila demografi memang **dibutuhkan** untuk pelaporan IKM per segmen (usia,
  pendidikan, pekerjaan — pemilahan yang lazim pada laporan SKM), maka formulir
  pengisiannya belum dibangun dan FR-AUTH-05 belum terpenuhi.
- Bila demografi memang **sengaja tidak dikumpulkan** demi PDP — dan komentar di
  `me.adapter.js` mengarah ke sana ("survei memang didesain anonim") — maka yang
  perlu dibereskan justru sebaliknya: `updateMyProfile()` sebaiknya dihapus
  sebagai kode mati, dan FR-AUTH-05 disesuaikan agar tak lagi menjanjikan
  pemakaian ulang data yang memang tak pernah dikumpulkan.

Yang pasti keliru adalah keadaan sekarang, ketika kedua kemungkinan itu
dibiarkan berdampingan tanpa satu pun dituntaskan.

**Sisi lain FR-AUTH-05 sudah benar** dan tak perlu diubah: tak satu pun formulir
survei atau pengaduan meminta identitas yang sudah ada di profil. Lihat sesi C-07.

---

<a id="cat-011"></a>

### CAT-011 — Penyaring "Jenis Layanan" tak pernah bisa menyaring apa pun

**Ditemukan:** 3 September 2026 (sesi C-06)

Opsi penyaring ini diderivasi dari nilai `jenisLayanan` yang sungguhan ada pada
data OPD (`page.jsx:29-35`) — pendekatan yang benar, karena backend tak punya
enum tetap untuk field itu. Persoalannya, **seluruh 62 OPD dari Helpdesk
bernilai `jenisLayanan: null`.** Dropdown-nya karena itu selamanya berisi satu
pilihan:

```
   opsi di dropdown: ["Semua Jenis Layanan"]
```

Sebuah kendali yang menempati ruang di bilah penyaring tetapi tak dapat mengubah
apa pun. Pengguna yang membukanya akan menyimpulkan penyaringnya rusak.

**Bukan cacat kode.** Begitu Helpdesk mulai mengisi `jenisLayanan`, penyaring ini
akan langsung bekerja tanpa satu baris pun diubah. Yang perlu diputuskan hanyalah
apa yang ditampilkan selama itu belum terjadi — menyembunyikannya saat opsinya
cuma satu, atau menonaktifkannya dengan keterangan singkat, keduanya lebih jujur
daripada membiarkannya tampak dapat dipakai.

Hal yang sama berlaku pada kolom `penanggungJawab`, yang juga `null` untuk
seluruh 62 OPD.

---

<a id="cat-012"></a>

### CAT-012 — Pesan surel duplikat menyebut nama field backend

**Ditemukan:** 3 September 2026 (sesi C-05)

Mengirim formulir akun admin dengan surel yang sudah terpakai memunculkan pesan
backend apa adanya:

```
Email atau ssoSubject sudah digunakan
```

Meneruskan pesan backend tanpa menelannya adalah perilaku yang **benar** —
itulah yang diuji dan lulus pada TC-FE-044. Yang mengganjal hanya kata
`ssoSubject`: nama kolom basis data yang tak berarti apa-apa bagi admin di
Diskominfo, dan yang menyisakan keraguan apakah masalahnya ada pada surel yang
baru saja ia ketik atau pada sesuatu yang lain.

Perbaikannya kecil dan sebaiknya di sisi backend (agar seluruh pemanggil ikut
terbantu): sebutkan saja surelnya. Bila dipilih di frontend, terjemahkan hanya
pesan spesifik ini — jangan mengganti seluruh pesan backend dengan kalimat
generik, karena itu akan mengembalikan cacat yang sudah diperbaiki.

---

### CAT-013 — Keterangan `proxy.js` menerangkan aturan yang sudah tidak berlaku

**Ditemukan:** 15 September 2026 (saat menarik `main` ke `tester`)

Blok keterangan di `apps/web/src/proxy.js` baris 16–26 masih menuliskan
kelonggaran 6 Agustus 2026:

> kabupaten … SEBELUMNYA diblokir total dari /admin-opd — padahal kabupaten
> memang berhak lihat pengaduan/survei per-OPD … **Kini diizinkan**, KECUALI
> /admin-opd/dashboard …

Kodenya tak lagi berbunyi begitu. Sejak `62e9cdc` (pemilih peran untuk akun
ber-role banyak), tabel `SUPERUSER_AREA_PREFIXES` berganti nama menjadi
`ROLE_PREFIXES`, berlaku bagi **setiap** peran, dan berisi:

```js
kabupaten: ['/admin-kab'],
```

— seluruh area OPD tertutup bagi `kabupaten`. Diperiksa langsung: permintaan
`/admin-opd/complaints` dengan cookie `role=kabupaten` dijawab
`307 → /admin-kab/dashboard`.

**Bukan cacat perilaku.** Perubahannya sejalan dengan rancangan peran jamak:
yang butuh area OPD berganti peran, bukan menembus batas areanya. Yang perlu
dibereskan hanyalah keterangannya, dan alasannya bukan kerapian: keterangan di
berkas inilah satu-satunya tempat aturan area dijelaskan, dan penguji berikutnya
yang membacanya akan menyimpulkan matriks A.5.1 sedang jebol — persis kesimpulan
yang hampir saya tulis. Matriks di TEST_CASES §A.5.1 sudah disesuaikan dengan
perilaku sebenarnya.

### CAT-014 — `pnpm db:seed` tak dapat dijalankan sejak peran jamak

**Ditemukan:** 15 September 2026 (saat mencocokkan dokumen pengujian dengan kode)

`apps/api/prisma/seed.ts` masih menulis peran dalam bentuk tunggal:

```ts
create: { ssoSubject: 'seed-admin-kabupaten', /* … */ role: Role.kabupaten }
```

Kolomnya sudah tidak ada. Sejak peran jamak (5 September 2026) `schema.prisma`
memakai `roles Role[]`, dan komentarnya menyatakan pencabutannya terus terang:
`// @@index([role]) DIBUANG bersama kolomnya`.

**Bukti:**

```
$ tsc --noEmit prisma/seed.ts
prisma/seed.ts(23,7):  error TS2561: 'role' does not exist … Did you mean 'roles'?
prisma/seed.ts(36,15): error TS2561: …
prisma/seed.ts(41,7):  error TS2561: …
prisma/seed.ts(116,7): error TS2561: …
prisma/seed.ts(134,7): error TS2561: …
```

Lima kemunculan, seluruhnya pada pembuatan akun. `seed.ts` terakhir disentuh
**31 Agustus**; `schema.prisma` bergerak terus sampai **13 September**.

**Kenapa tak ada yang menyadarinya.** `tsconfig.json` milik `apps/api`
ber-`include` `["src/**/*", "test/**/*"]` — direktori `prisma/` berada di
luarnya, jadi `tsc` proyek tetap hijau dan CI tak pernah menyentuh berkas ini.
Ia hanya pecah saat benar-benar dijalankan.

**Dampaknya bagi pengujian, dan inilah alasan ia dicatat di sini.** Seluruh
dokumen pengujian bersandar pada seed sebagai **titik awal yang dapat
direproduksi**: TEST_PLAN §3.3 mendaftar empat akun uji "yang dihasilkan seed",
§5.1 menjadikannya kriteria masuk, dan TEST_EXPLORATORY §3 menyuruh
menjalankannya ulang sebelum sesi. Ketiganya kini tak dapat dipenuhi:

- basis data dev yang sudah menyimpang **tak bisa disetel ulang**;
- lingkungan baru (mesin penguji lain, CI, staging) **tak bisa disiapkan sama
  sekali**;
- setiap kasus uji yang bergantung pada data seed menjadi tak terreproduksi —
  yang ada hanyalah keadaan basis data dev hari ini, apa adanya.

**Pekerjaan tim backend, bukan penguji.** Yang dibutuhkan bukan hanya mengganti
`role:` menjadi `roles: [...]`, melainkan juga memutuskan peran apa yang
dimiliki tiap akun seed pada model baru — `admin.opd@example.go.id` di dev
sekarang ber-`roles` `['opd','responden']`, dan seed tak tahu-menahu soal itu.
Sekalian: masukkan `prisma/` ke dalam jangkauan `tsc` agar kejadian yang sama
tertangkap sebelum sampai ke mesin siapa pun.

---

### CAT-016 — Sesi memegang dua token berbeda; yang di cookie tak pernah berperan

**Ditemukan:** 15 September 2026 (charter C-15)

Sesudah memilih peran, satu sesi menyimpan **dua token yang berlainan**:

| Tempat | Klaim `act` | Dipakai oleh |
| ------ | ----------- | ------------ |
| `localStorage.token` | `kabupaten` (ikut berubah tiap berpindah peran) | `services/api.js` — seluruh panggilan API |
| cookie `token` | **tidak ada sama sekali** — token `dev-login` sebelum peran dipilih, tak pernah diperbarui | `proxy.js` |

Dibaca langsung di peramban sesudah berpindah dari Admin OPD ke Admin Kabupaten:

```
actLocalStorage : "kabupaten"
actCookie       : "(tanpa act)"
samaPersis      : false
```

**Tidak ada cacat perilaku hari ini**, dan itu perlu dikatakan lebih dulu:
backend **tidak menerima autentikasi lewat cookie sama sekali**
(`GET /auth/me` tanpa header `Authorization` menjawab **401 "Autentikasi
diperlukan"**), jadi token cookie yang tanpa peran itu tak pernah dipakai untuk
apa pun yang dijaga. Yang dipakai `proxy.js` untuk menentukan area adalah cookie
**`role`** yang terpisah — dan cookie itu memang ikut berubah saat peran
berganti.

**Kenapa tetap dicatat.** Dua hal yang akan menagih di kemudian hari:

1. **Keputusan area bersandar pada nilai polos, padahal klaim bertanda tangan
   sudah ada.** `act` kini hidup di dalam token dan tak dapat dipalsukan;
   `role` di cookie dapat disunting siapa pun lewat DevTools — persis yang
   ditunjukkan [CAT-007](#cat-007). Selama penegakan sesungguhnya ada di
   backend, akibatnya terbatas pada navigasi. Tetapi kini ada bahan yang lebih
   baik untuk dipakai, dan ia tidak dipakai.
2. **Token cookie itu jebakan bagi pekerjaan berikutnya.** Siapa pun yang kelak
   menambahkan render sisi-server atau middleware yang memvalidasi token dari
   cookie akan mendapati sesi yang **selalu tanpa peran**, dan gejalanya muncul
   sebagai 401 "Peran yang ingin dipakai belum dipilih" pada pengguna yang jelas
   sudah memilih peran.

---

### CAT-017 — Berpindah peran tidak mencabut token peran sebelumnya

**Ditemukan:** 15 September 2026 (charter C-15)

`POST /auth/acting-role` menerbitkan token **baru**; token peran sebelumnya
tidak dibatalkan di mana pun. Diuji dengan menyimpan token `kabupaten`, lalu
berpindah ke `responden`:

| Percobaan | Hasil |
| --------- | ----- |
| Token `responden` (yang sedang dipakai) → `GET /surveys` | **403** — benar |
| Token `kabupaten` **lama** sesudah berpindah → `GET /surveys` | **200** |
| Token `kabupaten` **lama** → `POST /surveys` (menulis) | **201** — survei sungguhan terbuat |
| Token `kabupaten` **lama** sesudah **logout** → `GET /surveys` | **200** |

Masa hidup tokennya **24 jam** (`exp - iat` = 86.400 detik), jadi itulah lebar
jendelanya.

**Ini konsekuensi rancangan, bukan kekhilafan kode** — dan sudah tercatat
separuhnya: [TC-AUTH-031](TEST_CASES.md) menyatakan logout bersifat *stateless*,
token lama tetap sah sampai kedaluwarsa. Tak ada daftar cabut (`jti` denylist)
maupun versi token di sistem ini.

**Yang membuatnya pantas dicatat ulang sekarang** adalah arti barunya bagi
pengguna. "Ganti Peran" **terbaca sebagai menurunkan hak** — dan itu memang
gunanya: seorang admin yang hendak melihat tampilan warga, atau menyerahkan
layarnya sebentar, akan memakainya. Yang sebenarnya terjadi bukan penurunan hak,
melainkan penambahan satu token baru di samping yang lama.

Selama token hanya tersimpan di `localStorage` peramban itu sendiri dan tertimpa
saat berpindah, tak ada yang bocor lewat aplikasi. Risikonya melekat pada token
yang telanjur **tersalin keluar** — tercatat di log proxy, tertinggal di riwayat
alat pengembang, atau dibagikan saat memecahkan masalah. Bila kelak dibutuhkan
pencabutan yang sungguh-sungguh, dua jalannya: perpendek masa hidup token dan
sediakan penyegaran, atau simpan nomor versi peran pada akun dan tolak token
yang versinya tertinggal.

---

### BUG-016 — Captcha yang gagal mengunci tombol kirim selamanya, tanpa satu pun pesan

|                       |                                                      |
| --------------------- | ---------------------------------------------------- |
| **Charter**           | C-16                                                 |
| **Tanggal**           | 15 September 2026                                    |
| **Peran**             | **pengunjung tanpa akun** — warga yang mengisi survei dari tautan/QR |
| **Halaman**           | `/survei/:id` → modal "Kirim Survei"                 |
| **Severity**          | Medium                                               |
| **Kasus uji terkait** | TC-FE-009 (jalur publik), C-16                       |

**Langkah reproduksi**

1. Buka `/survei/:id` sebuah survei aktif ber-`izinkanAnonim` **tanpa sesi**.
2. Setujui gerbang PDP, jawab pertanyaannya, tekan **Selesaikan**.
3. Pada modal "Kirim Survei", biarkan Turnstile gagal menerbitkan token —
   pada lingkungan pengujian ini ia memang selalu gagal (lihat
   [CAT-018](#cat-018)); di dunia nyata cukup pemblokir iklan, jaringan kantor
   yang menyaring, atau CDN Cloudflare yang tak terjangkau.

**Hasil yang diharapkan** — pengisi diberi tahu bahwa verifikasi keamanannya
gagal, dan diberi jalan keluar (muat ulang, coba lagi).

**Hasil sebenarnya** — tombol **"Kirim Survei" tetap mati**, dipantau 40 detik
penuh, dan **tak ada satu pun teks yang menjelaskan mengapa**. Keadaan wadah
widget-nya, dibaca tiap 5 detik:

```
t+0s  … t+40s   kirim terkunci=true   iframe Cloudflare=0
                wadah widget=ada, tinggi 72px, berisi <input name="cf-turnstile-response"> KOSONG
```

Seluruh isi modal saat itu berakhir pada `… Batal  Kirim Survei` — tak ada
peringatan, tak ada tombol muat ulang.

**Sebabnya ada di jalur penanganan galatnya.** `TurnstileWidget.jsx` memasang:

```js
'error-callback': () => onTokenRef.current?.(null),
```

Galat hanya **mengosongkan token**, tidak dilaporkan ke mana pun. Di sisi modal,
`ModalKirimSurvei.jsx` mengunci tombolnya dari nilai itu:

```js
const menungguCaptcha = captchaTersedia() && !captchaToken;
const terkunci = isSubmitting || menungguCaptcha;
```

Satu-satunya tempat pesan galat dapat muncul adalah `submitError` — dan itu baru
terisi **sesudah** pengiriman dicoba. Pengisi yang tokennya tak pernah terbit tak
pernah sampai ke sana, sehingga tak ada jalur pesan sama sekali.

**Kenapa ini bukan sekadar urusan lingkungan pengujian.** Kegagalan Turnstile
bukan hal langka di lapangan: pemblokir iklan, ekstensi privasi, jaringan
instansi yang menyaring domain luar, dan gangguan CDN semuanya menghasilkan
gejala yang sama. Yang dialami warga adalah **survei yang sudah diisi penuh lalu
tak dapat dikirim, tanpa diberi tahu apa yang salah** — dan ia tak punya akun,
tak punya riwayat, tak punya siapa pun untuk ditanya. Jawabannya hilang begitu
tabnya ditutup.

Ironisnya peringatan tentang gejala persis ini sudah tertulis di
`utils/captcha.js`: _"gejalanya adalah tombol kirim yang mati selamanya tanpa
satu pun pesan galat."_ Yang diwaspadai di sana adalah nama variabel yang
ketinggalan; yang terjadi di sini jalur yang sama, dengan sebab yang berbeda.

**Saran perbaikan** — laporkan galat widget ke antarmuka, bukan hanya ke token:
satu baris peringatan di dalam modal beserta tombol "Muat ulang verifikasi", dan
bila perlu batas waktu (mis. 15 detik tanpa token dianggap gagal).

---

### CAT-018 — Jalur pengisian publik tak dapat diuji ujung-ke-ujung di lingkungan pengembangan

**Ditemukan:** 15 September 2026 (charter C-16)

Kunci Turnstile di lingkungan ini **sungguhan dan menyala di kedua sisi**:
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` pada frontend dan `TURNSTILE_SECRET_KEY` pada
backend. Verifikasinya benar-benar hidup — dibuktikan dari sisi API:

| Percobaan pada `POST /public/surveys/:id/responses` | Hasil |
| --------------------------------------------------- | ----- |
| tanpa medan `setuju` | **400** Validation failed — ditolak sebelum satu baris pun ditulis |
| `setuju: true`, `captchaToken` dikarang | **403** `CAPTCHA_TIDAK_SAH` |
| `setuju: true`, tanpa `captchaToken` | **403** `CAPTCHA_TIDAK_SAH` |

Penjagaannya benar. Masalahnya di sisi peramban: pada hostname pengujian
`skema.local`, widget Turnstile **memuat, memulai tantangan, lalu berhenti tanpa
menerbitkan token** — skripnya terunduh, pertukaran dengan
`challenges.cloudflare.com` menjawab 200, wadahnya dirender setinggi 72px,
tetapi tak ada iframe tantangan dan `cf-turnstile-response` tetap kosong. Pola
itu khas site key yang **daftar domainnya tidak memuat hostname ini**.

**Akibatnya bagi pengujian:** tak ada satu pun pengiriman survei publik yang
dapat diselesaikan dari lingkungan ini. Inilah juga sebab kedua pengujian E2E
milik tim dev (`e2e/isi-survei-anonim.spec.ts`) **dilewati, bukan lulus** —
keduanya menunggu `E2E_SURVEY_ANONIM_ID`, dan menyetel variabel itu pun tak akan
menolong selama tokennya tak pernah terbit.

**Yang dibutuhkan, dan ini pekerjaan yang memasang kuncinya** — salah satu dari:

1. daftarkan `skema.local` pada site key Turnstile yang dipakai pengembangan;
2. **pakai kunci uji resmi Cloudflare** di lingkungan pengembangan
   (`1x00000000000000000000AA` untuk site key, yang selalu lulus); atau
3. kosongkan kedua kunci di lingkungan pengembangan — frontend dan backend sudah
   dirancang mati bersamaan bila kosong, sehingga jalurnya dapat diuji penuh.

Nomor 2 yang paling mendekati keadaan produksi tanpa membuka lubang.

---

### BUG-017 — Dropdown menyebutkan namanya, tak pernah menyebutkan pilihannya

|                       |                                                       |
| --------------------- | ----------------------------------------------------- |
| **Charter**           | C-17                                                  |
| **Tanggal**           | 15 September 2026                                     |
| **Peran**             | seluruh peran — termasuk **warga** pada formulir pengaduan |
| **Halaman**           | `components/ui/Dropdown.jsx` — dipakai **17 berkas**, di antaranya `/complaints/new`, riwayat notifikasi, penyaring OPD, formulir survei |
| **Severity**          | Medium                                                |
| **Kasus uji terkait** | TC-FE-039, TC-FE-017, C-17                            |

**Langkah reproduksi**

1. Buka `/complaints/new` sebagai warga.
2. Pilih "Aduan" pada dropdown **Kategori Pengaduan**.
3. Bandingkan yang tampak di layar dengan nama yang terbaca teknologi bantu.

**Hasil sebenarnya**

```
teks yang TAMPAK di tombol        : "Aduan"
nama yang TERBACA (accname)       : "Kategori Pengaduan"
pencarian tombol bernama "Aduan"  : 0 hasil
```

Pemakai awas melihat **"Aduan"**; pembaca layar mengumumkan **"Kategori
Pengaduan, tombol"** — sebelum maupun sesudah memilih. Nilai yang dipilih tak
pernah terdengar sama sekali.

**Sebabnya.** Pemicu dropdown adalah `<button>` yang dilabeli
`<label for="category">Kategori Pengaduan</label>`. Pada perhitungan nama
aksesibel, label itu **menang atas isi tombolnya**, sehingga isinya — yaitu
nilainya — diabaikan seluruhnya.

Dua atribut yang biasanya melengkapi pola ini juga tak ada di
`components/ui/Dropdown.jsx`: **`aria-haspopup`** (tak ada yang memberi tahu
bahwa tombol ini membuka daftar) dan **`aria-expanded`** (keadaan
terbuka/tertutupnya tak pernah disampaikan). Diperiksa di dua halaman berbeda,
hasilnya sama:

| Tempat | Nama terbaca | `aria-haspopup` | `aria-expanded` |
| ------ | ------------ | --------------- | --------------- |
| `/complaints/new` → `#department` | "OPD / Instansi Tujuan" | tak ada | tak ada |
| `/complaints/new` → `#category` | "Kategori Pengaduan" | tak ada | tak ada |
| riwayat notifikasi → `#saring-rentang-notifikasi` | "Rentang waktu" | tak ada | tak ada |
| riwayat notifikasi → `#saring-urutan-notifikasi` | "Urutan" | tak ada | tak ada |

**Kenapa Medium, dan kenapa formulir pengaduan yang menentukan.** Warga tunanetra
dapat membuka daftar OPD dan memilih, tetapi **tak pernah dapat memastikan
instansi mana yang akan menerima laporannya** — tombolnya terus menyebut
"OPD / Instansi Tujuan", apa pun yang sudah dipilih. Pengaduan yang mendarat di
OPD keliru tak pernah sampai ke petugas yang berwenang, dan pelapornya tak punya
cara memeriksa sebelum menekan Kirim.

**Catatan yang perlu diadili dengan jujur.** Label tampak itu **bukan
kekeliruan** — ia dipasang justru untuk alasan yang benar, dan komentar di
`NotificationFilterBar.jsx` menyatakannya terus terang: tanpa label, dua dropdown
bersebelahan yang sama-sama berisi kata waktu ("Semua waktu" dan "Terbaru dulu")
tak mungkin dibedakan pembaca layar. Yang keliru hanyalah menganggap pertukaran
itu perlu terjadi: `aria-labelledby` yang menunjuk **label DAN nilainya
sekaligus** memberi keduanya — "Rentang waktu, Semua waktu".

---

## 6. Riwayat revisi

| Versi | Tanggal            | Perubahan                                                                                                                                                                                       |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0   | 12 Agustus 2026    | Berkas dibuat. BUG-001 s.d. BUG-003 dan CAT-001 s.d. CAT-003 dari penelaahan kode dan penulisan uji otomatis, sebelum sesi eksploratori dimulai.                                                |
| 1.1   | 12 Agustus 2026    | Hasil sesi eksploratori C-01: tambah BUG-004, ringkasan sesi (§4), dan CAT-004. TC-FE-004 ditutup lulus di TEST_CASES.md.                                                                       |
| 2.0   | 2 September 2026   | Penyesuaian menyeluruh setelah 81 commit. BUG-001, BUG-002, BUG-004 ditutup (diverifikasi ulang). CAT-004 naik jadi BUG-005 (High). CAT-002 sebagian terjawab oleh SSO Helpdesk. CAT-001 masih terbuka. |
| 2.1   | 2 September 2026   | BUG-005 dikonfirmasi di peramban dan **dinaikkan High → Critical**: akibatnya bukan satu pertanyaan tak terjawab, melainkan seluruh survei tak dapat dilewati responden. Bukti dua lapis (API + peramban) beserta data uji yang ditinggalkan. |
| 2.2   | 2 September 2026   | Tiga sesi eksploratori dijalankan: **C-02** (alur pengaduan lintas peran — lulus, 1 dugaan temuan gugur setelah diperiksa), **C-03** (lampiran — BUG-007, Low), **C-10** (area Superuser — lulus, 28 kombinasi rute + penjagaan data backend). Tambah CAT-005. C-09 dinyatakan **terkunci** menunggu kredensial SSO dari Diskominfo. |
| 2.3   | 2 September 2026   | Sesi **C-04** (proteksi route — 0 cacat, matriks A.5.1 kini terkunci otomatis) dan **C-11** (sapuan 35 halaman — 1 cacat nyata, 6 alarm palsu). Tambah **BUG-008** (beranda publik menawarkan formulir yang tak dapat dipakai, Medium), **CAT-006** (dua sisa kode mati), **CAT-007** (proxy tertembus cookie sendiri — konsekuensi rancangan, bukan celah). Dugaan "halaman terlindungi masih tampil sesudah logout" **dicabut** setelah ditelusuri lebih jauh: yang tersisa hanya kerangka halaman, sesinya benar-benar mati. |
| 2.4   | 2 September 2026   | Antarmuka pengaduan akhirnya beruji: **TC-FE-039/040/041 lulus** (23 kasus di tiga berkas, Jest naik 57 → 80). Sesi **C-13** (gerbang PDP) dijalankan — 0 cacat pada penjagaan cookie & pemantulan peran, tetapi **formulir persetujuannya sendiri terkunci** karena tak ada akun responden tanpa persetujuan di dev dan tak ada jalur frontend untuk membuatnya. Tambah **CAT-008** (fixture MSW menyimpang dari API) dan **CAT-009** (`jest.setup.js` melumpuhkan `File`, membuat seluruh permukaan lampiran mustahil diuji). |
| 2.5   | 2 September 2026   | Sesi **C-12** (analisis & ekspor) dijalankan — 0 cacat. Nilai IKM terbukti konsisten di tiga endpoint yang menghitungnya; survei tanpa unsur IKM ditampilkan "Belum dapat dinilai", bukan 0; ketiga format ekspor diperiksa **isi berkasnya**, bukan sekadar status HTTP. TC-FE-035/036/037 ditutup lulus. |
| 2.6   | 3 September 2026   | **Empat charter P1 terakhir dijalankan** — C-05 (form akun admin), C-06 (daftar & sinkronisasi OPD), C-07 (profil responden), C-08 (ketahanan saat backend bermasalah). Empat temuan baru: **BUG-009** (akun terlanjur dibuat ketika penetapan statusnya gagal, Medium), **BUG-010** (tombol paginasi tanpa nama aksesibel, berlaku di seluruh tabel aplikasi), **BUG-011** (pencarian OPD tak memangkas spasi), **BUG-012** (angka `skipped` laporan sinkron tak ditampilkan). Tiga catatan: **CAT-010** (warga tak punya cara mengisi profil demografis; `updateMyProfile()` kode mati), **CAT-011** (penyaring Jenis Layanan tak pernah bisa menyaring), **CAT-012** (pesan duplikat menyebut `ssoSubject`). **C-08 nihil cacat.** Tiga hasil probe dibatalkan sesudah diperiksa ulang — dua karena kekeliruan skrip pengujian (baris keadaan-kosong ikut terhitung; wizard survei diisi dengan cara yang salah), satu karena kompilasi dingin `next dev` selama 182 detik. |
| 2.7   | 3 September 2026   | **Formulir C-13 akhirnya dapat diuji** — user menyediakan `warga@gmail.com`, responden ber-`consentAt` kosong yang selama ini tak ada. 10 probe, **nol temuan**, TC-FE-038 ditutup lulus. Penegakan berlapisnya terbukti: kiriman tanpa persetujuan ditolak 403, dan **tetap 403 walau cookie `consent` dipalsukan** — gerbangnya memang pembatas navigasi, backend yang menegakkan. Fixture-nya sekali pakai (tak ada endpoint reset), jadi sembilan probe yang tak menghabiskannya dikerjakan lebih dulu dan penerimaan sungguhan paling akhir. Ditambah **§Y.6** di TEST_CASES: `.next` tercemar build produksi membuat 37 dari 37 rute 404 — insiden lingkungan, bukan cacat produk. |
| 2.8   | 3 September 2026   | **Dua belas kasus uji terakhir Modul Y ditutup** (TC-FE-005/006/007/010/012/028/032/042/043/045/046/047) — Jest 80 → **195** di 24 berkas, E2E 6 → **9**. Nol temuan baru, tetapi **tiga premis kasus uji ternyata usang** dan dikoreksi alih-alih dipaksakan: TC-FE-006 menuntut toast pada aplikasi yang tak punya sistem toast, TC-FE-012 menuntut tooltip pada grafik SVG yang nilainya selalu terlihat, dan satu temuan mobile TC-FE-007 (guliran mendatar 809 px) **dibatalkan sendiri** setelah terbukti berasal dari gambar `w-auto` yang diukur sebelum dimuat — masuk §Y.5 sebagai butir keempat. Ditambah **pembersihan data uji dari basis data dev** atas permintaan penguji: 6 pengaduan, 43 respons, 2 survei mati, 30 notifikasi tanpa FK, 2 akun karangan, dan 22 berkas unggahan yatim dihapus — `/statistics` publik jujur kembali (responden 44 → 3, pengaduan 11 → 6). Survei 332/333 sengaja dipertahankan karena BUG-005 masih terbuka, dan `consentAt` `warga@gmail.com` dikembalikan `null` sehingga fixture responden tanpa persetujuan tersedia lagi. |
| 2.9   | 4 September 2026   | **Tiga survei uji tersisa dihapus paksa** atas permintaan penguji: 332 & 333 (reproduksi hidup BUG-005) dan 336 (fixture E2E). Keberatan sudah disampaikan — BUG-005 masih terbuka dan peragaannya jadi hilang — tetapi keputusan tetap di penguji. Bukti tertulis BUG-005 utuh di laporan ini dan dapat dibangun ulang dalam hitungan menit; baris aslinya dicadangkan lebih dulu. Fixture E2E dibuat ulang sendiri oleh `globalSetup` pada jalan berikutnya. Basis data dev kini **nol baris bertanda `[UJI `**. |
| 3.0   | 15 September 2026  | **`main` ditarik ke `tester`** (85 commit, 11 hari). 16 kasus uji merah di 4 berkas — **nol di antaranya cacat produk**: seluruhnya pengujian yang masih berbicara dengan kontrak yang sudah tidak ada (`role` tunggal → `roles`+`actingRole`, callback membaca `/auth/roles`, `reply.dariPelapor`, taksonomi sub-kategori dihapus, gerbang pengisian survei, peran jamak pada dev-login). Rinciannya di TEST_CASES §Y.7. Dua berkas uji penguji dibuang karena menguji antarmuka yang tak pernah lagi dirender; dua konflik merge diselesaikan dengan versi `main` yang lebih dalam. Tambah **CAT-013** (keterangan `proxy.js` menerangkan aturan yang sudah tidak berlaku) dan matriks A.5.1 disesuaikan. Suite: Jest **663/663 di 89 berkas**, eslint 0 galat. Basis data dev dibersihkan, termasuk **7.986 notifikasi yatim** yang menunjuk tiket pengaduan yang sudah lenyap. |
| 3.1   | 15 September 2026  | Dokumen pengujian dicocokkan ulang dengan kode, bukan dengan versi sebelumnya. Tambah **CAT-014** — `pnpm db:seed` tak dapat dijalankan sejak peran jamak (`seed.ts` menulis `role` tunggal; kolomnya sudah dibuang), sehingga titik awal yang dapat direproduksi tak tersedia bagi siapa pun. Peta otomatisasi TEST_CASES §Y.1 dibaca ulang dari `jest --json`: **delapan baris meleset**, termasuk satu berkas yang sudah tak ada. TEST_PLAN dinaikkan ke v1.3 setelah tertinggal 13 hari di belakang model peran jamak. |
| 3.2   | 15 September 2026  | **Sesi C-14 (Sampah survei & hapus permanen) dijalankan** — tiga temuan. **BUG-013 (High)**: survei yang dibuang ke Sampah tetap menghitung IKM kabupaten, papan peringkat OPD, jumlah responden, dan tren triwulan pada halaman publik; dibuktikan dengan uji kendali — memusnahkannya permanen mengembalikan seluruh angka persis ke semula. **BUG-014 (Medium)**: hapus permanen membersihkan enam tabel tetapi meninggalkan notifikasi yang menaut lewat teks `link`, menumpuk di lonceng lima akun admin sungguhan. **BUG-015 (Medium)**: dialog konfirmasi destruktif tak terbaca pembaca layar — `ConfirmActionModal` tanpa `role`/`aria-modal` sama sekali, dan `ConfirmTypeToDeleteModal` mengaku `aria-modal="true"` sambil meninggalkan fokus di luar dirinya. Delapan pemeriksaan lain **nihil cacat**, termasuk isolasi Sampah antar-OPD, penolakan 403 atas pemusnahan oleh Admin OPD, dan ketepatan sasaran pada dua survei berjudul sama. |
| 3.3   | 15 September 2026  | **Sesi C-15 (berpindah peran dalam satu sesi) dijalankan — nihil cacat.** Sepuluh hal ditelusuri dan seluruhnya benar, termasuk penolakan **403** atas peran yang tidak dimiliki, **401** atas token yang belum berperan, pemantulan area sesudah berpindah, dan gerbang PDP yang berdiri tepat saat peran `responden` diambil. Satu dugaan sengaja diuji dan **gugur**: akun tanpa persetujuan PDP yang tetap boleh memakai area Admin Kabupaten bukan gerbang jebol, melainkan pembagian yang benar antara data pribadi responden dan tugas jabatan. Dua catatan: **CAT-016** (sesi memegang dua token berbeda; yang di cookie tak pernah berperan, sehingga keputusan area bersandar pada cookie `role` polos padahal klaim `act` bertanda tangan sudah tersedia) dan **CAT-017** (berpindah peran tidak mencabut token peran sebelumnya — token lama masih menulis, dan masih sah 24 jam bahkan sesudah logout). |
| 3.4   | 15 September 2026  | **Sesi C-16 (rute publik tanpa sesi & captcha) dijalankan.** Sepuluh pemeriksaan lulus — termasuk gerbang PDP bagi pengunjung tanpa akun, penolakan **404** atas survei non-anonim, **400** atas kiriman tanpa `setuju`, dan **403** `CAPTCHA_TIDAK_SAH` atas token karangan maupun token yang tak ada. **BUG-016 (Medium)**: ketika Turnstile gagal menerbitkan token, tombol "Kirim Survei" terkunci selamanya tanpa satu pun pesan — `error-callback` hanya mengosongkan token, dan satu-satunya jalur pesan (`submitError`) baru hidup sesudah pengiriman dicoba. **CAT-018**: pengiriman publik tak dapat diuji ujung-ke-ujung di lingkungan ini karena site key Turnstile tak memuat hostname `skema.local`; ini pula sebab dua pengujian E2E milik tim dev dilewati, bukan lulus. Satu probe keliru (mencentang kotak yang salah) hampir menghasilkan laporan "jalan buntu" yang palsu, dan dibatalkan sesudah struktur gerbangnya didaftar ulang. |
| 3.5   | 15 September 2026  | **Sesi C-17 (riwayat notifikasi) dijalankan.** Enam pemeriksaan lulus, termasuk satu dugaan yang sengaja diuji dan **gugur**: penyaringan & paginasi halaman ini dikerjakan backend, bukan diambil semua lalu disaring di peramban seperti halaman OPD yang melahirkan BUG-011. **BUG-017 (Medium)**: pemicu `Dropdown` dilabeli `<label for>` sehingga nama terbacanya adalah labelnya, bukan nilainya — pemakai awas melihat "Aduan", pembaca layar mendengar "Kategori Pengaduan". Berlaku pada **17 berkas**, terburuk di formulir pengaduan warga: pelapor tunanetra tak dapat memastikan OPD tujuan sebelum mengirim. `aria-haspopup` dan `aria-expanded` juga tak ada di mana pun. |
