# Daftar Temuan Pengujian — SKM & SPM Kabupaten Madiun

| Butir               | Isi                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Versi**           | 2.0                                                                                                        |
| **Tanggal**         | 2 September 2026                                                                                           |
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
| [BUG-005](#bug-005) | Duplikasi survei membuang seluruh opsi jawaban                 | High     | Bukti statis  | Baru       | —       |
| [BUG-003](#bug-003) | `MapSection.jsx` kode mati berisi iframe Google Maps           | Low      | Terkonfirmasi | Baru       | —       |
| [BUG-001](#bug-001) | Navbar admin menampilkan identitas mati, bukan akun yang login | High     | Terkonfirmasi | **Ditutup** | —       |
| [BUG-002](#bug-002) | Lencana notifikasi tidak terbaca pembaca layar                 | Low      | Terkonfirmasi | **Ditutup** | —       |
| [BUG-004](#bug-004) | Tipe "Pilihan Ganda" tampil seolah tersedia padahal ditolak    | Low      | Terkonfirmasi | **Ditutup** | C-01    |
| [BUG-006](#bug-006) | Sesi hantu: tampak sudah login, tombol mati, data tetap terisi | High     | Terkonfirmasi | **Ditutup** | —       |

**Rekap** — 6 temuan: 4 ditutup, 2 terbuka (1 High, 1 Low)

Tiga temuan pertama sudah diperbaiki tim dev dan diverifikasi ulang pada
2 September 2026. BUG-002 kini terkunci uji otomatis; BUG-001 belum.

BUG-006 dilaporkan **dan** diperbaiki pada 2 September 2026. Ia bersaudara
dekat dengan keluhan 18 Agustus ("baru akses localhost sudah terlihat login"):
gejalanya mirip, tetapi sebabnya berlawanan arah — waktu itu sesi mati yang
tampak hidup, kali ini sesi hidup yang cookienya sudah mati.

**BUG-005 adalah CAT-004 yang menjadi kenyataan.** Pada 12 Agustus ia dicatat
sebagai peringatan yang "belum berdampak karena tipe pilihan memang belum bisa
dibuat". Tipe pilihan kini bisa dibuat, dan `duplicate()` masih tidak menyalin
opsi — jadi peringatannya berubah menjadi cacat.

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

### BUG-005 — Duplikasi survei membuang seluruh opsi jawaban

|                       |                                                                   |
| --------------------- | ----------------------------------------------------------------- |
| **Charter**           | — (ditemukan saat menyesuaikan pengujian, 2 September 2026)        |
| **Tanggal**           | 2 September 2026                                                  |
| **Peran**             | Admin OPD, Admin Kabupaten, Superuser                             |
| **Halaman**           | `/admin-opd/surveys` → tombol Duplikat, lalu wizard pengisian     |
| **Severity**          | High                                                              |
| **Verifikasi**        | Bukti statis — rantai penyebabnya utuh, belum dijalankan di peramban |
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

| Tipe pertanyaan             | Akibat pada salinan                                                     |
| --------------------------- | ------------------------------------------------------------------------ |
| Pilihan Ganda               | Kehilangan seluruh opsi → pertanyaan **tidak dapat dijawab**              |
| Skala 1-4 berlabel tersuai  | Label kembali diam-diam ke label baku PermenPANRB                        |

**Bukti**

Rantainya utuh dan dapat ditelusuri dari kode:

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

Dinilai **High** karena tiga hal:

1. **Duplikasi adalah alur yang dianjurkan**, bukan jalur pinggir. Fitur ini
   ada justru supaya survei triwulan berikutnya tidak dibuat dari nol.
2. **Tidak ada jalan memutar selain membuat ulang opsinya satu per satu**, dan
   admin baru mengetahui masalahnya setelah survei terbit.
3. **Kerugian label skala berlangsung diam-diam.** Pertanyaan pilihan ganda
   setidaknya memunculkan kotak peringatan; label skala hanya berganti, dan
   survei tetap tampak normal. Hasil IKM-nya pun tetap terhitung, hanya saja
   respondennya membaca kalimat yang berbeda dari yang dirancang.

Perbaikannya di ranah backend (menyertakan `options` pada `duplicate()`), jadi
di luar lingkup pengujian saya. Yang dilaporkan di sini adalah gejalanya, yang
seluruhnya terlihat di frontend.

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

---

## 6. Riwayat revisi

| Versi | Tanggal            | Perubahan                                                                                                                                                                                       |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0   | 12 Agustus 2026    | Berkas dibuat. BUG-001 s.d. BUG-003 dan CAT-001 s.d. CAT-003 dari penelaahan kode dan penulisan uji otomatis, sebelum sesi eksploratori dimulai.                                                |
| 1.1   | 12 Agustus 2026    | Hasil sesi eksploratori C-01: tambah BUG-004, ringkasan sesi (§4), dan CAT-004. TC-FE-004 ditutup lulus di TEST_CASES.md.                                                                       |
| 2.0   | 2 September 2026   | Penyesuaian menyeluruh setelah 81 commit. BUG-001, BUG-002, BUG-004 ditutup (diverifikasi ulang). CAT-004 naik jadi BUG-005 (High). CAT-002 sebagian terjawab oleh SSO Helpdesk. CAT-001 masih terbuka. |
