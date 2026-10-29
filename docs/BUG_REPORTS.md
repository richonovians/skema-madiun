# Daftar Temuan Pengujian — SKM & SPM Kabupaten Madiun

> **PERAN `superuser` SUDAH TIDAK ADA — cara membaca sebutannya di dokumen ini.**
>
> Peran itu dilebur ke `kabupaten` pada **15 September 2026** dan nilai enumnya
> dibuang. Enum `Role` kini `kabupaten | opd | responden`. Riwayatnya berlapis
> empat, dan keempatnya ada sebagai migrasi di `apps/api/prisma/migrations/`:
>
> | Tanggal | Migrasi | Keadaan |
> | --- | --- | --- |
> | 27 Juli 2026 | `20260727000000_add_superuser_role` | ditambahkan |
> | 5 Agustus 2026 | `20260805150000_remove_superuser_role_merge_kabupaten` | dilebur |
> | 20 Agustus 2026 | `20260820000000_readd_superuser_role` | **dikembalikan** |
> | 15 September 2026 | `20260915140000_lebur_superuser_ke_kabupaten` | dilebur, terakhir |
>
> Karena itu dokumen ini disisir pada 13 Oktober 2026 dengan aturan berikut, dan
> **bukan** dengan ganti-kata menyeluruh: sebutan yang berupa catatan sejarah
> atau hasil pengamatan bertanggal **dipertahankan apa adanya**, sebab
> menyuntingnya akan memalsukan rekaman pengujian; sebutan yang mengaku keadaan
> SEKARANG diperbaiki beserta tanggalnya; kasus uji yang harapannya kini salah
> **ditandai tersurat**, tidak disunting diam-diam — menulis ulang kasus uji
> secara senyap akan menghapus fakta bahwa cakupan ujinya berubah.
>
> **(15 Oktober 2026) LABEL "BERANDA" KINI "LAYANAN"** di seluruh antarmuka,
> atas permintaan pengguna. Sebelas sebutan "beranda" di bawah DIBIARKAN UTUH
> dengan alasan yang sama seperti `superuser`: seluruhnya pengamatan bertanggal
> tentang rute `/`, dan rutenya tidak berubah sama sekali — hanya labelnya.
> Membacanya hari ini: yang disebut "beranda publik" adalah halaman `/` yang
> kini berlabel "Layanan".
>
> **Dokumen ini TIDAK disunting di luar kotak ini.** Isinya laporan temuan
> bertanggal dan catatan sesi eksploratori, termasuk cuplikan keluaran `psql`
> mentah seperti `2 | superuser@example.go.id | {superuser}`. Seluruhnya rekaman
> apa yang DIAMATI pada hari itu, dan rekaman tak boleh diubah agar cocok dengan
> keadaan hari ini. Tiga puluh tiga sebutan `superuser` di bawah dibiarkan utuh
> dengan sengaja.

| Butir               | Isi                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Versi** | 6.0 |
| **Tanggal** | 20 Oktober 2026 |
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
| [BUG-005](#bug-005) | Duplikasi survei membuang opsi jawaban — survei jadi buntu total | **Critical** | Terkonfirmasi | **Ditutup** | —       |
| [BUG-003](#bug-003) | `MapSection.jsx` kode mati berisi iframe Google Maps           | Low      | Terkonfirmasi | **Ditutup** | —       |
| [BUG-001](#bug-001) | Navbar admin menampilkan identitas mati, bukan akun yang login | High     | Terkonfirmasi | **Ditutup** | —       |
| [BUG-002](#bug-002) | Lencana notifikasi tidak terbaca pembaca layar                 | Low      | Terkonfirmasi | **Ditutup** | —       |
| [BUG-004](#bug-004) | Tipe "Pilihan Ganda" tampil seolah tersedia padahal ditolak    | Low      | Terkonfirmasi | **Ditutup** | C-01    |
| [BUG-006](#bug-006) | Sesi hantu: tampak sudah login, tombol mati, data tetap terisi | High     | Terkonfirmasi | **Ditutup** | —       |
| [BUG-007](#bug-007) | Lampiran tak sah baru ditolak setelah diunggah, bukan dicegah  | Low      | Terkonfirmasi | **Ditutup** | C-03    |
| [BUG-008](#bug-008) | Beranda publik menawarkan formulir yang tak dapat dipakai pengunjung | Medium   | Terkonfirmasi | **Ditutup** | C-11    |
| [BUG-009](#bug-009) | Akun terlanjur dibuat ketika penetapan statusnya gagal          | Medium   | Terkonfirmasi | **Ditutup** (basi — fiturnya dibuang) | C-05    |
| [BUG-010](#bug-010) | Tombol paginasi tak punya nama yang dapat dibacakan             | Low      | Terkonfirmasi | **Ditutup** | C-06    |
| [BUG-011](#bug-011) | Pencarian daftar OPD tak memangkas spasi                        | Low      | Terkonfirmasi | **Ditutup** | C-06    |
| [BUG-012](#bug-012) | Angka `skipped` pada laporan sinkronisasi OPD tak ditampilkan   | Low      | Terkonfirmasi | **Ditutup** | C-06    |
| [BUG-013](#bug-013) | Survei di Sampah tetap terhitung pada statistik publik           | **High** | Terkonfirmasi | **Ditutup** | C-14    |
| [BUG-014](#bug-014) | Hapus permanen meninggalkan notifikasi menunjuk survei yang tiada | Medium   | Terkonfirmasi | **Ditutup** | C-14    |
| [BUG-015](#bug-015) | Dialog konfirmasi destruktif tak dapat dipakai pembaca layar     | Medium   | Terkonfirmasi | **Ditutup** | C-14    |
| [BUG-016](#bug-016) | Captcha gagal → tombol kirim mati selamanya tanpa pesan          | Medium   | Terkonfirmasi | **Ditutup** | C-16    |
| [BUG-017](#bug-017) | Dropdown menyebut namanya, tak pernah menyebut pilihannya        | Medium   | Terkonfirmasi | **Ditutup** | C-17    |
| [BUG-018](#bug-018) | Meneruskan pengaduan menyiarkan ulang notifikasi ke admin yang sama | Low   | Terkonfirmasi | **Ditutup** | C-18    |
| [BUG-019](#bug-019) | Layar gagal masuk SSO menampilkan kalimat dari luar apa adanya    | Medium   | Terkonfirmasi | **Ditutup** | C-09    |
| [BUG-020](#bug-020) | Parameter boolean bernilai `false` dibaca sebagai `true` | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-021](#bug-021) | Kendali paginasi menampilkan angka salah, dan tiga tempat memotong daftar tanpa suara | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-022](#bug-022) | Pilihan jawaban survei tak dapat dicapai papan ketik maupun pembaca layar | **High** | Terkonfirmasi | **Ditutup** | — |
| [BUG-023](#bug-023) | Dua spec responsif menunjuk nomor tiket yang sudah tiada | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-024](#bug-024) | Detektor luberan menuduh teks yang sengaja dipotong elipsis | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-025](#bug-025) | Detektor teks terpotong menuduh label `sr-only` | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-026](#bug-026) | `isi-survei-anonim` menyimpan empat harapan basi dan selalu melewati dirinya | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-027](#bug-027) | Uji KENDALI pengisian anonim lulus tanpa pernah mengisi apa pun | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-028](#bug-028) | Penolakan unggahan dijawab 500, bukan 400 — galat klien menyamar sebagai kerusakan server | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-029](#bug-029) | Layar gagal masuk SSO membocorkan URL internal dan nama kunci konfigurasi | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-030](#bug-030) | Sapuan proteksi route membaca 502 sebagai keputusan proxy — bisa LULUS tanpa memeriksa apa pun | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-031](#bug-031) | Warga pemakai keyboard tak dapat melampirkan bukti ke pengaduan sama sekali | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-032](#bug-032) | Kalimat penolakan ukuran lampiran menyandingkan dua angka yang terbaca sama | Low | Terkonfirmasi | **Ditutup** | QA-H1 |
| [BUG-033](#bug-033) | Daftar izin jenis lampiran dapat dilewati lewat rantai prototipe | Low | Terkonfirmasi | **Ditutup** | QA-H1 |
| [BUG-034](#bug-034) | Dua lampiran bernama sama menghasilkan dua tombol hapus bernama identik | Low | Terkonfirmasi | **Ditutup** | QA-H2 |
| [BUG-035](#bug-035) | Lima uji E2E mencari tombol yang sudah pindah ke menu aksi — terlewat diam-diam empat minggu | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-036](#bug-036) | Fixture E2E mencocokkan status `draf`, enum-nya `draft` — uji perancang survei selalu terlewat | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-037](#bug-037) | Modal Bagikan Survei bukan dialog bagi pembaca layar — tanpa peran, nama, tombol tutup bernama, maupun kurungan fokus | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-038](#bug-038) | `/persetujuan` mengantar pengguna yang sudah menyetujui ke beranda publik, bukan ke berandanya — membaca `me.role` yang tak ada | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-039](#bug-039) | Modal Buat/Ubah Survei bukan dialog bagi pembaca layar — tanpa peran, nama, tombol tutup bernama, maupun kurungan fokus | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-040](#bug-040) | Lima sisa `max-w-xs`/`max-w-2xl` yang dibajak token spasi — judul pengaduan diperas ke lebar minimum, judul warga terpotong pada layar lega | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-041](#bug-041) | `className` pemanggil `Badge` kalah oleh kelas bawaan — enam lencana survei tetap pil walau meminta `rounded`, `font-bold` tampil 600 | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-042](#bug-042) | Tombol ciut sidebar dan tombol menu ponsel tak mengumumkan keadaannya — tanpa `aria-expanded`/`aria-controls`, nama menu tetap "Buka" saat laci terbuka | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-043](#bug-043) | Tombol hamburger dashboard warga tanpa nama sama sekali — pembaca layar hanya mendengar "tombol" | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-044](#bug-044) | Tujuh tombol buka/tutup tanpa `aria-expanded` — hamburger publik, akordeon FAQ, dua tombol Filter ponsel, tiga menu Ekspor | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-045](#bug-045) | Pertanyaan FAQ berupa `<h3>` di dalam `<button>` — susunan HTML tak sah | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-046](#bug-046) | Tujuh lencana 10px tumbuh 1,67px sejak Badge memakai `cn` — jarak baris `text-xs` ikut terbuang | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-047](#bug-047) | Nilai Survei "4,00 / 4 · Sangat Puas" tak dapat patah — tabel survei Admin Kabupaten meluap 58px di 1366px, kartu Admin OPD keluar kotak | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-048](#bug-048) | Aksi Teruskan dan Monitor Tiket di daftar pengaduan Admin Kabupaten di bawah 44px; Monitor Tiket `<button>` di dalam `<Link>` | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-049](#bug-049) | Ekspor CSV meneruskan teks berawalan `=`, `+`, `-`, `@` mentah — Excel menghitungnya sebagai rumus bila dipecah per koma | Medium | Terkonfirmasi | **Ditutup** | — |
| [BUG-050](#bug-050) | Tanggal tak sah di penyaring log audit (`startDate`/`endDate`) dijawab 500, bukan 400 | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-051](#bug-051) | Karakter pola LIKE `%`/`_` tak diloloskan: pencarian OPD dan log audit melebar, pencocokan OPD dari klaim SSO rawan salah tautan | Low | Terkonfirmasi | **Ditutup** | — |
| [BUG-052](#bug-052) | Mutasi bercookie dari origin lain diterima — tak ada penahan CSRF selain SameSite=Lax | Medium | Terkonfirmasi | **Ditutup** | — |

**Rekap** — 52 temuan: **52 ditutup, 0 terbuka.**

> **(22 Oktober 2026) Baris rekap di atas sebelumnya berbunyi "21 temuan: 10
> ditutup, 11 terbuka (0 Critical, 0 High, 5 Medium, 6 Low)", dan itu sudah
> basi sebelum hari ini dimulai.** Lima baris Medium — BUG-008, 009, 015, 016,
> 017 — sudah ditandai `Ditutup` di tabelnya sendiri, tetapi angka rekapnya
> tidak ikut dihitung ulang. Ini persis kesalahan yang dokumen ini sudah
> catat dua kali sebelumnya, dan tetap terulang. Hitungan hari ini DITURUNKAN
> DARI KOLOM STATUS, bukan dari angka sebelumnya: 27 baris, 20 di antaranya
> `Ditutup`, menyisakan tujuh — Medium BUG-019; Low BUG-003, 007, 010, 011,
> 012, 018. Enam baris baru (BUG-022 sampai BUG-027) seluruhnya lahir dan
> ditutup pada 22 Oktober 2026.

> **(15 Oktober 2026) Baris di atas sebelumnya berbunyi "20 temuan ... 14
> terbuka ... 5 Low", dan itu salah hitung.** Sebabnya kesalahan penguji yang
> sama seperti dua lainnya hari ini: angkanya DITAMBAH satu dari angka lama
> alih-alih DIHITUNG ULANG dari baris tabel di atas. Hitungan dari tabelnya
> sendiri: 21 baris, enam di antaranya `Ditutup` (BUG-001, 002, 004, 006, 020,
> 021), sisanya 15 terbuka — Critical BUG-005; High BUG-013; Medium BUG-008,
> 009, 014, 015, 016, 017, 019; Low BUG-003, 007, 010, 011, 012, 018. BUG-001
> dan BUG-006 juga High tetapi sudah ditutup, dan itulah yang membuat hitungan
> tangan mudah tergelincir.
>
> **(16 Oktober 2026) Dihitung ulang lagi sesudah BUG-005 ditutup**, dengan cara
> yang sama dan bukan dengan mengurangi satu: 21 baris, tujuh `Ditutup`
> (BUG-001, 002, **005**, 004, 006, 020, 021), sisanya 14 terbuka — **tak ada
> lagi yang Critical**; High BUG-013; Medium BUG-008, 009, 014, 015, 016, 017,
> 019; Low BUG-003, 007, 010, 011, 012, 018.
>
> **(19 Oktober 2026) Dihitung ulang sekali lagi sesudah BUG-013 ditutup**, juga
> dari baris tabelnya dan bukan dengan mengurangi satu: 21 baris, delapan
> `Ditutup` (BUG-001, 002, 004, 005, 006, **013**, 020, 021), sisanya 13 terbuka
> — **tak ada lagi yang Critical MAUPUN High**; Medium BUG-008, 009, 014, 015,
> 016, 017, 019; Low BUG-003, 007, 010, 011, 012, 018. Tujuh Medium itu kini
> tingkat tertinggi yang terbuka, dan dokumen ini TIDAK memeringkat di antara
> mereka; yang dapat dikatakan tanpa mengarang: hanya [BUG-008](#bug-008) yang
> akibatnya terlihat oleh pengunjung publik, sisanya di layar internal.
>
> **(20 Oktober 2026) Dihitung ulang sesudah BUG-016 ditutup**, dari baris
> tabelnya dan bukan dengan mengurangi satu: 21 baris, sembilan `Ditutup`
> (BUG-001, 002, 004, 005, 006, 013, **016**, 020, 021), sisanya 12 terbuka —
> Medium BUG-008, 009, 014, 015, 017, 019; Low BUG-003, 007, 010, 011, 012,
> 018. Kalimat 19 Oktober di atas tentang BUG-008 tetap berlaku: dari enam
> Medium yang tersisa, hanya ia yang akibatnya terlihat pengunjung publik.
>
> **(20 Oktober 2026, sore) Dihitung ulang lagi sesudah BUG-014 ditutup**, juga
> dari baris tabelnya: 21 baris, sepuluh `Ditutup` (BUG-001, 002, 004, 005,
> 006, 013, **014**, 016, 020, 021), sisanya 11 terbuka — Medium BUG-008, 009,
> 015, 017, 019; Low BUG-003, 007, 010, 011, 012, 018. Medium tinggal lima, dan
> BUG-008 tetap satu-satunya yang akibatnya terlihat pengunjung publik.
>
> **(21 Oktober 2026) Dihitung ulang sesudah BUG-017 ditutup dan BAGIAN 1
> BUG-015 diperbaiki**, juga dari baris tabelnya: 21 baris, sebelas `Ditutup`
> (BUG-001, 002, 004, 005, 006, 013, 014, 016, **017**, 020, 021), sisanya 10
> terbuka — Medium BUG-008, 009, **015**, 019; Low BUG-003, 007, 010, 011, 012,
> 018. BUG-008 tetap satu-satunya yang akibatnya terlihat pengunjung publik.
>
> **BUG-015 TIDAK ditutup, dan itu koreksi atas penandaan yang sempat salah
> dalam sesi yang sama.** Ia memuat dua cacat, dan yang diperbaiki hanya yang
> pertama (atribut `ConfirmActionModal`). Yang kedua — fokus tidak dipindahkan
> ke dalam `ConfirmTypeToDeleteModal` dan tidak dikurung di sana — masih utuh:
> berkas itu di `main` tak memuat satu pun `useRef` atau `focus()`. Laporan
> BUG-015 sendiri menyebut bagian kedua **lebih merugikan daripada yang
> pertama**, sebab `aria-modal="true"` yang sudah terpasang di sana menyuruh
> pembaca layar menyembunyikan isi halaman di luar dialog, sementara fokusnya
> tertinggal di luar — pemakai mendarat di ruang kosong. Pagarnya pun tak pernah
> menjangkau bagian itu: ketiga harapan di
> `pagar-bug-015-dialog-konfirmasi.test.jsx` seluruhnya tentang atribut
> `ConfirmActionModal`. Barisnya karena itu dibiarkan terbuka sampai bagian dua
> dikerjakan, dan hitungan Medium tetap empat, bukan tiga.
>
> BUG-017 dan bagian 1 BUG-015 dikerjakan dalam satu commit karena akar cacatnya
> satu kelas — kontrol yang terbaca mata dan bisu bagi pembaca layar — dan
> keduanya tinggal di `components/ui/` yang bersebelahan. Itu kebetulan yang
> menguntungkan, bukan alasan menggabungkan temuan lain: BUG-010 (nama tombol
> paginasi) sekelas dengan keduanya tetapi tinggal di komponen lain dan tetap
> terbuka.
>
> **(21 Oktober 2026, sore) BAGIAN 2 BUG-015 ikut dikerjakan, jadi barisnya kini
> benar-benar `Ditutup`.** Dihitung ulang dari baris tabelnya: 21 baris, dua
> belas `Ditutup` (BUG-001, 002, 004, 005, 006, 013, 014, **015**, 016, 017,
> 020, 021), sisanya 9 terbuka — Medium BUG-008, 009, 019; Low BUG-003, 007,
> 010, 011, 012, 018. Medium tinggal tiga, dan BUG-008 tetap satu-satunya yang
> akibatnya terlihat pengunjung publik. Catatan beberapa jam sebelumnya di atas
> yang menyatakan Medium tetap empat dibiarkan utuh sebagai rekaman saat itu.
>
> Cakupannya ternyata LEBIH LUAS daripada yang laporan BUG-015 sebutkan, dan itu
> terukur sebelum dikerjakan: kelima dialog ber-`role="dialog"` di `apps/web`
> tak satu pun mengurung fokus — nol `useRef`, nol `.focus()`, nol `inert` di
> semuanya — sementara keempat yang lain juga memasang `aria-modal="true"`. Jadi
> bentuk cacatnya sama persis di lima tempat; laporan ini hanya menyebut
> `ConfirmTypeToDeleteModal` karena di sanalah jejak Tab direkam. Kelimanya
> diperbaiki sekaligus lewat satu kait bersama, bukan satu berkas saja.
>
> **(21 Oktober 2026, malam) BUG-009 ditutup sebagai BARIS BASI**, dan dua
> catatan hitung-ulang di atas karena itu TERLALU BESAR satu: keduanya ikut
> menghitung baris yang kodenya sudah dibuang 30 September 2026. Keduanya
> dibiarkan utuh sebagai rekaman, dan angka yang benar ada di sini. Dihitung
> dari baris tabelnya: 21 baris, tiga belas `Ditutup`, sisanya **8 terbuka** —
> Medium BUG-008 dan BUG-019 saja; Low BUG-003, 007, 010, 011, 012, 018. Medium
> tinggal **dua**, bukan tiga, dan BUG-008 tetap satu-satunya yang akibatnya
> terlihat pengunjung publik.
>
> Keenam baris Low dan dua Medium itu diperiksa keberadaan kodenya pada hari yang
> sama supaya angka ini tidak mengulangi kesalahan yang sama: `MapSection.jsx`
> ada (BUG-003), `Pagination.jsx` ada (BUG-010), komponen OPD ada (BUG-011 dan
> 012), `complaints.service.ts:493` masih memanggil `notifyComplaintCreated`
> (BUG-018), `auth.controller.ts:168` masih meneruskan `error_description`
> (BUG-019), dan beranda publik masih merender formulirnya tanpa syarat
> (BUG-008).
>
> ⚠️ **BUG-007 menuntut pemeriksaan sendiri, dan BELUM dikerjakan.** Kolom
> **Halaman**-nya menyebut `/complaints/new`, dan rute itu TIDAK ADA — yang ada
> `app/(respondent)/complaints`. **KALIMAT ITU SALAH; koreksinya di
> [BUG-007](#bug-007).** `(respondent)` adalah route group Next.js, jadi segmen
> itu tak muncul di URL dan `/complaints/new` memang berfungsi. Kalimatnya
> dibiarkan utuh di sini sebagai rekaman kekeliruan, bukan dihapus. Sejauh itu
> ia sebasi BUG-009. Bedanya, cacatnya
> tampaknya TIDAK ikut hilang: medan unggahnya hidup di tiga tempat, dan
> `FileDropzone.jsx` kini membawa `accept="image/*,.pdf"` (baris 10, dipakai di
> 49) sedangkan `AdminResolutionWorkspace.jsx:245` dan
> `chat/ChatReplyForm.jsx:129` tidak menunjukkan `accept` maupun pemeriksaan
> ukuran sama sekali. Jadi dugaan terbaiknya: sebagian sudah tertutup di satu
> komponen dan masih terbuka di dua lainnya. Itu DUGAAN dari pembacaan cepat,
> bukan pengukuran — statusnya sengaja TIDAK diubah sampai ada yang
> memeriksanya dengan benar, sebab menurunkan severity atas dasar grep adalah
> cara lain membuat angka yang salah.
>
> ✅ **SUDAH DIUKUR pada hari yang sama, dan dugaan di atas KELIRU.** Rinciannya
> di [BUG-007](#bug-007). Yang ada di `FileDropzone.jsx` adalah atribut `accept`,
> BUKAN validasi: `handleFileSelect` dan `handleDrop` memasukkan setiap berkas
> tanpa memeriksa apa pun, dan `maxSizeMB` hanya dipakai di teks. Atributnya pun
> salah di kedua arah — `image/*` menawarkan GIF dan SVG yang ditolak backend,
> sementara teks di sebelahnya melewatkan WEBP yang diterima backend. Jadi tak
> ada bagian yang "sebagian tertutup"; kalimat laporan aslinya, "tidak ada satu
> pun pemeriksaan di sisi klien", masih akurat kata per kata. Severity tetap Low,
> statusnya tetap terbuka, dan hitungan 8 terbuka di atas tidak berubah.
>
> Peringatan itu sendiri pantas dicatat sebagai kekeliruan proses, bukan dihapus:
> ia ditulis setelah membaca baris tabel dan kolom kepala BUG-007 saja, padahal
> TUBUH laporannya sudah memuat diagnosis yang tepat untuk ketiga komponen
> beserta daftar MIME backend yang lengkap. Keraguan yang saya pasang di dokumen
> sudah dijawab oleh dokumen itu sendiri, satu bagian di bawahnya.
>
> **(21 Oktober 2026, malam) BUG-008 ditutup, dan ia pun sebagian besar sudah
> diperbaiki sejak 8 September 2026.** Dihitung dari baris tabelnya: 21 baris,
> **empat belas `Ditutup`**, sisanya **7 terbuka** — Medium tinggal **satu**,
> yaitu [BUG-019](#bug-019); Low BUG-003, 007, 010, 011, 012, 018. Dengan ini
> tak ada lagi temuan Medium di `apps/web`: satu-satunya yang tersisa berlapis
> `apps/api`.
>
> Kalimat "hanya BUG-008 yang akibatnya terlihat pengunjung publik" yang
> diulang beberapa catatan di atas berakhir di sini, sebab cacatnya sudah tidak
> ada. Kalimat-kalimat itu dibiarkan utuh sebagai rekaman bertanggal.
>
> **Pola yang muncul tiga kali hari ini pantas dinamai.** BUG-009 basi karena
> fiturnya dibuang; BUG-008 sebagian besar sudah diperbaiki enam hari sesudah
> dilaporkan; dan dugaan saya tentang BUG-007 keliru karena hanya membaca
> kepalanya. Ketiganya satu sebab: **status di tabel ini tidak pernah mengejar
> kode**, dan hitungan terbukanya dipakai orang untuk memutuskan apa yang
> dikerjakan berikutnya. Sebelum mengerjakan baris mana pun di dokumen ini,
> ukur dulu keadaannya di kode — tubuh laporannya, bukan baris tabel dan kolom
> kepalanya saja.
>
> Satu jebakan teknis dari pengukuran itu, yang sempat membuat saya salah:
> `ls` atas jalur yang ditebak BUKAN cara memeriksa keberadaan rute di Next.js
> App Router. Direktori ber-tanda-kurung adalah **route group** dan tidak muncul
> di URL, sehingga `app/(respondent)/complaints/new/page.jsx` melayani
> `/complaints/new`. Yang menjawabnya `find` atas berkas `page.jsx`-nya.

> ⚠️ **BUG-005 menuntut perhatian lebih dulu.** Ia satu-satunya temuan Critical,
> sudah terkonfirmasi, dan akibatnya menimpa warga langsung: survei terbit yang
> tidak dapat diselesaikan sama sekali. Reproduksi hidupnya bisa dibuka di
> `/surveys/333` pada lingkungan dev.
>
> **(16 Oktober 2026) BUG-005 SUDAH DITUTUP, dan dengan itu tak ada lagi temuan
> Critical yang terbuka — pertama kalinya sejak dokumen ini dibuat.** Peringatan
> di atas dibiarkan utuh sebagai rekaman bertanggal; yang menempati urutan
> teratas sekarang [BUG-013](#bug-013), satu-satunya High yang tersisa (survei
> di Sampah tetap terhitung pada statistik publik). Tautan `/surveys/333` di
> atas sudah mati sejak 4 September 2026 ketika reproduksinya dihapus.
>
> **(19 Oktober 2026) BUG-013 pun sudah ditutup, jadi tak ada lagi temuan
> Critical MAUPUN High yang terbuka.** Kalimat "yang menempati urutan teratas
> sekarang BUG-013" di atas dibiarkan sebagai rekaman tanggal itu. Tingkat
> tertinggi yang terbuka kini Medium, tujuh temuan; lihat catatan hitung ulang
> 19 Oktober di atas untuk apa yang dapat dan tidak dapat dikatakan tentang
> urutannya.

Tiga temuan pertama sudah diperbaiki tim dev dan diverifikasi ulang pada
2 September 2026. BUG-002 kini terkunci uji otomatis; BUG-001 belum.

**Ketujuh temuan terbaru kini terkunci uji otomatis (15 September 2026)** — keenam dari C-14…C-19, ditambah BUG-019 dari C-09.
Tak satu pun dari cacatnya sudah diperbaiki; yang dikunci adalah **momen
perbaikannya** — tiap pagar ditulis sebagai gagal-yang-diharapkan, sehingga
suite tetap hijau selama cacatnya ada dan MERAH begitu seseorang
memperbaikinya, menuntut anotasinya dicabut. Sejak saat itu ia jadi pagar
regresi sungguhan.

| Temuan | Pagar | Lapisan |
| ------ | ----- | ------- |
| [BUG-013](#bug-013) | `e2e/statistik-sampah.spec.js` | E2E (API) — **pagar regresi sungguhan sejak 19 Oktober 2026**, `test.fail()` dicabut |
| [BUG-014](#bug-014) | `e2e/notifikasi-siklus.spec.js` | E2E (API) |
| [BUG-015](#bug-015) bagian 1 | `pagar-bug-015-dialog-konfirmasi.test.jsx` | Jest + RTL — **pagar regresi sungguhan sejak 21 Oktober 2026**, `test.failing()` dicabut. Menjaga atribut `ConfirmActionModal` saja |
| [BUG-015](#bug-015) bagian 2 | `pagar-bug-015-fokus-dialog.test.jsx` | Jest + RTL — **lahir langsung sebagai pagar regresi** (21 Oktober 2026), harapan biasa yang dibuktikan merah lebih dulu, bukan `test.failing()`. Ditambah dua uji pemasangan di `GantiJenisModal.test.jsx` dan `ModalKirimSurvei.test.jsx` |
| [BUG-016](#bug-016) | `pagar-bug-016-captcha-gagal.test.jsx` | Jest + RTL — **pagar regresi sungguhan sejak 20 Oktober 2026**, `test.failing()` dicabut |
| [BUG-017](#bug-017) | `pagar-bug-017-dropdown.test.jsx` | Jest + RTL — **pagar regresi sungguhan sejak 21 Oktober 2026**, `test.failing()` dicabut |
| [BUG-018](#bug-018) | `e2e/notifikasi-siklus.spec.js` | E2E (API) |
| [BUG-019](#bug-019) | `e2e/sso-galat.spec.js` | E2E (API) |

> ⚠️ **PAGAR BUG-013 AKAN MERAH BEGITU `main` DITARIK KE CABANG INI.** Perbaikan
> BUG-013 mendarat di `main` pada 19 Oktober 2026, sedangkan
> `apps/web/e2e/statistik-sampah.spec.js` hidup HANYA di `tester` dan masih
> ditulis sebagai `test.fail()`. Itu memang rancangannya — anotasi itu ada
> justru untuk memerah pada momen perbaikan — tetapi akibatnya harus diduga
> lebih dulu, bukan ditemukan sebagai kejutan: pada merge berikutnya spec itu
> melapor `Expected to fail, but passed`. Yang harus dikerjakan saat itu:
> **cabut `test.fail()`-nya, jangan hapus specnya** — sejak saat itu ia pagar
> regresi sungguhan. Rinciannya di [TEST_CASES.md §Y.8](TEST_CASES.md).

> ✅ **SUDAH TERJADI, DAN SUDAH DIKERJAKAN pada hari yang sama (19 Oktober
> 2026).** `main` ditarik ke cabang ini beberapa jam sesudah peringatan di atas
> ditulis, dan anotasinya dicabut — specnya TIDAK dihapus. Peringatan itu
> dibiarkan utuh di atas, bukan dibuang, sebab ia catatan bahwa mekanismenya
> bekerja: cacat diperbaiki, pagar menuntut perhatian, pagar jadi penjaga.
>
> Satu hal yang TIDAK diandaikan dan karena itu diperiksa: merge itu menukar
> SELURUH `apps/api` di cabang ini, jadi pagar lain yang menjaga cacat backend
> bisa ikut lulus tanpa diduga. Ketiganya diperiksa di kodenya dan masih benar
> — BUG-014 (`operasiPemusnahanSurvei` menghapus lima tabel, notifikasi tak
> termasuk), BUG-018 (`complaints.service.ts:493` masih memanggil
> `notifyComplaintCreated`), BUG-019 (`auth.controller.ts:168` masih meneruskan
> `error_description`). Ketiga pagar `test.failing()` Jest juga masih benar, dan
> buktinya tak perlu dicari terpisah: suite web hijau seluruhnya, dan pagar yang
> sudah tak perlu akan memerahkannya.
>
> Pencabutan itu BELUM dijalankan lewat Playwright — `apps/api` belum hidup di
> mesin penguji saat commitnya dibuat. Yang sudah dipastikan hanya bahwa specnya
> tetap tersusun: `playwright test --list` melaporkan 2 uji tanpa membuka
> peramban dan tanpa menyentuh basis data.

> ✅ **SUDAH DIJALANKAN (20 Oktober 2026), dan ia MEMERAH DUA KALI lebih dulu.**
> `apps/api` hidup di mesin penguji hari ini, spec-nya dijalankan, dan hasil
> akhirnya 2 lulus / 2 uji kode=0 dalam 2,1 menit. Tetapi jalan pertamanya tidak
> hijau, dan dua sebabnya berlapis — keduanya BUKAN cacat aplikasi, dan bukan
> pula akibat pencabutan anotasi itu. Diperbaiki di `80e7667`.
>
> **Merah pertama: `POST /surveys — HTTP 400: Validation failed`**, dan uji
> keduanya tak pernah jalan. Spec itu ditulis terhadap kontrak survei sebelum
> 8 Oktober 2026, lalu merge `fbdf85c` menukar seluruh `apps/api` dengan versi
> `main`. Kontraknya mengubah TIGA hal sekaligus, jadi menambahkan satu medan
> saja tidak cukup: `jenis` wajib (`create-survey.dto.ts`, tanpa
> `@IsOptional()`); survei `skm_permenpanrb` LAHIR dengan sembilan unsur baku
> (`surveys.service.ts`, `questions: { create: buatUnsurAwal() }`), sehingga
> langkah `POST /surveys/:id/questions` yang lama bukan cuma tak perlu
> melainkan DITOLAK `assertBolehBuatPertanyaan`; dan setiap pertanyaan skala
> WAJIB dijawab (`responses.service.ts`), jadi satu jawaban saja dijawab 400.
> Kegagalannya hanya menunjuk yang pertama. **Satu kegagalan menutupi kegagalan
> sesudahnya** — pelajaran yang sama dengan `MENU_UMUM` 19 Oktober, muncul lagi
> dalam pekan yang sama.
>
> **Merah kedua: `Expected: 25, Received: null`.** `GET /statistics`
> disinggahkan di bawah kunci `statistik-publik` dengan TTL **60 detik**
> (`dashboard.service.ts:55-56`), dan TAK ADA yang membatalkannya: satu-satunya
> penyebutan lain kunci itu di seluruh `apps/api/src` adalah sebuah komentar.
> `ResponsesService` membatalkan singgahan HITUNGAN IKM, bukan singgahan
> statistik publik. Spec itu membaca `/statistics` tiga kali dalam setengah
> detik dan menuntut tiap bacaan sudah memuat tulisan yang baru saja terjadi;
> singgahannya lahir 8-9 Oktober 2026 dan spec-nya lebih tua. Pembacaannya kini
> `expect.poll` bertenggat 70 detik, sedikit di atas TTL, dan tenggat ujinya
> dinaikkan tersurat ke 150 detik — sebab tenggat yang sebenarnya berlaku
> adalah **bawaan Playwright 30 detik**; `timeout: 180_000` di
> `playwright.config.ts` milik blok `webServer`, bukan uji.
>
> Batasnya ikut dicatat alih-alih disembunyikan: lewat endpoint publik, pagar
> itu hanya dapat membuktikan kebenaran yang AKHIRNYA tercapai, bukan yang
> seketika. Mengosongkan Redis dari dalam spec ditolak — itu menyentuh
> infrastruktur bersama, dan membuat pengukurannya tak lagi mewakili apa yang
> dilihat pengunjung.
>
> **YANG MASIH BELUM TERBUKTI, dan tidak diakui terbukti:** hijaunya uji kedua
> menunjukkan penyaring `deletedAt` masih terpasang, tetapi TIDAK menunjukkan
> pagarnya mampu memerah. Untuk itu perlu satu mutasi pada `apps/api`, dan itu
> belum dikerjakan.
>
> ✅ **MUTASINYA DIKERJAKAN pada hari yang sama, dan pagarnya MEMANG memerah.**
> Penyaring `where: { survey: TIDAK_DIBUANG }` pada
> `prisma.ikmResult.findMany()` (`dashboard.service.ts:337`) dibuang sementara,
> spec dijalankan, lalu dipulihkan di blok `finally` — `git status` kosong
> sesudahnya. Hasilnya tepat seperti yang dituntut dari pagar yang sehat: uji
> KENDALI tetap hijau, dan uji pagarnya memerah dengan `Received: 25`, yakni
> snapshot IKM milik survei yang sudah berada di Sampah muncul kembali di tren
> publik.
>
> Sasaran mutasinya dipilih dari kode, bukan dikira. Membuang survei `aktif`
> MENUTUPNYA lebih dulu lalu menerbitkan snapshot IKM
> (`surveys.service.ts:302-320`), sehingga sesudah masuk Sampah survei itu
> keluar dari jalur `activeSurveys` dan masuk lewat `ikmResult` — jadi satu
> baris itulah penjaga satu-satunya di jalur ini, dan ia persis baris yang
> disebut laporan BUG-013.
>
> Dengan ini pagar BUG-013 terbukti DUA ARAH: hijau saat penyaringnya ada,
> merah saat dibuang. Itu syarat yang sama yang berlaku bagi kelima pagar lain
> di dokumen ini.
>
> Jejak BUG-014 ikut terlihat hidup, bukan dibaca dari kode: tiap jalan
> meninggalkan notifikasi tanpa induk sesudah survei ujinya dimusnahkan, dan
> `bersihkan-data-uji.mjs --tanpa-induk` menghapus 4 lalu 2 baris. Nol survei
> dan nol respons tertinggal. `audit_logs` TIDAK disentuh: 528 menjadi 556
> baris, semata karena `dev-login` tiap jalan.

> ℹ️ **PAGAR BUG-015 DAN BUG-017 TIDAK akan mengejutkan merge berikutnya, dan
> sebabnya struktural** (21 Oktober 2026). Peringatan panjang tentang pagar
> BUG-013 di atas berlaku karena spec-nya hidup HANYA di `tester`, sementara
> perbaikannya mendarat di `main` — dua cabang bergerak terpisah, lalu bertemu.
> Kedua pagar Jest ini lain: berkasnya hidup di KEDUA cabang
> (`apps/web/src/components/ui/__tests__/`), jadi perbaikan komponennya dan
> pencabutan `test.failing()`-nya masuk sebagai SATU commit di `main` (`4d0080b`).
> Menarik `main` ke cabang ini membawa keduanya sekaligus; tak ada keadaan
> antara di mana cacatnya sudah hilang tetapi anotasinya masih memalang.
> Terukur, bukan diandaikan: `git diff tester main` atas empat berkas itu
> menunjukkan tepat satu himpunan perubahan, 117 insertions / 39 deletions.
>
> Pembuktian dua arahnya pun tidak menuntut mutasi sementara seperti BUG-013,
> sebab arah merahnya sudah terjadi pada kode produksi yang sungguhan: pada
> garis dasar sebelum perbaikan keenam harapan itu MEMANG gagal — `test.failing()`
> hanya lulus bila ujinya benar-benar gagal — dan sesudah atributnya dipasang
> keenamnya memerah dengan `Failing test passed even though it was supposed to
> fail`, lalu hijau begitu anotasinya dicabut. Hijau-saat-ada dan merah-saat-
> tiada keduanya teramati, dan tanpa satu pun baris kode produksi dirusak
> sengaja.

Tiap pagar didahului **uji kendali yang wajib lulus**, dan tiap-tiap dibuktikan
**dua arah**: cacatnya diperbaiki sementara di kode produksi, pagarnya diamati
memerah, lalu mutasinya dikembalikan. Tanpa langkah itu, gagal-yang-diharapkan
hanyalah uji yang gagal karena sebab apa pun. Rinciannya di
[TEST_CASES.md §Y.8](TEST_CASES.md).

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

**Ditutup 23 Oktober 2026** — `2daf59b`, merge `060a3b9` di `main`.
**Temuan tertua yang masih terbuka, dan dengan ini daftar ini NOL TERBUKA untuk
pertama kalinya sejak dibuat 12 Agustus 2026.**

Berkasnya dihapus, bukan dipertahankan dengan catatan — dan alternatif kedua
yang laporan ini sendiri tawarkan diperiksa lebih dahulu, bukan dilewati.
"Hasil yang diharapkan" di atas berbunyi *"atau kalau memang direncanakan
dipakai, ada catatan yang menerangkannya"*. Tak ada catatan semacam itu, dan
tak ada rencananya: pencarian "peta", "maps", "lokasi kantor", dan "google map"
di `README.md` maupun PRD menghasilkan **nol sebutan**. Jadi menghapus adalah
jalan yang benar di sini, bukan sekadar yang lebih singkat.

**Diperiksa ulang sebelum menghapus**, bukan dipercayai dari laporan ini:
pencarian atas seluruh repo menemukan **satu** kemunculan `MapSection`, yaitu
barisan definisinya sendiri. Keempat saudaranya di `components/sections/`
semuanya hidup — `HeroSection` di 5 berkas, `KartuStatistikHero` 4, `HelpBox`
dan `ServiceSelector` masing-masing 1 — jadi yang mati komponen ini saja, bukan
foldernya. Riwayatnya satu commit, `7bd05d1`, integrasi frontend Next.js ke
monorepo: ia datang bersama impor frontend awal dan tak pernah sekali pun
dipasang.

**Ada alasan kedua di luar soal kode mati**, dan itu sebabnya ini bukan
kerapian semata: berkas itu **satu-satunya `<iframe>` di seluruh
`apps/web/src`**. Membuangnya menghapus satu-satunya sematan pihak ketiga di
frontend — `maps.google.com`, yang memasang cookie dan menerima rujukan lewat
`referrerPolicy="no-referrer-when-downgrade"`. Pada sistem layanan publik yang
isi pengaduan dan lampirannya dienkripsi at-rest, sematan yang tak pernah
diminta siapa pun adalah permukaan yang tak ada gunanya dipertahankan.

Dapat dipulihkan dari `7bd05d1` bila peta sungguh dibutuhkan kelak; itulah
sebabnya tak ada yang disalin ke tempat lain sebelum menghapus.

Suite web tetap 217 suite / 1818 uji sesudah penghapusan — angka yang sama
dengan sebelumnya, jadi tak ada satu pun berkas uji yang mengimpornya.

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

**DITUTUP 16 Oktober 2026** — commit `6d2f298` di `main`.

**Akar masalahnya dua lapis, dan lapis kedualah yang membuatnya diam.** Pertama,
datanya tak pernah dibaca: `duplicate()` memuat `include: { questions: true }`
tanpa relasi `options`, lalu menyalin lima medan skalar saja, sehingga opsinya
mustahil tersalin — ia tak pernah ada di memori. Kedua, penjaganya tak berada di
jalur ini dan tak pernah akan: `QuestionsService` memang melempar
"Pertanyaan pilihan ganda memerlukan minimal 2 opsi", tetapi salinan dibuat
lewat `prisma.survey.create` dengan nested create dan melewati
`CreateQuestionDto` sepenuhnya. Aturan itu menjaga pintu yang tidak dilewati
duplikasi, dan itulah sebabnya cacat ini melahirkan survei buntu tanpa satu pun
galat.

**Perbaikannya** memuat relasi `options` (diurut `urutan` naik) lalu menyalin
`label`, `nilai`, dan `urutan` per opsi. `nilai` ikut disalin, bukan dihitung
ulang: pada tipe skala ia skor yang menjadi dasar rumus IKM, dan menyalin label
tanpa skornya akan menggeser bobot tanpa ada yang memerah.

**Uji yang menjaganya merah lebih dulu oleh cacatnya sendiri, bukan oleh
mutasi.** Satu uji e2e baru di `apps/api/test/surveys.e2e-spec.ts` membuat
survei `custom` berisi satu `pilihan` tiga opsi dan satu `skala` berlabel
tersuai empat opsi, menduplikasinya, lalu membaca salinannya. Jalan pertama
melaporkan `Expected: 7, Received: 0` — angka yang sama persis dengan bukti
2 September di atas (`asli=7 salinan=0`). Uji itu juga memeriksa bahwa opsi
salinan adalah BARIS BARU, bukan baris yang sama dipakai bersama, supaya
menyunting salinan tak pernah mengubah survei aslinya.

**SATU KOREKSI ATAS LAPORAN DI ATAS, dan ia mengubah cara membaca tabel dua
gejala itu.** Laporan ini menyamakan "pilihan ganda kehilangan opsi" dengan
"label skala kembali ke baku". Keduanya tidak sepadan. `QuestionOption` pada
tipe `skala` memang OPSIONAL menurut rancangan: `buatUnsurAwal()` sengaja tidak
membuatnya, dan tak ada konstanta label skala di backend sama sekali, sehingga
frontend jatuh ke `DEFAULT_SCALE_LABELS`. Terukur di `skm_db` pada 16 Oktober
2026: **46 dari 46** pertanyaan `skala` tidak punya satu pun opsi, dan itu
keadaan normal, bukan kerusakan. Jadi label skala yang "kembali ke baku" adalah
kehilangan PENYESUAIAN, bukan kebuntuan. Yang membuat responden buntu hanya
tipe `pilihan`. Keduanya tetap sembuh oleh perbaikan yang sama, tetapi
beratnya perlu dibedakan agar severity-nya dapat dinilai jujur.

**Tiga uji unit memerah oleh perbaikan ini, dan yang dibetulkan TIRUANNYA.**
Ketiganya di `surveys.service.spec.ts` memodelkan hasil kueri yang kini tak
mungkin terjadi — pertanyaan tanpa `options` — sehingga gagal dengan
`Cannot read properties of undefined (reading 'map')`. Menulis `q.options ?? []`
di `duplicate()` akan menghijaukan ketiganya seketika dan sekaligus
menghidupkan kembali persis mode kegagalan yang melahirkan temuan ini: bila
suatu saat `include` itu terhapus lagi, duplikasi akan diam-diam membuang
seluruh opsi tanpa ada yang memerah. Dibiarkan tegas, penghapusan itu melempar
seketika.

**YANG TIDAK DISEMBUHKAN PERBAIKAN INI.** Salinan yang SUDAH rusak tetap rusak.
Survei yang pernah diduplikasi sebelum commit itu tetap kehilangan opsinya, dan
bila ada yang sudah terbit, ia tetap buntu sampai opsinya diisi ulang lewat
builder.

Basis data pengembangan diperiksa pada 16 Oktober 2026 — baca-saja, dijalankan
di dalam kontainer lewat `docker compose exec db` — dan **nol** pertanyaan
`pilihan` ditemukan tanpa opsi. **Hasil itu membuktikan lebih sedikit daripada
kelihatannya**, dan perlu dibaca apa adanya: `skm_db` juga memuat **nol** survei
berjudul `(Salinan)`, jadi jalur duplikasinya memang tak pernah dipakai di sana.
Ketiadaan kerusakan bukan bukti keamanannya. Basis data produksi TIDAK diperiksa
dan tidak boleh diprobe dari sini, sehingga pertanyaan "apakah ada salinan rusak
yang sudah terbit" tetap TERBUKA di luar lingkungan pengembangan.

**Celah uji yang diketahui dan dibiarkan:** tak ada uji yang menjaga bahwa entri
`unsurPelengkap()` TETAP tanpa `options`. Bila seseorang menambahkan label baku
di sana, arti "tanpa opsi" berubah dari "pakai label baku PermenPANRB" menjadi
sesuatu yang lain, tanpa ada yang memerah. Hanya komentar yang menjaganya hari
ini.

**Verifikasi:** e2e `apps/api` penuh 41 suite / 445 uji lulus (444 sebelumnya,
+1 dari uji baru); unit `apps/api` 84 suite / 1.359 uji lulus;
`tsc --noEmit -p tsconfig.spec.json` kode=0; eslint seluruh repo kode=0;
`prettier --check` kode=0.

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
| [AdminResolutionWorkspace.jsx:245](../apps/web/src/features/complaints/components/AdminResolutionWorkspace.jsx#L245) | **tanpa `accept` sama sekali** — menawarkan segala jenis berkas |
| [ChatReplyForm.jsx:129](../apps/web/src/features/complaints/components/chat/ChatReplyForm.jsx#L129) | **tanpa `accept` sama sekali**                             |
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

#### Diukur ulang 21 Oktober 2026 — MASIH TERBUKA, dan perbaikan yang diusulkan di atas BELUM CUKUP

Baris ini diperiksa ulang sebab kolom **Halaman**-nya menunjuk rute yang tiada,
pola yang sama yang membasikan [BUG-009](#bug-009). Hasilnya berbeda: di sini
cacatnya **tidak** ikut hilang. Diagnosis di tubuh laporan ini terbukti masih
akurat kata per kata, termasuk daftar MIME backend yang memuat `image/webp`.

Empat hal yang bergeser atau tak pernah tercatat:

**1. Rutenya ADA, dan dugaan sebelumnya di baris ini keliru.** Versi pertama
catatan ini menyatakan `/complaints/new` tidak ada. **Itu salah**, dan
kekeliruannya instruktif: berkasnya memang bukan `app/complaints/new/page.jsx`
melainkan `app/(respondent)/complaints/new/page.jsx`, dan `(respondent)` adalah
**route group** Next.js — tanda kurung berarti segmen itu TIDAK muncul di URL.
Jadi URL `/complaints/new` berfungsi seperti yang tertulis sejak awal. `ls` atas
jalur yang ditebak bukan cara memeriksa keberadaan rute di App Router; yang
menjawabnya `find` atas berkas `page.jsx`-nya.

Formulirnya hidup di `features/complaints/components/CreateComplaintForm.jsx`
dan dirender di DUA tempat: rute itu, serta `app/page.jsx` (beranda publik,
lihat [BUG-008](#bug-008)). Langkah reproduksi di atas karena itu dapat
dijalankan apa adanya.

**2. Nomor barisnya bergeser**, dan sudah dibetulkan di tabel di atas:
`AdminResolutionWorkspace.jsx` 157 → **245**, `ChatReplyForm.jsx` 87 → **129**.
Rujukan `complaints.service.ts:37-39` untuk batas backend juga basi — baris itu
kini pernyataan `import`. Sumber yang benar: `complaints.constants.ts:32`
(`BATAS_UKURAN_LAMPIRAN_BYTES = 5 * 1024 * 1024`), `attachment.util.ts` (daftar
`ALLOWED` beserta pemeriksaan angka ajaib), dan `complaints.controller.ts:66`
serta `:168` (`limits: { fileSize, files: 5 }`).

**3. `accept` TIDAK BERLAKU UNTUK SERET-LEPAS, dan inilah yang membuat perbaikan
yang diusulkan di atas belum cukup.** Usulannya berbunyi "pasang atribut itu pada
ketiga input, dan tolak berkas >5 MB di `handleFileChange`". `FileDropzone` punya
JALUR KEDUA yang tak lewat keduanya: `handleDrop` membaca
`e.dataTransfer.files` dan memasukkan semuanya tanpa syarat. Atribut `accept`
hanya menyaring kotak dialog pemilih berkas, bukan berkas yang dijatuhkan — jadi
`.exe` tetap masuk lewat seretan walau ketiga `accept` sudah benar. Pemeriksaannya
harus duduk di satu fungsi yang dipanggil KEDUA jalur, bukan di `handleFileChange`
saja. Dropzone-nya memang mengiklankan seret-lepas secara tersurat ("Klik atau
seret berkas").

**4. Dua pernyataan di layar yang tidak benar**, keduanya di `FileDropzone.jsx`
dan tak disebut laporan asli:

- Teksnya berbunyi "Format: JPG, PNG, PDF" — **melewatkan WEBP**, padahal backend
  menerimanya. Jadi pemakai diberi tahu daftar yang lebih sempit daripada yang
  sebenarnya boleh.
- Labelnya berbunyi **"File berhasil diunggah"** begitu berkas DIPILIH, padahal
  belum satu bita pun dikirim: `onFilesChange` hanya menaruhnya di state
  pemanggil, dan unggahannya baru terjadi saat formulirnya disubmit. Pemakai yang
  menutup tab di titik itu meyakini lampirannya sudah aman.

Butir terakhir ini bisa dibilang temuan sendiri, bukan bagian BUG-007 — ia soal
kejujuran pesan, bukan validasi. Dicatat di sini alih-alih dibuatkan baris baru,
sebab penomoran temuan milik pemilik dokumen; silakan dipecah bila dinilai layak.

**Severity tetap Low.** Backend-nya sungguh-sungguh sehat — daftar izinnya
diperiksa terhadap angka ajaib isi berkas, bukan header `Content-Type`, sehingga
`.exe` bernama `.png` pun tertolak. Tak ada risiko data, dan kalimat tentang
kuota warga di atas tetap alasan terbaik bila tim hendak menaikkannya.

`maxSizeMB` masih hanya dipakai di teks, dan kedua `handleFileChange` di komponen
percakapan masih berisi `setFile(e.target.files[0])` tanpa satu pun pemeriksaan.

#### 23 Oktober 2026 — separuh diperbaiki (`28574df`, merge `33b70d4`), dan statusnya SENGAJA tetap terbuka

Perlu dibaca tersurat supaya tak ada yang menyangkanya beres: yang diperbaiki
**hanya jalur warga**, yaitu `FileDropzone.jsx`. Kolom **Peran** baris ini
menyebut tiga peran, dan dua di antaranya — Admin OPD dan Kabupaten di panel
balasan — belum tersentuh sama sekali.

**Yang sudah dikerjakan**, seluruhnya di `FileDropzone.jsx`:

- Jenis, ukuran, dan **batas 5 berkas** diperiksa di satu fungsi,
  `saringBerkas`, yang dipanggil **kedua** jalur: pemilih berkas dan
  seret-lepas. Inilah butir 3 pengukuran 21 Oktober — `accept` tak berlaku bagi
  berkas yang dijatuhkan, jadi pemeriksaan di `handleFileChange` saja tak akan
  pernah cukup.
- Yang sah tetap diterima walau ada yang ditolak dalam kumpulan yang sama, atas
  persetujuan tersurat pengguna. Menolak seluruhnya berarti warga kehilangan
  pilihan yang sudah benar.
- Penolakannya dilaporkan di dalam komponen, ber-`role="status"` — tanpa itu
  pengguna tunanetra hanya mengalami berkasnya tak muncul, tanpa sebab apa pun
  di layar.
- Kedua pernyataan layar pada butir 4 dibetulkan: WEBP ikut disebut, dan "File
  berhasil diunggah" menjadi "Siap dikirim".
- Prop `accept` dibuang. Tak seorang pemanggil pun mengirimnya, dan ia menjadi
  jebakan begitu validasi ada: menimpanya hanya melonggarkan dialog pemilih
  berkas sementara `saringBerkas` tetap menolak.

**Yang BELUM**, dan karena itu baris ini tetap terbuka: `AdminResolutionWorkspace.jsx`
dan `ChatReplyForm.jsx` masih `setFile(e.target.files[0])` tanpa satu pun
pemeriksaan, dan masih **tanpa `accept`** sama sekali. Keduanya menuntut
penampung pesan penolakan tersendiri di dua layar admin — bukan pekerjaan yang
dapat diselipkan, jadi ia dipisah atas persetujuan tersurat pengguna.

Derajatnya di sana memang lebih ringan daripada di jalur warga: admin bekerja
dari jaringan kantor, bukan dari kuota ponsel, dan itulah alasan utama baris ini
dinilai Low sejak awal. Tetapi "lebih ringan" bukan "tidak ada".

**Satu cacat yang ditemukan saat mengerjakan ini dicatat terpisah, bukan
digabung ke sini**, sebab ia soal fungsi yang hilang alih-alih validasi:
[BUG-031](#bug-031).

#### Ditutup SELURUHNYA 23 Oktober 2026 — `87a8eed`, merge `bede540` di `main`

Separuh yang tersisa dikerjakan pada hari yang sama, beberapa jam sesudah
catatan di atas ditulis. Baris ini kini benar-benar tertutup: ketiga peran pada
kolom **Peran** sudah terjaga.

**Aturannya diangkat keluar, bukan disalin.** Berkas baru
`apps/web/src/utils/lampiran.js` memegang daftar jenis, `BATAS_MB`,
`MAKS_BERKAS`, `formatMb`, `labelJenis`, `saringBerkas`, dan
`periksaSatuBerkas`. Sebelumnya aturan itu hidup **di dalam**
`FileDropzone.jsx`, dan menyalinnya ke dua komponen percakapan akan
menjadikannya **tiga** salinan batas backend yang tak ada penyinkronnya — cacat
berikutnya yang menunggu.

`periksaSatuBerkas` pembungkus tipis di atas `saringBerkas`, bukan aturan kedua
yang mirip: kedua panel percakapan menerima satu berkas, bukan larik, jadi
batas jumlah tak berlaku di sana sementara sisanya harus menolak hal yang sama
persis. `BATAS_MB` menjadi sumber tunggal batas ukuran, dan baku prop
`maxSizeMB` di `FileDropzone` diambil dari sana — tanpa itu klaim "satu sumber"
tidak benar.

**Bukti bahwa pemindahannya netral terhadap perilaku:** 37 uji `FileDropzone`
tetap hijau **tanpa satu uji pun disunting**.

**Pada kedua panel:** `accept` dipasang dan disamakan dengan daftar backend,
`periksaSatuBerkas` dijalankan sebelum berkasnya dipasang, dan penolakannya
tampil di slot cip lampiran — kuning, ber-`role="status"` yang sopan, seragam
dengan jalur warga. Nilai input direset sesudah setiap pilihan; tanpa itu
`onChange` tak terbit untuk nilai yang tidak berubah, sehingga pengguna yang
memperkecil berkasnya lalu memilih berkas **bernama sama** melihat layar yang
seolah tak melakukan apa-apa.

**Dua cacat samping di baris yang memang dibuka**, atas persetujuan tersurat
pengguna. Tombol hapus di kedua cip tak pernah punya nama — isinya hanya ikon
silang, kelas [BUG-010](#bug-010) — dan kini menyebut berkas mana yang akan
dibuang. Ukuran berkas masih dicetak `toFixed(2)` bertitik, sementara `formatMb`
yang lahir bersama [BUG-032](#bug-032) memakai koma; dibiarkan, satu aplikasi
mencetak ukuran dengan dua gaya.

**Sepuluh pagar baru**, lima per komponen, seluruhnya dibuktikan merah lebih
dulu.

**Tiga kekeliruan penguji dalam mengerjakan ini dicatat apa adanya**, sebab dua
di antaranya kelas yang sudah tercatat di `CLAUDE.md` dan yang ketiga uji yang
hampa:

1. Pola berbaris banyak gagal mencocokkan karena sumbernya memuat **spasi di
   ujung baris** (`<button `, `type="button" `) yang tak terbawa saat polanya
   ditulis ke berkas skrip — lewat alat tulis berkas maupun heredoc. Penjaga di
   skrip memerah dan **nol berkas tersentuh**; jangkarnya lalu dipersempit jadi
   satu-dua baris yang tak menyentuh ujung baris.
2. Komentar JSX disisipkan **di dalam** tag `<button>` pembuka, yang tidak sah.
   Hasilnya `Tests: 0 total` — galat kompilasi, bukan uji merah — dan sebabnya
   dibaca alih-alih disangka: `Expected '</', got '}'`.
3. Asersi "berkasnya tidak terpasang" ditulis `queryByText('foto.jpg')`, dan itu
   **hampa**: kabar penolakan memang menyebut nama berkasnya, jadi asersinya
   menemukannya di sana alih-alih di cip lampiran. Diganti
   `queryByRole('button', { name: 'Hapus foto.jpg' })`, dan penggantinya
   dibuktikan **membedakan** lewat mutasi — `setFile` dipanggil walau ditolak,
   dan ujinya memerah persis di baris itu.

<a id="bug-008"></a>

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

#### Ditutup (21 Oktober 2026) — cacat utamanya sudah diperbaiki 8 September 2026

**Barisnya terbuka jauh lebih lama daripada cacatnya.** Diukur di kode, bukan
dikira: kedua formulir sudah sadar sesi lewat `useSesiAktif` sejak 8 September
2026, enam hari sesudah laporan ini dibuat.

| Komponen | Keadaan |
| -------- | ------- |
| `CreateComplaintForm.jsx` | penampung dropdown berbunyi "Masuk untuk melihat daftar instansi" dan "Masuk untuk melihat kategori"; `handleSubmit` menahan pengiriman sebelum permintaan dikirim bila tanpa sesi |
| `SurveyForm.jsx` | empat keadaan: tanpa sesi, memuat, gagal muat, siap; juga menahan submit |
| Deteksi sesinya | `isAuthenticated` menangani KEDUA jalur — token dev-login di `localStorage`, dan SSO lewat `SSO_EXPIRES_KEY` yang dititipkan backend saat callback. Cookie `session` yang HttpOnly tak perlu dibaca |

Jadi kalimat **Hasil sebenarnya** di atas, "tidak ada satu kalimat pun di halaman
itu yang menyebutkan perlunya masuk", sudah tak benar sejak 8 September 2026.
Kalimatnya dibiarkan utuh sebagai rekaman bertanggal.

`app/page.jsx` memang masih merender kedua formulir tanpa syarat, dan itu kini
BENAR: yang menjelaskan keadaannya formulirnya sendiri, di tempat pengguna
sedang melihat.

**Sisa yang baru ditutup hari ini**, di `main` lewat commit `59cf954`:
`CreateComplaintForm` mengambil `data` saja dari `useAsync` dan membuang
`isLoading` serta `error`, sehingga bagi pengguna yang SUDAH masuk kegagalan
pengambilan terlihat sama persis dengan daftar yang memang kosong. Kini keempat
keadaannya dibedakan, teksnya disalin dari `SurveyForm` untuk jalur instansi
supaya kedua formulir terbaca identik. Dikunci empat uji di
`CreateComplaintForm.test.jsx`, yang memakai galat **500** dan bukan 401 — 401
berarti "tak ada sesi", cabang yang sudah ditangani dan yang juga memicu
`clearSession()` di interseptor.

**Usulan perbaikan asli di laporan ini TIDAK dijalankan, dan itu disengaja.** Ia
berbunyi "tampilkan ajakan masuk menggantikan formulir". Paragraf ajakan beserta
tautan "Masuk sekarang" di bawah dropdown pernah benar-benar ada, dan pengguna
meminta keduanya DIHAPUS pada 8 September 2026 karena satu pesan pada penampung
dropdown sudah cukup (tercatat di docblock `SurveyForm.jsx`). Membangunnya
kembali berarti memasang ulang persis apa yang sengaja dibuang. Keputusan produk
yang laporan ini sebut mendahului perbaikan teknisnya juga sudah terjawab oleh
kode: `POST /complaints` menuntut token, jadi jawabannya "warga harus masuk".

Keadaan "memuat" dan "gagal dimuat" tidak dapat dicapai dengan menekan tombol di
peramban; keduanya menuntut penyuntikan kegagalan. Keempatnya diuji terhadap
render komponen sungguhan lewat Jest + MSW. Verifikasi di peramban TIDAK
dijalankan, sebab `next dev` sedang mati (`http://skema.local` menjawab 502) dan
server itu milik penguji.

---

---

<a id="bug-009"></a>

### BUG-009 — Akun terlanjur dibuat ketika penetapan statusnya gagal

| Butir          | Isi                                                     |
| -------------- | ------------------------------------------------------- |
| **Severity**   | Medium                                                  |
| **Verifikasi** | Terkonfirmasi di peramban, 3 September 2026 (sesi C-05) |
| **Berkas**     | `src/app/admin-kab/users/create/page.jsx:112-131` — **jalur ini sudah tidak ada sejak 30 September 2026** |
| **Peran**      | Superuser (halaman ini `SUPERUSER_ONLY_PREFIXES`) — **keduanya sudah tidak ada**: peran dilebur 15 September 2026, konstantanya dibuang bersamanya |

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

#### Ditutup sebagai BARIS BASI (21 Oktober 2026) — bukan diperbaiki

**Cacatnya tak dapat diperbaiki karena kodenya sudah tidak ada.** Halaman "Buat
Akun Admin Baru" dibuang **30 September 2026**, tiga minggu sebelum catatan
hitung-ulang terakhir di dokumen ini ditulis. Diukur, bukan diingat:

| Yang diperiksa | Hasil |
| -------------- | ----- |
| `apps/web/src/app/admin-kab/users/create/` | tidak ada |
| `createUser` di `features/users/services/users.api.js` | tidak ada — docblock berkasnya menyatakan sendiri "TANPA `createUser`. Halaman 'Buat Akun Admin Baru' dibuang 30 September 2026" |
| pemanggil `updateUserStatus` | satu, `app/admin-kab/users/page.jsx:160` — panggilan TUNGGAL atas pengguna yang sudah ada |
| `SUPERUSER_ONLY_PREFIXES` | tidak ada |

Urutan dua panggilan yang menjadi akar cacat ini karena itu tidak ada lagi di
mana pun, dan tidak PINDAH ke tempat lain: akun kini hanya lahir dari SSO
(`SsoService.createUser` di backend), sehingga tak ada lagi antarmuka yang
membuat akun lalu menonaktifkannya dalam dua langkah.

Statusnya `Ditutup`, bukan `Ditolak`. Ia memang cacat sungguhan dan terkonfirmasi
di peramban pada 3 September 2026; yang menutupnya pembuangan fiturnya, bukan
perbaikan. Dibedakan supaya tak terbaca sebagai temuan yang keliru dilaporkan.

**Yang pantas dipelajari dari baris ini bukan cacatnya, melainkan kebasiannya.**
Kebasian itu SUDAH TERDETEKSI delapan hari sebelumnya di dokumen sebelah:
`TEST_CASES.md` baris TC-FE-044 memuat "**bukan** `/admin-kab/users/create` —
rute itu tak ada; yang ada `users/[id]/edit`, diperiksa 13 Oktober 2026". Catatan
itu tak pernah menyeberang ke sini, sehingga dokumen ini terus menghitung
BUG-009 sebagai Medium yang terbuka selama delapan hari sesudah ada orang yang
membuktikan rutenya tiada. Baris TC-nya sendiri bahkan masih menyebut BUG-009
hidup di kalimat yang sama yang menyangkal rutenya.

**Akibatnya pada angka, dan itu bukan soal kerapian.** Hitungan terbuka dipakai
orang untuk memutuskan apa yang dikerjakan berikutnya. Dua catatan hitung-ulang
yang ditulis 21 Oktober 2026 menyatakan "Medium tinggal empat" lalu "Medium
tinggal tiga"; keduanya ikut menghitung BUG-009. Yang benar satu kurang.

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

**Ditutup 23 Oktober 2026 — TANPA satu baris perubahan kode, dan itu perlu
dijelaskan.**

`Pagination.jsx` sudah membawa `aria-label="Halaman sebelumnya"` dan
`aria-label="Halaman berikutnya"` di `main` maupun `tester`. Pelakunya commit
`7bc0b83`, "feat(web): halaman riwayat notifikasi untuk ketiga peran" —
diperbaiki **sambil lalu** saat halaman riwayat notifikasi ditulis
13 September 2026, bukan sebagai penutupan temuan ini. Karena tak ada yang
kembali memeriksa daftar temuan, statusnya tertinggal `Baru` selama enam
minggu, dan rekap di dokumen ini menghitungnya terbuka selama itu pula.

Namanya pun sudah terkunci uji, bukan sekadar ada: `getByLabelText('Halaman
berikutnya')` dipakai di `admin-kab/complaints/__tests__/page.test.jsx:132,142`
dan `admin-opd/complaints/__tests__/page.test.jsx:278,290`. Nama itu tak dapat
hilang tanpa empat uji memerah.

**Yang BENAR-BENAR berubah hari ini satu uji**, dan justru butir "menolong
pengujian" di atas yang menagihnya. `admin-kab/opd/__tests__/page.test.jsx`
(TC-FE-013) masih menebak tombolnya lewat POSISI —
`paginationContainer.querySelectorAll('button')[1]` — persis cara yang
paragraf itu sebut diam-diam ikut rusak begitu tata letaknya berubah. Kini ia
memakai `getByLabelText('Halaman berikutnya')`. Ini perapian uji, **bukan bukti
perbaikan**: ia hijau pada jalan pertama, sebab `aria-label`-nya sudah
terpasang sejak sebulan sebelumnya.

Pelajarannya bukan soal paginasi. Perbaikan yang datang sambil lalu tidak
menutup temuan dengan sendirinya, dan temuan yang tak pernah diperiksa ulang
akan terus dilaporkan terbuka walau kodenya sudah benar. Di sini `aria-label`-nya
hadir di KEDUA cabang, jadi sebabnya bukan ketertinggalan `tester` yang
diukur [CAT-023](#cat-023) — semata tak ada yang memeriksa ulang.

**Satu cacat sejenis yang TIDAK ditutup di sini, supaya tak terbaca sudah
beres.** Tombol lipat sidebar — `AdminSidebar.jsx:125` dan
`AdminKabSidebar.jsx:141` — juga berisi ikon saja, dan namanya datang dari
`title`, bukan `aria-label`. `title` memang sumber nama yang sah menurut
spesifikasi accname, tetapi pilihan terakhir, dan di peranti sentuh ia tak
pernah muncul. Itu temuan tersendiri yang derajatnya lebih ringan daripada
BUG-010 (nama ADA, hanya lemah), jadi ia tidak digabungkan ke sini dan belum
dicatat sebagai temuan baru.

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

**Ditutup 23 Oktober 2026** — `6b8ee7e`, merge `4a39ac4` di `main`.

Perbaikannya persis yang diharapkan di atas, satu kata, pada
`admin-kab/opd/page.jsx:28`. Uji dibuktikan merah lebih dulu: mencari
`'  DINAS  '` menjawab "Unable to find an element with the text: Dinas
Kesehatan", yaitu nol hasil, persis gejala yang dilaporkan.

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

**Ditutup 23 Oktober 2026** — `6b8ee7e`, merge `4a39ac4` di `main`.

Keduanya dikerjakan: kalimatnya kini menyebut lima angka, dan bannernya
berubah kuning (`bg-amber-50`) bila yang dilewati lebih dari nol. Kontras
`amber-700` di atas `amber-50` **diukur, bukan dikira**: 4,84:1 — lulus WCAG AA
untuk teks biasa, sejajar dengan emerald yang dipakai sekarang (5,21:1).

**Nol pun disebut tersurat**, "0 dilewati", atas persetujuan tersurat pengguna
di antara tiga pilihan. Alasannya: kalimat yang menghilangkan angkanya saat nol
tidak dapat dibedakan dari kalimat yang sekadar tidak melaporkannya — tepat
keadaan yang membuat temuan ini lahir. Nol menjadi bukti positif.

`report.skipped` sengaja tidak dijaga `?? 0`. Backend selalu mengirimnya
(`opd.service.ts` memulainya dari 0 lalu selalu menyertakannya dalam laporan),
dan jaga-jaga di sini hanya akan menyembunyikan kontrak yang patah di balik
angka nol palsu.

**CACAT BERDAMPINGAN IKUT DIPERBAIKI**, atas persetujuan tersurat pengguna.
Banner hasil sinkron tak punya `role` apa pun, sehingga menekan "Sinkronkan
dari Helpdesk" lalu menunggu menghasilkan **kesunyian** bagi pembaca layar —
berhasil maupun melewatkan. Tanpa itu separuh manfaat temuan ini hilang bagi
pengguna tunanetra: angka yang menuntut tindak lanjut tetap tak terdengar.
Dipakai `role="status"` yang sopan, bukan `role="alert"`; di basis kode ini
`alert` khusus untuk galat (`ConsentGate.jsx:140`, `SSOLoginButton.jsx:224`),
dan hasil yang diminta pengguna sendiri tak perlu menyela.

**Kelemahan pembuktian, dicatat apa adanya.** Kedua uji BUG-012 memerah lebih
dulu, tetapi pada "Unable to find role=status" — mereka tersandung pada `role`
yang belum ada sebelum sampai ke asersi TEKS-nya, jadi "3 dilewati" dan
"0 dilewati" tak pernah dijalankan pada jalan merah itu. Yang membuktikannya
bekerja MUTASI sesudah hijau: angka `dilewati` dibuang dari kalimat dan
`adaDilewati` dipaksa `false`, dan kedua uji memerah. Kode dipulihkan dari
salinan, diperiksa `diff` kode=0.

---

<a id="bug-013"></a>

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

**Sebabnya kini pasti, bukan lagi dugaan.** `DashboardService.getStatistics`
memanggil `this.prisma.ikmResult.findMany({ select: … })` **tanpa `where` sama
sekali** — tak ada penyaring `survey.deletedAt`. Snapshot milik survei di Sampah
karena itu masuk ke `ikmResults`, yang menyuapi DUA keluaran sekaligus: nilai
`summary.ikm` dan seluruh titik `ikmTrend`. Penyaring `status !== aktif` yang
ada di sebelahnya (dipasang 31 Agustus untuk survei yang dibuka kembali)
menunjukkan tempat yang tepat: satu klausa lagi di query yang sama.

**Terkunci uji otomatis sejak 15 September 2026** —
[`apps/web/e2e/statistik-sampah.spec.js`](../apps/web/e2e/statistik-sampah.spec.js).
Ditulis sebagai `test.fail()`: selama cacatnya ada, suite tetap hijau; begitu
penyaringnya dipasang, uji itu **merah** (`Expected to fail, but passed`) dan
menuntut anotasinya dicabut — sejak saat itu ia jadi pagar regresi sungguhan.

**Anotasi itu DICABUT 19 Oktober 2026** sesudah `main` ditarik ke cabang ini,
dan specnya tidak dihapus. Pernyataannya kini harapan biasa, jadi berkas itu
sudah menjadi pagar regresi yang dijanjikan di paragraf atas — bukan lagi
pencatat cacat.
Dibuktikan dua arah dengan memasang penyaringnya sementara lalu
mengembalikannya. Rinciannya di [TEST_CASES.md §Y.8](TEST_CASES.md).

---

#### Penutupan (19 Oktober 2026)

**Diperbaiki di `main`:** `f1c132e` (perbaikan) dan `a930af2` (merge), disusul
`777b22d` dan `658be77` yang menutup dua celah penjagaan ujinya. Cabang `tester`
TIDAK memuat perbaikan itu; lihat peringatan pagar di bagian rekap dokumen ini.

**DUA PERNYATAAN DI ATAS TERNYATA MENGECILKAN MASALAHNYA, dan keduanya
dikoreksi di sini alih-alih ditulis ulang di tempatnya** — teks bertanggal 15
September dibiarkan utuh sebagai rekaman apa yang diketahui hari itu.

1. Paragraf "Sebabnya kini pasti" menyebut query `ikmResult` menyuapi **DUA**
   keluaran, `summary.ikm` dan `ikmTrend`. Sebenarnya **EMPAT**: `serviceElements`
   (rata-rata NRR per unsur) dan `topOpd` (papan peringkat) juga dibangun dari
   `ikmResults` yang sama. Papan peringkat itu bahkan sudah tercatat bergerak di
   tabel "Hasil sebenarnya" di atas (Dinas Kesehatan 100 → 62,5), jadi gejalanya
   terukur sejak awal sementara sebabnya belum dihubungkan.
2. Paragraf yang sama menutup dengan "satu klausa lagi di query yang sama".
   Penyisiran 19 Oktober menemukan **TUJUH tempat** tanpa penyaring `deletedAt`,
   bukan satu:

   | Tempat | Keluaran yang tercemar |
   | ------ | ---------------------- |
   | `hitungStatistik` · `ikmResult.findMany` tanpa `where` | `summary.ikm`, `ikmTrend`, `serviceElements`, `topOpd` |
   | `hitungStatistik` · `surveyResponse.count()` tanpa `where` | `summary.totalRespondents` |
   | `hitungStatistik` · `answer.groupBy` hanya menyaring `nilai` | `valueDistribution` |
   | `getOpdDashboard` · `surveyResponse.count` | jumlah responden dasbor OPD |
   | `getOpdDashboard` · `answer.findMany` | umpan balik terbaru dasbor OPD |
   | `getOpdDashboard` · `ikmResult.findMany` | riwayat IKM dasbor OPD |
   | `getRespondentTrendPercent` · dua `surveyResponse.count` | persentase tren responden |

   Pada `answer.groupBy` jalurnya dua lapis: `answer` tak mengenal survei
   langsung, ia menggapainya lewat `response`.

**SATU LUBANG KEDELAPAN DISANGKA ADA, LALU DIBATALKAN OLEH PENGUKURAN.**
`activeSurveys` di `hitungStatistik` hanya menyaring `status: aktif` dan karena
itu terlihat ikut bocor. Ia tidak: `SurveysService.remove` menyetel
`status: ditutup` ketika survei yang dibuang sedang aktif, jadi survei di Sampah
tak pernah dapat berstatus `aktif`. Penyaring di sana akan menjadi kode mati
yang menyesatkan pembaca berikutnya, dan sengaja TIDAK ditambahkan.

**Uji dibuktikan merah lebih dulu, dan merah karena perilaku.** Sebelum satu
baris produksi diubah, uji e2e baru di `apps/api/test/dashboard.e2e-spec.ts`
gagal pada `summary.totalRespondents`: diharap 1, diterima 2 — angkanya tak
bergerak sama sekali sesudah survei dibuang, persis gejala yang dilaporkan
15 September. `tsc --noEmit -p tsconfig.spec.json` kode=0 dijalankan lebih dulu
supaya merah yang muncul tak mungkin berasal dari galat impor.

**Sembilan uji, dan tujuh di antaranya dibuktikan lewat tujuh mutasi.** Tiap
penyaring dilepas satu per satu, suitenya dijalankan, lalu sumbernya dipulihkan.
Mutasi query `ikmResult` membunuh empat uji sekaligus (`ikmTrend`,
`summary.ikm`, `serviceElements`, `topOpd`) — bukti langsung atas koreksi nomor
1 di atas. Dua uji sisanya TIDAK terbunuh oleh mutasi mana pun, dan itu
sifatnya: keduanya uji **prasyarat**, yang menuntut sesuatu memang terhitung,
sementara melepas penyaring justru membuat lebih banyak terhitung. Keduanya ada
untuk mencegah tujuh uji lain lulus secara hampa.

**Prasyarat kedua lahir dari kegagalan, bukan dari rancangan.** Versinya yang
pertama menuntut periode survei sudah muncul di riwayat IKM dasbor OPD sebelum
dibuang, dan MEMERAH — benar memerah: riwayat itu dibaca dari snapshot
`ikm_results`, bukan dihitung langsung, jadi survei yang masih aktif belum punya
barisnya. Berarti "hilangnya" sesudah dibuang tak membuktikan apa pun.
Prasyaratnya diganti menjadi yang sungguh berlaku: barisnya memang ADA sesudah
pembuangan, karena `remove` memanggil `snapshot()` tepat saat membuang.

**Tak ada data yang perlu diperbaiki.** Cacatnya ada di jalur BACA, bukan tulis:
snapshot di `ikm_results` tetap benar dan hanya berhenti dihitung. Catatan di
atas ("snapshot IKM memang sengaja dibuat saat survei aktif dibuang ... yang
terlewat adalah penyaring `deletedAt`") terbukti tepat.

**Satu keterbatasan tetap ada dan BUKAN bagian dari perbaikan ini.**
`GET /statistics` dibungkus singgahan ber-TTL 60 detik tanpa invalidasi, jadi
angka publik dapat tertinggal paling lama satu menit sesudah survei dibuang. Itu
rancangan yang disengaja untuk meredam lonjakan dari poster/QR, bukan sisa cacat
ini.

**Satu cacat UJI ikut ditemukan dan diperbaiki sambil jalan.** Tujuh jalan
mutasi beruntun juga menjatuhkan uji lama `(INT-14) topOpd ...` pada enam dari
tujuh jalan, dan sebabnya bukan mutasinya: `afterAll` menghapus baris OPD
`E2EDASH`, sehingga `upsert` pada jalan berikutnya mencetak id baru, sementara
muatan singgahan 60 detik masih memegang id lama. Diukur langsung di Redis,
bukan disimpulkan: `singgahan:statistik-publik` berisi
`topOpd: [{ opdId: 755, … }]` sementara `opd_id_seq` sudah di 755 dan baris 755
tak ada lagi di tabel `opd`. Percobaan empat jalan memisahkan sebabnya — dengan
pembuang singgahan lulus dua kali, tanpanya gagal dua kali. Akibatnya lebih
dalam daripada kegoyahan: APA yang diuji bergantung pada keadaan singgahan.
Satu `hapus` membuat jawabannya satu.

**Verifikasi (isi di disk, pascacommit):** unit api 84 suite / 1.359 uji, e2e
api 41 suite / **455** uji (sebelumnya 446), uji komponen web 202 suite / 1.659
uji, eslint kode=0, prettier bersih, nol CRLF. Playwright TIDAK dijalankan —
dan justru di sanalah pagar `test.fail()` yang akan memerah itu hidup.

---
<a id="bug-014"></a>

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
tanpa induk semacam ini di lingkungan dev, hasil sebelas hari tanpa pembersihan. Kini
jalurnya terbuka lewat antarmuka bagi Admin Kabupaten, bukan hanya lewat skrip
pengujian.

**Ia menggigit perkakas pengujian itu sendiri (15 September 2026).** Pagar
regresi [BUG-013](#bug-013) memusnahkan surveinya sendiri sesudah selesai, dan
`bersihkan-data-uji.mjs` **tak dapat menemukan notifikasi yang ditinggalkannya**:
penyaringnya bertolak dari survei yang masih ada, sedangkan induknya sudah
tiada — persis mekanisme cacat ini. Tiga kali jalan meninggalkan **15** baris
mati, dan tak satu pun terbaca sebagai data uji.

Skrip pembersih karena itu mendapat bendera opt-in `--tanpa-induk`, yang menyapu
notifikasi bertaut `/surveys/<id>` yang id-nya tak ada lagi. Opt-in dan bukan
bawaan: yang tersapu bukan hanya milik data uji, melainkan jejak setiap survei
yang pernah dimusnahkan siapa pun. Itu **menambal akibatnya di lingkungan dev,
bukan cacatnya** — pengguna sungguhan tak punya skrip semacam itu.

**Terkunci uji otomatis sejak 15 September 2026** —
[`apps/web/e2e/notifikasi-siklus.spec.js`](../apps/web/e2e/notifikasi-siklus.spec.js).
Uji kendali yang wajib lulus membuktikan notifikasinya memang terbit saat survei
dijawab; pagar `test.fail()` menuntut tak ada lagi yang menautnya sesudah survei
dimusnahkan. Dibuktikan dua arah dengan menambahkan `notification.deleteMany`
pada transaksi `purge` sementara, lalu mengembalikannya.

#### Penutupan BUG-014 (20 Oktober 2026)

Diperbaiki di `main` (`6d9c24a`, merge `fc7877b`). Yang menghalangi perbaikan
ini selama ini bukan kelalaian melainkan bentuk tabelnya: `notifications` SAMA
SEKALI TIDAK MENGENAL SURVEI, dan satu-satunya tautannya kolom teks `link`.
Jadi `operasiPemusnahanSurvei` memang tak punya apa pun untuk dihapus.

Tiga jalan ditimbang dan dua ditolak dengan alasannya:

| Jalan | Keputusan |
| --- | --- |
| Kolom `survey_id` + FK `ON DELETE CASCADE` | **DIPAKAI** — jalur penghapusan survei mana pun di masa depan tak dapat melupakannya |
| Kolom `survey_id`, hapus tersurat di `purge` | ditolak — lebih mudah dibaca, tetapi hanya menjaga satu jalur yang kebetulan ada hari ini |
| Tanpa migrasi, hapus lewat pola teks `link` | ditolak — mati tanpa suara begitu rute itu berganti nama |

**Migrasinya mengisi mundur tetapi tidak menghapus apa pun.** Baris lama diisi
dari `link` HANYA bila surveinya masih ada; yang menunjuk survei yang sudah
dimusnahkan dibiarkan `NULL`. Alasannya ditulis di dalam migrasinya sendiri:
baris itu sudah tanpa induk sejak sebelum migrasi ini, dan memutuskan nasib
notifikasi milik pengguna sungguhan bukan wewenang sebuah berkas migrasi.
Terukur di basis data pengembangan: 384 baris, 12 menaut survei yang masih
hidup. Foreign key-nya diperiksa langsung, bukan dipercaya:
`notifications_survey_id_fkey` ada dengan `confdeltype = 'c'`.

**Merahnya dibuktikan lebih dulu, dan DUA KALI merah karena sebab yang SALAH
sebelum merah karena sebab yang benar.** Keduanya pantas dicatat sebab keduanya
pelajaran. Pertama `Tests: 0 total` — galat kompilasi, bukan uji yang terbukti
merah, dan sebabnya komentar yang menutup dirinya sendiri: teks
`/admin-*` diikuti `/surveys/...` memuat penutup blok komentar, sehingga
TypeScript membaca prosanya sebagai kode. Kedua `Expected: 201, Received: 403`
— gerbang persetujuan PDP membaca `users.consent_at`, dan pengiriman jawaban
ditolak sebelum satu notifikasi pun terbit. Barulah yang ketiga merah pada
pernyataan yang dimaksud: `Expected: 0, Received: 2`.

Ujinya menerbitkan notifikasi lewat JALUR APLIKASI, bukan menanamnya dengan
`prisma.notification.create`: notifikasi yang ditanam tangan bisa hijau karena
ia kebetulan membawa medan yang benar sementara jalur sungguhan tidak.

**Lima uji unit ikut memerah sesudah perbaikan, dan itu benar.** Dua pernyataan
`toContainEqual` menegaskan BENTUK PENUH muatan `createMany`, dan muatannya
kini membawa `surveyId`. Keduanya dibetulkan dengan menambahkan medannya, BUKAN
dilonggarkan menjadi `objectContaining` — bentuk ketat itulah yang menangkap
medan yang tak sengaja ikut terkirim.

Verifikasi penuh termasuk e2e `apps/api`, sebab perubahan ini menyentuh skema:
1.359 uji unit api, 456 uji e2e api, 1.777 uji web, eslint kode=0.

**YANG BELUM DIKERJAKAN, dan disebut supaya tak jadi kejutan:** pagar Playwright
BUG-014 di cabang ini masih beranotasi `test.fail()`. Ia akan MEMERAH pada
tarikan `main` berikutnya ke sini, dan yang benar adalah MENCABUT anotasinya,
bukan menghapus specnya — persis seperti yang terjadi pada BUG-013 pada
19 Oktober.

> ✅ **RAMALAN DI ATAS TERPENUHI PERSIS, dan diukur sebelum disentuh
> (20 Oktober 2026).** `main` ditarik ke `tester` sore itu juga (delapan commit,
> merge `63aadce`, nol konflik). Pagarnya dijalankan **lebih dulu**, sebelum satu
> baris pun disunting, dan menjawab `Expected to fail, but passed` dua kali —
> jalan asli dan satu percobaan ulang. Barulah anotasinya dicabut; specnya tidak
> dihapus. Jalan kedua: **4 lulus, kode=0, 3,2 detik, nol percobaan ulang**, dan
> pagar BUG-018 di berkas yang sama tetap berbunyi gagal-yang-diharapkan sebab
> cacatnya memang masih hidup.
>
> **Buktinya yang paling berarti justru datang dari skrip pembersih, bukan dari
> ujinya.** Dua jalan penuh pagar BUG-014 memusnahkan surveinya masing-masing,
> dan `bersihkan-data-uji.mjs --tanpa-induk` sesudahnya melaporkan
> `notifikasi tanpa induk (survei sudah tiada) : 0`. Sebelum perbaikan ini
> angkanya 4, lalu 2, lalu 2 pada tiga jalan berurutan hari yang sama. Uji itu
> memeriksa notifikasi milik satu akun; skrip pembersih memeriksa **seluruh
> tabel**, jadi nol di sana menutup celah yang pernyataan ujinya sendiri tak
> dapat tutup.
>
> Satu kalimat dalam anotasi yang dicabut itu ternyata KELIRU, dan itu dicatat di
> tempatnya: ia menyuruh "cabut anotasi ini begitu penyapunya dipasang". Yang
> dipasang bukan penyapu melainkan tautannya sendiri. "Penyapu" menyiratkan satu
> `deleteMany` yang kurang, padahal yang kurang adalah bentuk tabelnya.

---
<a id="bug-015"></a>

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

**Terkunci uji otomatis sejak 15 September 2026** —
[`pagar-bug-015-dialog-konfirmasi.test.jsx`](../apps/web/src/components/ui/__tests__/pagar-bug-015-dialog-konfirmasi.test.jsx).
Tiga `test.failing()`: `role="dialog"` + `aria-modal`, nama aksesibel yang
berisi judulnya, dan tombol tutup yang punya nama terbaca — didahului satu uji
kendali yang wajib lulus. Dibuktikan dua arah dengan memasang ketiga atribut
sementara, lalu mengembalikannya.

**Bukti bahwa ini kelalaian, bukan gaya rumah.** `ModalKirimSurvei.jsx` memasang
`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, DAN `aria-label="Tutup"`
pada tombol silangnya — lengkap. Polanya sudah dikuasai tim di berkas sebelah.

#### Bagian 1 diperbaiki (21 Oktober 2026)

> Judul bagian ini semula berbunyi "bagian 2 BELUM, dan barisnya tetap terbuka",
> dan itu benar selama beberapa jam. Bagian 2 dikerjakan pada hari yang sama;
> penutupannya ada di bagian berikutnya. Kalimat-kalimat di bawah dibiarkan
> dalam bentuk aslinya sebagai rekaman bertanggal, termasuk yang menyatakan
> bagian 2 masih utuh.

`ConfirmActionModal.jsx` di `main` (commit `4d0080b`) kini memasang
`role="dialog"`, `aria-modal="true"` dan `aria-labelledby` pada panelnya, judulnya
ber-`id` dari `useId()`, dan tombol silangnya ber-`aria-label="Tutup"`. Dibaca
dari DOM terender oleh ujinya sendiri, ketiga baris `role=null aria-modal=null
aria-labelledby=null` di atas sudah tidak berlaku. Ketiga `test.failing()` di
pagarnya memerah dengan `Failing test passed even though it was supposed to
fail`, lalu anotasinya dicabut — sejak itu pagar regresi sungguhan.

`useId()` dipilih, BUKAN id tetap seperti `judul-konfirmasi` di
`ConfirmDialog.jsx` atau `judul-hapus-permanen` di `ConfirmTypeToDeleteModal.jsx`.
Modal ini dipanggil dari empat tempat yang semuanya tetap ter-mount saat
tertutup, jadi id tetap akan membuat `aria-labelledby` menunjuk judul instans
yang salah begitu dua di antaranya hidup bersamaan. Dua berkas yang memakai id
tetap itu belum dibereskan.

**BAGIAN 2 TIDAK DIKERJAKAN, dan itu disebut di sini supaya tidak terbaca sebagai
sudah selesai.** Fokus masih tidak dipindahkan ke dalam `ConfirmTypeToDeleteModal`
dan masih tidak dikurung di sana: berkas itu di `main` tak memuat satu pun
`useRef` maupun pemanggilan `focus()`. Jejak Tab empat langkah di atas karena itu
masih berlaku apa adanya. Ini justru bagian yang laporan ini sendiri nilai lebih
merugikan, sebab `aria-modal="true"` di sana sudah terpasang dan menyembunyikan
isi halaman di luar dialog sementara fokusnya tertinggal di luar.

Pagarnya tak dapat dipakai sebagai jaminan untuk bagian itu: ketiga harapannya
seluruhnya tentang atribut `ConfirmActionModal`, dan tak satu pun memeriksa
fokus. Jadi suite web yang hijau TIDAK berarti bagian 2 sudah benar.

Status barisnya dibiarkan terbuka. Dalam sesi yang sama ia sempat ditandai
`Ditutup` atas dasar bagian 1 saja, dan itu salah — penandaan itu dibatalkan
sebelum di-commit. Bila kelak lebih rapi memisahkannya menjadi temuan sendiri,
itu keputusan pemilik dokumen, bukan diambil diam-diam di sini.

#### Penutupan bagian 2 (21 Oktober 2026, sore) — dan cakupannya lebih luas dari laporan ini

Dikerjakan beberapa jam sesudah bagian 1, di `main` lewat commit `3a64d86`.
Barisnya karena itu `Ditutup`, dan paragraf di atas tentang "dibiarkan terbuka"
berlaku untuk tanggal itu saja.

**Cacatnya ada di LIMA dialog, bukan satu.** Diukur sebelum dikerjakan, dengan
menghitung `useRef`, `.focus()` dan `inert` di tiap berkas ber-`role="dialog"`:
hasilnya nol pada kelimanya — `ConfirmActionModal`, `ConfirmDialog`,
`ConfirmTypeToDeleteModal`, `GantiJenisModal`, `ModalKirimSurvei` — dan keempat
selain `ConfirmTypeToDeleteModal` juga memasang `aria-modal="true"`. Jadi
kombinasi yang laporan ini sebut merugikan itu berulang di lima tempat. Laporan
aslinya hanya menyebut satu karena di sanalah jejak Tab direkam, bukan karena
yang lain bersih.

Perbaikannya satu kait bersama, `apps/web/src/hooks/useFocusTrap.js`, dipanggil
kelima dialog — bukan lima salinan. Alasannya sama yang melahirkan
`useBodyScrollLock`: polanya identik di tiap pemakai.

Tiga keputusan rancangan yang pantas diketahui sebelum seseorang mengubahnya:

1. **Mengurung di TEPIAN saja.** Berpindah antar elemen di dalam dialog tetap
   pekerjaan peramban; yang dicegat hanya Tab yang hendak melewati tepi, lalu
   dilingkarkan. Mengambil alih setiap Tab akan mengabaikan `tabindex` positif
   dan urutan baca yang mungkin dipasang kelak.
2. **Fokus awal mendarat di WADAH dialognya**, bukan elemen interaktif pertama,
   supaya pembaca layar mengumumkan nama dialognya lebih dulu dan tak ada tombol
   destruktif yang terkokang. `ConfirmTypeToDeleteModal` menimpanya ke medan
   ketik — aman justru karena tombol hapusnya mati sampai ketikannya cocok.
3. **`inert` pada sisa halaman TIDAK dipakai**, walau lebih kuat: jsdom tak
   mendukungnya sehingga pagarnya takkan membuktikan apa pun, dan tiga dari lima
   dialog mem-portal dirinya ke `document.body` sehingga "sisa halaman" bukan
   satu subpohon yang kita miliki. Batasnya dibayar tersurat — pengurungan lewat
   keydown tidak menahan fokus mencapai kendali peramban.

**Satu harga yang tidak disembunyikan.** `focus:outline-none` dipasang pada
wadah kelima dialog, sebab tanpa itu peramban menggambar cincin fokus
mengelilingi seluruh modal saat terbuka. Wadahnya hanya dapat difokus secara
terprogram (`tabIndex={-1}`), jadi pemakai papan ketik tak pernah men-Tab ke
sana — tetapi pemakai papan ketik yang AWAS kini tak mendapat petunjuk visual di
mana fokusnya tepat sesudah dialog terbuka. Bila itu dinilai terlalu mahal, dua
alternatifnya: biarkan cincinnya, atau daratkan fokus di elemen pertama.

**Pagarnya lahir langsung sebagai pagar regresi**, bukan `test.failing()`.
Anotasi itu masuk akal hanya ketika perbaikannya ditunda; di sini perbaikannya
ada di perubahan yang sama, jadi siklus merah→hijau biasa yang benar. Tujuh
harapan diamati merah lebih dulu — semuanya `toHaveFocus`, termasuk
`expect(pemicu()).not.toHaveFocus()` yang memerah justru karena fokus memang
tertinggal di pemicu, yakni cacat yang dilaporkan, terbukti hidup. Ditambah dua
uji pemasangan terpisah di `GantiJenisModal.test.jsx` dan
`ModalKirimSurvei.test.jsx`, sebab kait yang ADA tetapi tak pernah dipanggil
akan membuat pagar kaitnya sendiri tetap hijau.

Suite web sesudahnya 217 suites / 1787 tests, dari 216 / 1777 — nol uji lama
patah.

**`ConfirmTypeToDeleteModal` masih menaruh `role="dialog"` pada latarnya**, bukan
panelnya, tak seragam dengan empat lainnya. Pengurungan bekerja di kedua
penempatan, jadi itu kerapian dan sengaja dibiarkan di luar perbaikan ini.

---

<a id="bug-031"></a>

### BUG-031 — Warga pemakai keyboard tak dapat melampirkan bukti ke pengaduan

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | — (ditemukan saat merancang perbaikan [BUG-007](#bug-007))     |
| **Tanggal**  | 23 Oktober 2026                                              |
| **Peran**    | Warga                                                        |
| **Halaman**  | `/complaints/new` dan beranda publik                          |
| **Berkas**   | `apps/web/src/components/ui/FileDropzone.jsx:38-51` (sebelum perbaikan) |
| **Severity** | Medium                                                       |

**Nomor dan derajatnya usulan.** Penomoran temuan milik pemilik dokumen, dan
"Medium" adalah penilaian penguji, bukan keputusan tim. Alasannya di bawah.

**Yang terjadi.** Zona lampiran sebuah `div` ber-`onClick`, **tanpa `tabIndex`,
tanpa `role`, tanpa `onKeyDown`**, dengan inputnya `className="hidden"` — yaitu
`display: none`, sehingga tak dapat difokus dan tak ada di pohon aksesibilitas.
Seluruh 89 baris berkasnya dibaca; tak ada jalur lain. Jadi warga yang memakai
keyboard tidak dapat melampirkan bukti ke pengaduannya **sama sekali**.

**Mengapa dinilai Medium, bukan Low.** Komponen itu dirender
`CreateComplaintForm.jsx:372`, yang hidup di `/complaints/new` **dan** di
beranda publik — jadi yang kehilangan fungsi itu warga, bukan admin.
Formulirnya tetap dapat dikirim tanpa lampiran, sehingga yang hilang fungsi
opsional; tetapi pada layanan pengaduan, foto buktinya itulah isi aduannya.

**Yang membuatnya pantas dicatat tersendiri, bukan sebagai bagian BUG-007.**
Cacat ini **sudah pernah diperbaiki di tempat lain**, 21 September 2026, pada
dua komponen percakapan — berikut kalimatnya sendiri yang masih terbaca di
`AdminResolutionWorkspace.jsx`:

> Label bukan elemen yang dapat difokus, dan inputnya `display: none` —
> keduanya bersama berarti admin yang memakai keyboard sama sekali tak dapat
> melampirkan berkas di sini. **Itu fungsi yang hilang, bukan sekadar nama yang
> kurang.**

`ChatReplyForm.jsx` ikut dibereskan hari itu. Dropzone warga terlewat, dan tak
ada yang kembali menyisirnya selama sebulan. Kelasnya sudah dikenali tim; yang
kurang hanya satu sapuan atas pemakai ketiga.

**Satu cacat kelas [BUG-010](#bug-010) berdampingan.** Tombol hapus per berkas
berisi ikon silang saja, tanpa nama — dan daftarnya dapat memuat lima berkas,
jadi "tombol" saja tak membedakan mana yang akan dibuang.

**Ditutup 23 Oktober 2026** — `28574df`, merge `33b70d4` di `main`.

Zonanya menjadi `<button type="button">` **sungguhan**, bukan `div`
ber-`role="button"` ditambah `tabIndex`: fokus serta Enter dan Spasi datang dari
peramban, dan namanya datang dari tulisan yang memang sudah tampak di layar —
tak ada ARIA yang perlu dipalsukan. Dua konsekuensi ikut dikerjakan: isinya
menjadi `<span>`, sebab `<button>` hanya boleh memuat *phrasing content*, dan
inputnya dipindah keluar menjadi saudara, sebab elemen interaktif bersarang di
dalam `<button>` bukan HTML yang sah. Keduanya pola yang sama dengan dua
komponen percakapan. Penangan seret tetap di elemen yang sama; tombol menerima
peristiwa seret seperti elemen lain.

Tombol hapus diberi `aria-label` yang menyebut nama berkasnya.

**Satu uji lama ikut diganti kontraknya, dan sebabnya instruktif.** "Membuang
hanya berkas yang ditekan silangnya" memakai `getAllByRole('button')` lalu
`[1]`. Indeks itu bergeser begitu zonanya sendiri menjadi tombol, jadi ia
memerah — bukan karena cacat, melainkan karena ia menebak lewat **posisi**.
Persis cacat uji yang laporan [BUG-010](#bug-010) ramalkan, dan diperbaiki
dengan cara yang sama: memakai nama.

Tiga dari sembilan uji baru menjaga temuan ini, dan ketiganya merah lebih dulu
pada "Unable to find an accessible element with the role button and name ...".

---

<a id="bug-032"></a>

### BUG-032 — Kalimat penolakan ukuran lampiran menyandingkan dua angka yang terbaca sama

|              |                                                                   |
| ------------ | ----------------------------------------------------------------- |
| **Charter**  | QA-H1 — perburuan bug atas perubahan 23 Oktober 2026              |
| **Tanggal**  | 23 Oktober 2026                                                   |
| **Peran**    | Warga (formulir pengaduan)                                        |
| **Halaman**  | `/complaints/new` dan beranda publik                               |
| **Berkas**   | `apps/web/src/components/ui/FileDropzone.jsx:74-75` (sebelum perbaikan) |
| **Severity** | Low                                                               |

**Lahir dari perburuan atas perbaikan yang baru berumur beberapa jam.** Kedua
temuan ini — BUG-032 dan [BUG-033](#bug-033) — ditemukan dengan menyisir
`FileDropzone.jsx` yang baru ditulis hari itu untuk [BUG-007](#bug-007) dan
[BUG-031](#bug-031). Laporan perburuannya ada di
`qa-bug-hunt/bug-report-20261023-032821-lampiran-pengaduan.md`, dan folder itu
**terabaikan git**, jadi berkas tersebut hidup hanya di mesin tempat perburuan
dijalankan.

**Yang terjadi.** Ukuran berkas diformat
`(file.size / 1024 / 1024).toFixed(2)` lalu disandingkan dengan label batas
`${maxSizeMB}MB`. `toFixed` membulatkan ke yang **terdekat**, jadi berkas
5 MiB + 5.000 byte tercetak `5.00`:

```
1 berkas tidak dilampirkanfoto.jpg: ukurannya 5.00 MB, melebihi batas 5MB
```

Pembaca diberi tahu bahwa 5.00 MB melebihi 5MB.

**Penolakannya sendiri BENAR.** Yang cacat kalimatnya — kelas yang sama dengan
label "File berhasil diunggah" yang dibetulkan beberapa jam sebelumnya di berkas
ini juga: pesan yang menyatakan sesuatu yang pembacanya tak dapat
memercayainya.

**Mengapa Low tetapi perlu dikerjakan.** Dampaknya kosmetik, tetapi
**jangkauannya luas**: batasnya 5 MiB sementara foto ponsel lazimnya 4–6 MB,
jadi inilah justru golongan berkas yang paling sering ditolak — dan di situlah
kalimatnya tak dapat dimengerti.

**Ditutup 23 Oktober 2026** — `ec1bf88`, merge `e45878a` di `main`.

Satu pemformat, `formatMb`, dipakai **kedua** tempat yang menyebut ukuran,
supaya tak ada lagi dua angka yang mengaku satuan sama tetapi dicetak berbeda.
Ukuran pada kalimat penolakan dibulatkan ke **atas**, sebab kalimat itu membuat
PERBANDINGAN dan karena itu tak boleh membulatkan turun ke arah batasnya.
Hasilnya `ukurannya 5,01 MB, melebihi batas 5,00 MB`.

Pembulatan ke atas dipakai HANYA di sana, tidak di daftar berkas terpilih, dan
bedanya disengaja: daftar itu sekadar melaporkan, tidak membandingkan.

Pemisah desimalnya koma, kaidah bahasa Indonesia. Akibat kerapiannya ikut
dikerjakan: daftar berkas terpilih di komponen yang sama berhenti memakai
titik.

**Satu ketaksamaan LAMA sengaja tidak diubah**, supaya tak terbaca sebagai
bagian temuan ini: label zona berbunyi "Maksimal ukuran file 5MB" sedangkan
yang ditegakkan 5 MiB = 5,24 MB desimal, sehingga berkas 5,1 MB menurut ponsel
tetap **diterima**. Ketaksamaan itu ada juga di backend
(`BATAS_UKURAN_LAMPIRAN_LABEL = '5MB'`), jadi ia keputusan lama yang konsisten
di kedua sisi — mengubahnya di satu sisi saja justru membuat keduanya
bertentangan.

---

<a id="bug-033"></a>

### BUG-033 — Daftar izin jenis lampiran dapat dilewati lewat rantai prototipe

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | QA-H1 — perburuan bug atas perubahan 23 Oktober 2026         |
| **Tanggal**  | 23 Oktober 2026                                              |
| **Peran**    | Warga (formulir pengaduan)                                   |
| **Berkas**   | `apps/web/src/components/ui/FileDropzone.jsx:68` (sebelum perbaikan) |
| **Severity** | Low                                                          |

**Yang terjadi.** `saringBerkas` memutuskan dengan `JENIS_DITERIMA[file.type]`,
sebuah pencarian pada objek literal. Objek itu dipakai sebagai **himpunan
keanggotaan**, dan pada objek literal biasa pencarian kunci bukan uji
keanggotaan: ia ikut menemukan anggota `Object.prototype`. Terukur, bukan
disimpulkan — `JENIS_DITERIMA['constructor']` bernilai fungsi `Object` dan
`JENIS_DITERIMA['__proto__']` bernilai `Object.prototype`, keduanya truthy,
sehingga berkas ber-`type` demikian **lolos** gerbang jenis yang baru dipasang
untuk menolaknya.

**Batasnya diukur, bukan diperkirakan.** HANYA dua untai itu yang lolos, sebab
konstruktor `File` membakukan `type` ke huruf kecil: `'toString'` tersimpan
sebagai `'tostring'`, bukan anggota prototipe, jadi ia sudah tertolak dengan
benar bahkan sebelum perbaikan ini. Satu uji **kendali** merekam fakta itu dan
sengaja hijau sejak awal, supaya laporan ini tak mengaku lebih luas daripada
yang terbukti.

**Tanpa dampak keamanan, dan itu perlu disebut tersurat.** Backend memeriksa
**angka ajaib isi berkas**, bukan `Content-Type` dari peramban, sehingga apa pun
yang lolos gerbang klien tetap tertolak di sana. Yang hilang bila ia terjadi
hanya kuota pengguna — persis kerugian yang membuat [BUG-007](#bug-007) ada.

**Jalurnya pun tak dapat ditempuh dari pemilih berkas biasa.** `file.type`
berasal dari pemetaan MIME sistem operasi, dan tak ada akhiran lazim yang
memetakannya ke `constructor` atau `__proto__`. Satu-satunya jalan teoretis
adalah seret-lepas dari halaman web lain yang menaruh `File` buatan ke dalam
`DataTransfer` — dua tab dan satu seretan sengaja. Itulah sebabnya Low, bukan
lebih.

**Ditutup 23 Oktober 2026** — `ec1bf88`, merge `e45878a` di `main`.

`JENIS_DITERIMA` kini dibangun lewat `Object.create(null)`, jadi ia tak punya
prototipe untuk ditemukan. Itu dipilih alih-alih menjaga satu tempat
pemanggilan dengan `Object.hasOwn`, sebab ia membetulkan **setiap** pencarian
pada objek itu — termasuk yang ditulis pembaca berikutnya.

---

<a id="bug-034"></a>

### BUG-034 — Dua lampiran bernama sama menghasilkan dua tombol hapus bernama identik

|              |                                                                   |
| ------------ | ----------------------------------------------------------------- |
| **Charter**  | QA-H2 — perburuan bug atas delta 23 Oktober sore, dijalankan 26 Oktober 2026 |
| **Tanggal**  | 26 Oktober 2026                                                   |
| **Peran**    | Warga (formulir pengaduan), pengguna pembaca layar                |
| **Halaman**  | `/complaints/new` dan beranda publik                               |
| **Berkas**   | `apps/web/src/components/ui/FileDropzone.jsx:163` (sebelum perbaikan) |
| **Severity** | Low                                                               |

**Lahir dari perbaikan, bukan diwarisi.** Perburuan kedua (QA-H2) menyisir
pekerjaan 23 Oktober sore yang belum pernah diburu — modul baru
`utils/lampiran.js` dan kedua panel percakapan. Modul itu sendiri tak
menghasilkan temuan; enam dugaan atasnya diperiksa dan gugur. Yang tertangkap
justru akibat perbaikan [BUG-031](#bug-031) yang baru berumur tiga hari.
Laporan perburuannya di `qa-bug-hunt/`, folder yang **terabaikan git**, jadi
isinya diringkas di sini alih-alih sekadar dirujuk.

**Yang terjadi.** `aria-label` tombol hapus dibangun dari `file.name`, dan
`saringBerkas` tak menyaring kembar. Dua lampiran bernama sama menghasilkan dua
tombol bernama identik:

```
Found multiple elements with the role "button" and name "Hapus bukti.png"
```

Pembaca layar mendengar nama yang sama dua kali dan tak punya cara mengetahui
mana yang akan membuang yang mana. Akibat keduanya menyentuh pengujian, dan
bentuknya sama persis dengan yang diramalkan [BUG-010](#bug-010): selama
namanya identik, `getByRole` tak dapat menyasar salah satunya.

**Terjangkau dengan dua klik**, dan justru karena perilaku yang disengaja:
`handleFileSelect` menyetel ulang nilai inputnya sesudah setiap pilihan supaya
berkas yang baru diperkecil dapat dipilih lagi — efek sampingnya, berkas yang
sama dapat dipilih dua kali.

**Pemisahan yang perlu dibaca tepat.** Daftar yang memuat kembar adalah
perilaku **lama**. Yang **baru** nama aksesibelnya: sebelum 23 Oktober kedua
tombol sama-sama tak bernama, sesudahnya keduanya bernama **sama**. Jadi cacat
ini dibuat oleh perbaikan aksesibilitas sebelumnya.

**Ditutup 26 Oktober 2026** — `ce1e455`, merge `9d2258f` di `main`.

Namanya kini `Hapus lampiran ${idx + 1}: ${file.name}`. Nomor urutnya mengikuti
urutan tampil, jadi "lampiran 2" memang baris kedua yang dilihat mata. Nomor
**selalu** disertakan, bukan hanya saat ada kembar, supaya nama sebuah tombol
tak berubah begitu lampiran lain ditambahkan.

**Dua hal sengaja tidak dikerjakan.**

- **Apakah kembar seharusnya DITOLAK tetap pertanyaan terbuka untuk pemilik
  produk.** Ini keputusan produk, bukan teknis — apakah melampirkan berkas yang
  sama dua kali memang tak pernah berguna — dan atas pilihan tersurat pengguna
  perbaikan ini hanya membetulkan namanya.
- **Kedua panel percakapan tidak diubah.** `AdminResolutionWorkspace` dan
  `ChatReplyForm` menampung satu berkas, jadi kembar mustahil di sana dan
  "Hapus bukti.png" sudah unik.

**Pagarnya dipindahkan** dari `qa-bug-hunt/repros/` ke `KitUiBersama.test.jsx`,
dua uji, keduanya merah lebih dulu. Yang kedua dahulu mustahil ditulis sama
sekali: menyasar tombol lampiran kedua dari dua kembar, lalu memastikan objek
**kedua** yang terbuang. Dua uji lama ikut berubah karena kontrak namanya memang
berubah — keduanya menuntut nama baru yang persis, bukan dilonggarkan.

**Pemeriksaan silang dengan repro asli TIDAK bersih, dan dicatat apa adanya.**
Berbeda dengan BUG-032/033 yang reproduksi aslinya menghijau 6/6, repro QA-03
hanya 1/3 sesudah perbaikan. Sebabnya repro itu mengodekan format nama lama
secara harfiah (`'Hapus bukti.png'`), jadi dua asersinya tak dapat hijau sesudah
formatnya sengaja diubah. Yang perlu dibaca adalah **peralihan sebabnya**: dari
"Found multiple elements" menjadi "Unable to find" — tak ada lagi dua tombol
bernama sama. Asersi intinya, keunikan nama, hijau. Repronya sengaja tidak
disunting: ia rekaman perburuan, dan menyuntingnya agar hijau berarti menulis
ulang bukti.

---

<a id="bug-037"></a>

### BUG-037 — Modal Bagikan Survei bukan dialog bagi pembaca layar

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 26 Oktober 2026                                              |
| **Peran**    | Admin Kabupaten dan Admin OPD, pengguna pembaca layar dan papan ketik |
| **Berkas**   | `apps/web/src/features/surveys/components/ShareSurveyModal.jsx` |
| **Severity** | Low (usulan penguji)                                         |

**Asal.** Pengamatan samping [BUG-035](#bug-035): uji E2E modal ini terpaksa
mencarinya lewat teks judul, sebab ia tak ber-`role`. Diperiksa utuh, tiga
cacat dari kelas yang sama ditemukan sekaligus — dan ketiganya sudah dibereskan
di dialog lain lewat [BUG-015](#bug-015). Modal ini terlewat.

1. **Bukan dialog.** Tanpa `role="dialog"`, `aria-modal`, maupun nama. Bagi
   pembaca layar ia sepasang `<div>`: teks yang muncul entah dari mana, tanpa
   tanda bahwa halaman di belakangnya sedang tak dapat dipakai.
2. **Tombol tutup tanpa nama.** Isinya hanya ikon X, jadi satu-satunya jalan
   keluar terdengar sebagai "tombol" saja — kelas [BUG-010](#bug-010).
3. **Fokus tertinggal di belakang.** Ia tak pernah masuk ke modal dan tak
   dikurung di sana; pemakai papan ketik menekan Tab dan berjalan di halaman
   yang tertutup modal.

**Ditutup 26 Oktober 2026** — `c0df858`, merge `7031772` di `main`. Polanya
mengikuti `ConfirmActionModal`: `role="dialog"` + `aria-modal` +
`aria-labelledby` yang menunjuk dua id, label "Bagikan Survei" dan judul
surveinya, supaya terdengar APA yang dibagikan; `aria-label="Tutup"` pada tombol
silang; `useFocusTrap`.

**Pagar.** Empat uji di `ShareSurveyModal.test.jsx`, keempatnya merah lebih
dulu; kedua uji fokus dibuktikan lewat mutasi (`useFocusTrap` dimatikan →
keduanya merah). `responsif-komponen.spec.ts` kini mencari modal itu lewat
`role="dialog"`, dan di Chrome lulus 4/4 bersama uji poster QR.

---

<a id="bug-038"></a>

### BUG-038 — `/persetujuan` mengantar ke beranda publik, bukan ke beranda peran

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 26 Oktober 2026                                              |
| **Peran**    | Siapa pun yang mendarat di `/persetujuan` tanpa perlu menyetujui |
| **Berkas**   | `apps/web/src/app/persetujuan/page.jsx`                      |
| **Severity** | Low (usulan penguji)                                         |

**Asal.** Ditemukan saat menulis uji tujuan navigasi untuk lima tempat yang
memakai `window.location.assign`. Halaman ini tak punya uji sama sekali, dan
uji pertamanya memerah.

**Cacatnya.** Halaman ini mengalihkan siapa pun yang TIDAK perlu menyetujui
(cookie `consent` basi, atau peran admin) ke `ROLE_HOME[me.role]`. Medan `role`
tak pernah ada di `GET /auth/me` sejak peran jamak, 5 September 2026; yang ada
`roles` dan `actingRole`. `ROLE_HOME[undefined]` jatuh ke `'/'`, jadi mereka
diantar ke beranda publik, bukan ke beranda peran yang sedang dipakai. Cacat ini
berumur tujuh minggu.

Prop `role` untuk `ConsentGate` memakai nilai yang sama. Di sana cacatnya tak
terlihat: `undefined` memicu nilai baku `'responden'`, dan hanya warga yang
pernah perlu menyetujui. Benar karena kebetulan, bukan karena dikirim.

**Bukti.** `src/app/persetujuan/__tests__/page.test.jsx` ditulis lebih dulu, dan
tiga dari lima ujinya merah dengan alasan itu: tujuan `''` alih-alih
`#beranda-kabupaten` dan `#beranda-responden`, dan gerbang memakai `responden`
alih-alih peran yang dikirim. Tujuan dibuat berupa fragmen lewat tiruan
`ROLE_HOME`, karena jsdom hanya menjalankan navigasi yang mengubah fragmen.

**Ditutup 26 Oktober 2026** — `0855ee1`, merge `5907832` di `main`. Kedua tempat
memakai `me.actingRole`.

**Pagar.** Lima uji di `persetujuan/__tests__/page.test.jsx`. Lima mutasi
dijalankan atas halaman ini, empat merah. Yang lolos, membuang `error` dari
syarat pengalihan, adalah mutan setara: pada galat muatan pertama `me` sudah
null, sehingga `!me` menahannya lebih dulu. Di commit yang sama (`c340165`)
tujuan navigasi keras juga diuji di `ConsentGate` (uji pertamanya),
`AuthCallbackLoader`, `/pilih-peran`, dan interceptor 401. Ke-21 mutasi atas
kelima tempat: 20 merah, 1 setara.

---

<a id="bug-039"></a>

### BUG-039 — Modal Buat/Ubah Survei bukan dialog bagi pembaca layar

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 26 Oktober 2026 (ditemukan), 27 Oktober 2026 (ditutup)       |
| **Peran**    | Admin Kabupaten, pengguna pembaca layar dan papan ketik      |
| **Berkas**   | `apps/web/src/features/surveys/components/admin-kab/SurveyFormModal.jsx` |
| **Severity** | Low (usulan penguji)                                         |

**Asal.** Probe Playwright atas dropdown Tujuan/Metode: `getByRole('dialog')`
tak menemukan apa pun pada modal "Buat Paket Survei" yang sedang terbuka.

**Cacatnya.** Kelas yang sama dengan [BUG-037](#bug-037): tanpa `role="dialog"`,
`aria-modal`, maupun nama; tombol silangnya hanya ikon tanpa nama; fokus
tertinggal di halaman di belakang modal.

**Ditutup 27 Oktober 2026** — `53d5ab8`, merge `bef537e` di `main`. Pola
ShareSurveyModal: peran + `aria-modal` + `aria-labelledby` ke judul ("Buat Paket
Survei" / "Perbarui Detail Survei"), `aria-label="Tutup"`, `useFocusTrap`.

**Pagar.** Lima uji di `SurveyFormModalDialog.test.jsx`, kelimanya merah lebih
dulu. Mutasi membongkar satu yang hampa: uji Tab versi pertama hanya menuntut
fokus "tetap di dalam dialog" dan hijau tanpa `useFocusTrap`, karena jsdom tak
memindahkan fokus pada Tab. Kini ia menuntut fokus berputar ke elemen pertama;
kedua mutasi merah.

---

<a id="bug-040"></a>

### BUG-040 — Sisa `max-w-*` yang dibajak token spasi

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 26 Oktober 2026 (ditemukan), 27 Oktober 2026 (ditutup)       |
| **Peran**    | Admin Kabupaten, Admin OPD, warga                            |
| **Berkas**   | `AdminComplaintTable.jsx`, `admin-kab/ComplaintTable.jsx`, `ComplaintRow.jsx`, `AboutCTA.jsx`, `DevelopmentTimeline.jsx` |
| **Severity** | Low (usulan penguji)                                         |

**Asal.** Perbaikan lencana "Survei Utama" (`9380e9d`): akar cacatnya `max-w-xs`
pada sel judul Monitoring Survei, dan penyisiran menemukan lima pemakaian lain.

**Cacatnya.** Di apps/web `max-w-xs` = 4px dan `max-w-2xl` = 48px, karena token
`--spacing-*` membajak skala `max-w-*`. CLAUDE.md melarangnya sejak 8 Oktober,
tetapi larangan tertulis tak memerah dan jsdom tak memuat CSS. Diukur di Chrome
(`max-width: 4px` di ketiga tabel): kolom judul pengaduan Admin Kabupaten 149px
dan Admin OPD 157px pada layar 1366px; di tabel warga judul "Pelayanan pembuatan
KTP lambat" (280px) terpotong menjadi 154px bahkan pada 1920px.

**Ditutup 27 Oktober 2026** — `9fa2f63`, merge `93d3370` di `main`. Tabel admin
`min-w-[12rem] max-w-[20rem]`; sel warga `max-w-[24rem]` (pada 20rem judul tadi
masih terpotong 8px karena batasnya memuat bantalan sel). Sesudahnya: 235px,
192px, judul warga utuh. Dua komponen Tentang `max-w-[42rem]`; keduanya tak
dirender halaman mana pun, jadi tak terukur.

**Pagar.** `src/__tests__/tanpaMaxWTokenSpasi.test.js` menyisir seluruh `src`
(komentar dikosongkan) dan merah lebih dulu dengan tepat kelima baris tadi.

---

<a id="bug-041"></a>

### BUG-041 — `className` pemanggil `Badge` kalah oleh kelas bawaan

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 26 Oktober 2026 (ditemukan), 27 Oktober 2026 (ditutup)       |
| **Peran**    | Admin Kabupaten, Admin OPD, warga                            |
| **Berkas**   | `apps/web/src/components/ui/Badge.jsx`                       |
| **Severity** | Low (usulan penguji)                                         |

**Asal.** Perbaikan lencana "Survei Utama" (`9380e9d`): rancangannya meminta
sudut kecil, tetapi `rounded` yang sudah tertulis di pemanggil tidak berpengaruh.

**Cacatnya.** `Badge` merangkai kelas sebagai string biasa, jadi `className`
pemanggil hanya menang bila urutan CSS kebetulan memihaknya. Diukur di Chrome:
enam lencana di Monitoring Survei dan kartu Admin OPD (SKM/Custom, status,
Survei Utama) meminta `rounded` tetapi tampil pil (`rounded-full`), dan lencana
OPD di kartu survei warga meminta `font-bold` tetapi tampil 600.

Perbaikan dengan `twMerge` polos ternyata membawa cacat kedua: ia tak mengenal
token tema `globals.css`. `px-sm` tidak menimpa `px-3`, dan `text-label-md`
dikira kelas warna sehingga warna teksnya ikut dibuang. Delapan komponen lain
sudah memakai `twMerge` polos; tak satu pun pemanggilnya hari ini memicu jebakan
itu (keluaran lama dan baru dibandingkan per komposisi nyata, semuanya sama).

**Ditutup 27 Oktober 2026** — `69f5b08`, merge `31c9679` di `main`.
`utils/cn.js` = clsx + `extendTailwindMerge` dengan daftar token `--spacing-*`
dan `--text-*`. `Badge` dan kedelapan komponen tadi memakainya. Sesudahnya:
lencana `rounded` bersudut 4px, lencana OPD warga 700. Efek yang tak diminta:
lencana `text-[10px]` naik 2px (17 → 19px) karena `line-height` dari `text-xs`
bawaan tak lagi ikut terpasang.

**Pagar.** `cn.test.js` membaca `globals.css` dan merah bila ada token baru yang
belum didaftarkan; `BadgeClassName.test.jsx` (4 uji); penyisir
`tanpaTwMergePolos.test.js` melarang impor `tailwind-merge` di luar `cn.js`.
Ketiganya merah lebih dulu; mutasi 5/5 merah.

---

<a id="bug-042"></a>

### BUG-042 — Tombol sidebar tak mengumumkan keadaannya

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 26 Oktober 2026 (ditemukan), 27 Oktober 2026 (ditutup)       |
| **Peran**    | Admin Kabupaten, Admin OPD, pengguna pembaca layar           |
| **Berkas**   | `AdminSidebar.jsx`, `AdminKabSidebar.jsx`, `AdminNavbar.jsx`, `AdminKabNavbar.jsx`, kedua `*LayoutProvider.jsx` |
| **Severity** | Low (usulan penguji)                                         |

**Cacatnya.** Tombol ciut sidebar desktop hanya bernama lewat `title` yang
berganti "Perbesar Sidebar"/"Perkecil Sidebar"; tombol menu ponsel di kedua
navbar selalu bernama "Buka menu navigasi", juga ketika lacinya sudah terbuka.
Tak satu pun membawa `aria-expanded` atau `aria-controls`, dan `<aside>`-nya
tanpa `id`. Kelas cacat yang sama dengan [BUG-037](#bug-037) dan
[BUG-039](#bug-039).

**Ditutup 27 Oktober 2026** — `3a2eb56`, merge `7b6412b` di `main`. Tombol ciut
bernama tetap "Sidebar lebar" dengan `aria-expanded` (true saat lebar); tombol
menu ponsel membawa `aria-expanded` mengikuti laci. Keduanya `aria-controls` ke
`<aside>` yang sama, `id`-nya dari `useId` di Provider dan dibagi lewat konteks.

**Pagar.** `TombolSidebarAria.test.jsx`, 3 uji x 2 tata letak, merah lebih dulu
6/6. Uji keempat (ikon ber-`aria-hidden`) dibuang karena hampa: lucide-react
1.27 sudah memasangnya sendiri, mutasinya tetap hijau. Mutasi lain 8/8 merah.

---

<a id="bug-043"></a>

### BUG-043 — Tombol hamburger dashboard warga tanpa nama

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 27 Oktober 2026 (ditemukan dan ditutup)                      |
| **Peran**    | Warga, pengguna pembaca layar                                |
| **Berkas**   | `apps/web/src/components/layouts/DashboardNavbar.jsx`        |
| **Severity** | Medium (usulan penguji)                                      |

**Asal.** Sapuan tombol buka/tutup sesudah [BUG-042](#bug-042): 21 tombol,
13 benar, delapan cacat.

**Cacatnya.** Tombol hamburger di dashboard warga hanya berisi ikon `Menu`/`X`
tanpa `aria-label`, `title`, maupun teks. Nama aksesibelnya kosong: pembaca
layar mengumumkannya sebagai "tombol" saja, dan di ponsel itulah satu-satunya
jalan ke menu navigasi. Medium karena pengguna pembaca layar tak dapat tahu
tombol apa itu, bukan sekadar keadaannya.

**Ditutup 27 Oktober 2026** — `5f259da`, merge `eaf3587` di `main`. Nama
"Buka menu navigasi", `aria-expanded` mengikuti laci, `aria-controls` ke laci.

**Pagar.** `HamburgerAria.test.jsx` (bersama Navbar publik), merah lebih dulu.

---

<a id="bug-044"></a>

### BUG-044 — Tujuh tombol buka/tutup tanpa `aria-expanded`

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 27 Oktober 2026 (ditemukan dan ditutup)                      |
| **Peran**    | Pengunjung, Admin OPD, Admin Kabupaten, pengguna pembaca layar |
| **Berkas**   | `Navbar.jsx`, `FAQSection.jsx`, `SurveyFilterBar.jsx`, `ComplaintFilterBar.jsx`, `admin-opd/analytics/page.jsx`, `KabDashboardHeader.jsx`, `SurveyResultExportMenu.jsx` |
| **Severity** | Low (usulan penguji)                                         |

**Cacatnya.** Kelas yang sama dengan [BUG-037](#bug-037), [BUG-039](#bug-039),
dan [BUG-042](#bug-042): tombol membuka dan menutup sesuatu tanpa mengumumkan
keadaannya. Hamburger publik (nama berganti, tanpa `aria-expanded`), akordeon
FAQ (panel tertutup tetap terbaca karena hanya dikecilkan), tombol Filter ponsel
di dua bilah penyaring Admin Kabupaten, dan tiga menu Ekspor yang tak memakai
`aria-haspopup`/`aria-expanded` padahal empat menu ekspor lain sudah.

**Ditutup 27 Oktober 2026** — `5f259da`, merge `eaf3587` di `main`, dengan pola
yang sudah ada di repo. Panel FAQ yang tertutup kini juga `aria-hidden`.

**Pagar.** Lima berkas uji baru (15 uji termasuk BUG-043), semuanya merah lebih
dulu; mutasi 12/12 merah.

**Catatan, tidak diubah.** Pertanyaan FAQ adalah `<h3>` di dalam `<button>`,
susunan yang tak sah menurut HTML. Ditutup terpisah sebagai [BUG-045](#bug-045).

---

<a id="bug-045"></a>

### BUG-045 — Pertanyaan FAQ berupa `<h3>` di dalam `<button>`

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 27 Oktober 2026 (ditemukan dan ditutup)                      |
| **Peran**    | Pengunjung, pengguna pembaca layar                           |
| **Berkas**   | `apps/web/src/features/about/components/FAQSection.jsx`      |
| **Severity** | Low (usulan penguji)                                         |

**Asal.** Dicatat saat menutup [BUG-044](#bug-044), sengaja tidak diubah waktu
itu.

**Cacatnya.** Tiap pertanyaan akordeon FAQ adalah `<h3>` di dalam `<button>`.
Isi tombol hanya boleh phrasing content, jadi susunannya tidak sah. Peran
`button` juga meratakan isinya, sehingga judulnya tak terjamin muncul di
navigasi per judul pembaca layar.

**Ditutup 27 Oktober 2026** — `4e2217a`, merge `e91aaeb` di `main`. Pola
akordeon WAI-ARIA: `<h3>` membungkus `<button>`, teks dan ikon menjadi
`<span>`. Tampilan diukur di Chrome sebelum dan sesudah (desktop 1280, ponsel
375, tertutup dan terbuka): identik.

**Pagar.** Satu uji baru di `FAQSectionAria.test.jsx`, merah lebih dulu;
mutasi 3/3 merah.

---

<a id="bug-046"></a>

### BUG-046 — Tujuh lencana 10px tumbuh 1,67px

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 27 Oktober 2026 (ditemukan dan ditutup)                      |
| **Peran**    | Warga, Admin OPD, Admin Kabupaten                            |
| **Berkas**   | `AdminSurveyCard.jsx`, `SurveyMonitoringTable.jsx`, `SurveyCard.jsx`, `ComplaintInfoCard.jsx` |
| **Severity** | Low (usulan penguji)                                         |

**Asal.** Efek samping perbaikan [BUG-041](#bug-041), tercatat saat
pengukurannya di Chrome.

**Cacatnya.** `text-xs` milik Badge memasang ukuran huruf sekaligus jarak
baris (`--text-xs--line-height`, 1,333). Sejak Badge memakai `cn`,
`text-[10px]` dari pemanggil membuang `text-xs` utuh, sehingga jarak baris
jatuh ke warisan 1,5 (15px, sebelumnya 13,33px). Tujuh lencana tumbuh:

| Lencana                                         | Sebelum BUG-041 | Sesudah BUG-041 | Kini  |
| ----------------------------------------------- | --------------- | --------------- | ----- |
| Kartu survei Admin OPD (status, periode, utama) | 17,33           | 19              | 17,33 |
| Tabel survei Admin Kabupaten (utama, jenis)     | 17,33           | 19              | 17,33 |
| OPD di kartu survei warga                       | 21,33           | 23              | 21,33 |
| Status di detail pengaduan                      | 25,33           | 27              | 25,33 |

Lebar tidak berubah. Kolom "Sebelum BUG-041" dihitung (13,33 + bantalan),
bukan diukur; dua kolom lainnya diukur di Chrome.

**Ditutup 27 Oktober 2026** — `edd6823`, merge `2278c31` di `main`.
`leading-(--text-xs--line-height)` di ketujuh pemanggil. Tidak di Badge,
karena tailwind-merge membuang `leading-*` bawaan begitu ada kelas ukuran
huruf sesudahnya.

**Pagar.** `BadgeJarakBaris.test.js` menuntut setiap `<Badge` berukuran huruf
arbitrer menyebut jarak barisnya, merah lebih dulu tepat di tujuh lencana
itu; mutasi 4/4 merah.

---

<a id="bug-047"></a>

### BUG-047 — Nilai Survei satu potong tak dapat patah, dua tempat meluap

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 27 Oktober 2026 (ditemukan dan ditutup)                      |
| **Peran**    | Admin Kabupaten, Admin OPD                                   |
| **Berkas**   | `apps/web/src/features/surveys/components/NilaiSurvei.jsx`   |
| **Severity** | Medium (usulan penguji)                                      |

**Asal.** Putaran penuh Playwright 27 Oktober 2026: `ganti-jenis-tata-letak`
merah, "tabel menggulir mendatar di 1366px", 58px. Hanya merah bila ada survei
custom bernilai panjang; hari itu survei uji `ganti-jenis-alur` yang
menyediakannya, dan urutan kedua spec itu memicunya ulang dengan tepat.

**Cacatnya.** Mode `ukuran="sel"` menulis "angka · kategori" sebagai satu
potong `whitespace-nowrap`. Survei custom metode rata-rata berkategori
tertinggi menghasilkan "4,00 / 4 · Sangat Puas", 176px:

- tabel survei Admin Kabupaten, 1366px: kolom NILAI SURVEI 208px, tabel 1118px
  di wadah 1060px, kolom AKSI terdorong keluar;
- kartu survei Admin OPD: "Puas" keluar dari tepi kanan kotak NILAI SURVEI.

Medium karena terjadi pada data sungguhan, bukan hanya data uji.

**Ditutup 27 Oktober 2026** — `af243aa`, merge `7868221` di `main`. Dua potong
nowrap ("4,00 / 4" dan "· Sangat Puas"), baris hanya patah di antaranya.
Sesudahnya: tabel meluap 0 (kolom NILAI SURVEI 145px), kartu dua baris di dalam
kotaknya (140x54, sebelumnya 221x28 dan keluar kotak), "75% · Puas" tetap satu
baris. `ganti-jenis-tata-letak` sesudah `ganti-jenis-alur`: 7/7.

**Pagar.** Satu uji baru di `NilaiSurvei.test.jsx`, merah lebih dulu; mutasi
3/3 merah.

---

<a id="bug-048"></a>

### BUG-048 — Aksi daftar pengaduan Admin Kabupaten di bawah 44px

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | —                                                            |
| **Tanggal**  | 28 Oktober 2026 (ditemukan 27 Oktober, ditutup 28 Oktober)    |
| **Peran**    | Admin Kabupaten, pengguna layar sentuh                       |
| **Berkas**   | `apps/web/src/features/complaints/components/admin-kab/ComplaintTable.jsx` |
| **Severity** | Low (usulan penguji)                                         |

**Asal.** Putaran penuh Playwright 27 Oktober 2026: `responsif-komponen`
"daftar pengaduan Admin Kabupaten: tak ada sasaran di bawah 44px" merah di
390px. Tombol Teruskan hanya tampil pada pengaduan yang belum bertujuan, jadi
pagar itu hanya merah bila data seperti itu ada.

**Cacatnya.** Diukur di Chrome dengan pengaduan uji tanpa tujuan:

| Aksi          | 390px  | 1366px |
| ------------- | ------ | ------ |
| Teruskan      | 95x29  | 95x29  |
| Monitor Tiket | 95x48  | 122x31 |

Monitor Tiket lolos di 390 hanya karena teksnya patah dua baris. Ia juga
`<button>` di dalam `<Link>` (kendali interaktif di dalam kendali interaktif),
dan Teruskan tanpa `type="button"`.

**Ditutup 28 Oktober 2026** — `e078f29`, merge `9000688` di `main`. Keduanya
`min-h-[44px]`; tautan Monitor Tiket sendiri yang bergaya tombol. Sesudahnya:
Teruskan 95x44 di kedua lebar, Monitor Tiket 95x48 dan 122x44.
`responsif-komponen` untuk halaman itu 6/6 dengan data pemicunya ada.

**Pagar.** `AksiTabelPengaduan.test.jsx`, tiga uji, merah lebih dulu; mutasi
4/4 merah.

---

<a id="bug-049"></a>

### BUG-049 — Ekspor CSV meneruskan teks berawalan rumus mentah

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | QA-SECURITY-UAT #3 (`docs/TEST_KEAMANAN.md` §10)             |
| **Tanggal**  | 28 Oktober 2026 (ditemukan dan ditutup hari yang sama)       |
| **Peran**    | Warga dan Admin OPD sebagai penyisip; Admin OPD dan Admin Kabupaten sebagai pengunduh |
| **Berkas**   | `apps/api/src/modules/ikm/ikm-export.service.ts`, `apps/web/src/utils/unduh.js`, tiga halaman daftar |
| **Severity** | Medium (usulan penguji)                                      |

**Asal.** Rencana uji keamanan mencatat "tak ditemukan penetralan sel
berawalan `= + - @`" sebagai kandidat. Bagian ini membuktikan atau
menggugurkannya.

**Cacatnya.** Berkas disusun dengan kode aplikasi sendiri, berisi muatan
tak berbahaya, lalu dibuka lewat Excel di mesin pengembang (tanpa jendela,
tanpa disimpan):

| Penyusun | Isi | Bila dipecah per koma |
| -------- | --- | --------------------- |
| `susunCsv` (web) | `"=1+1"`, `"@SUM(1+1)"`, `"+2+3"` | rumus, bernilai 2, 2, 5 |
| `toCsv` (api) | `Survei,=1+1`, `OPD,@SUM(1+1)` | rumus, bernilai 2 dan 2 |
| `toExcel` (api, exceljs) | `=1+1` | teks, BUKAN rumus |

Kutip ganda tidak menolong. Tiga halaman daftar (`admin-kab/complaints`,
`admin-opd/complaints`, `admin-kab/surveys`) menyusun CSV sendiri dengan
salinan `escape` + `downloadBlob`, sehingga perbaikan di `unduh.js` saja tak
akan sampai ke sana.

Yang dapat menyisipkan: warga (judul pengaduan, pesan percakapan, nama
profil lewat `PATCH /auth/profile`) dan Admin OPD (judul survei). Yang
terkena: admin yang mengunduh, lewat tombol berlabel "Excel" yang isinya CSV.

**Batas pembuktiannya.** Excel di mesin ini berpemisah `;`. CSV yang dibuka
dengan klik ganda masuk utuh ke kolom A, dan bentuk yang diuji (sel
berlabel, rumus di kolom pertama) TIDAK terhitung. Rumus terbukti terhitung
bila berkas dipecah per koma: Excel berlokal koma, atau impor teks
berpemisah koma. Karena itu Medium, bukan High.

**Ditutup 28 Oktober 2026** — `74646df`, merge `68733cf` di `main`. Sel
teks berawalan `=`, `+`, `-`, `@`, TAB, atau CR diberi awalan petik tunggal;
angka, teks yang memang angka (`-5`, `85%`), dan `-` pengisi kosong
dibiarkan. Satu aturan di tiap sisi: `csvEscape` (api) dan `kutip` (web).
Ketiga halaman dipindah ke `unduhCsv`. XLSX dan PDF tidak diubah. Harganya:
judul yang memang berawalan karakter itu tampil dengan petik di Excel.

Sesudahnya berkas yang sama dibuka ulang di Excel berpemisah koma: nol sel
berumus, `'=1+1` tampil sebagai teks. Ekspor ketiga halaman dicoba di Chrome
lewat probe Playwright sementara yang hanya membaca: nama berkas tetap,
kepala kini berkutip, isi utuh.

**Pagar.** `unduh.test.js` (14 uji baru) dan `ikm-export.service.spec.ts`
(6 uji baru), merah lebih dulu (web 8, api 5). `CsvSatuPintu.test.js`
menolak penyusun `text/csv` di luar `unduh.js`, merah dengan ketiga halaman
sebelum pemindahan. Pengecualian angka dimutasi di kedua sisi: web 4 merah,
api 1 merah.

---

<a id="bug-050"></a>

### BUG-050 — Tanggal tak sah di penyaring log audit dijawab 500

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | QA-SECURITY-UAT #5 (`docs/TEST_KEAMANAN.md` §12)             |
| **Tanggal**  | 28 Oktober 2026 (ditemukan dan ditutup hari yang sama)       |
| **Peran**    | Admin Kabupaten                                              |
| **Berkas**   | `apps/api/src/modules/audit/dto/list-audit-log-query.dto.ts` |
| **Severity** | Low (usulan penguji)                                         |

**Cacatnya.** `GET /audit-logs?startDate=` dan `endDate=` ber-`@IsString()`.
Teks apa pun yang bukan tanggal -- muatan SQL di uji asap, tetapi juga
sekadar `abc` -- sampai ke `new Date(...)` di service, menjadi `Invalid
Date`, lalu ditolak Prisma sebagai **500** (`PrismaClientValidationError:
Provided Date object is invalid`). Galat masukan disajikan sebagai kerusakan
server. Halaman log audit sendiri mengirim `YYYY-MM-DD` dari `<input
type="date">`, jadi jalurnya hanya terpicu lewat permintaan langsung.

**Ditutup 28 Oktober 2026** — `bd247e2`, merge `7fc1f50` di `main`.
`@IsDateString()`, sama dengan `from`/`to` di notifikasi; kini 400.

**Pagar.** `sqli-asap.e2e-spec.ts`: 16 uji tanggal (8 muatan x 2 medan),
merah 500 sebelum perbaikan.

---

<a id="bug-051"></a>

### BUG-051 — Karakter pola LIKE tak diloloskan: pencarian melebar, pencocokan OPD SSO rawan salah tautan

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | QA-SECURITY-UAT #5 (`docs/TEST_KEAMANAN.md` §12)             |
| **Tanggal**  | 28 Oktober 2026 (ditemukan dan ditutup hari yang sama)       |
| **Peran**    | Admin Kabupaten, semua yang masuk (`/opd`), login SSO        |
| **Berkas**   | `opd.service.ts`, `audit.service.ts`, `sso.service.ts`       |
| **Severity** | Low (usulan penguji)                                         |

**Cacatnya.** Prisma menerjemahkan `contains` dan `equals` + `mode:
'insensitive'` menjadi `ILIKE` di Postgres tanpa meloloskan `%` dan `_`.
Terukur:

| Permintaan | Seharusnya (dihitung harfiah) | Dijawab |
| ---------- | ----------------------------- | ------- |
| `/opd?search=%` | 0 | 65 (semua) |
| `/audit-logs?search=_` | 597 | 3518 (semua) |
| `/audit-logs?aksi=%` | 0 | 3518 |

Bukan tembus otorisasi: hasilnya hanya melebar di dalam data yang boleh
dilihat pemanggil. Tempat ketiga yang seakar lebih berat:
`findOpdFromClaims` di `sso.service.ts` mencocokkan klaim Helpdesk dengan
`externalId`/`kode` OPD memakai `equals` + `insensitive`, sehingga klaim
`dinke_` cocok dengan kode `DINKES` dan pemiliknya tertaut ke OPD yang bukan
miliknya tanpa galat. Itu RISIKO, bukan kejadian: nol dari 62 kode OPD di
`skm_db` lokal memuat `%`/`_`, dan belum ada klaim yang terbukti berbentuk
begitu.

Catatan pengujinya: pembanding pertama dihitung lewat Prisma `contains` dan
ikut melebar (65 = 65); pembandingnya dipindah ke JavaScript sebelum
hasilnya dipercaya.

**Ditutup 28 Oktober 2026** — `bd247e2`, merge `7fc1f50` di `main`.
`lolosPolaLike()` di `apps/api/src/prisma/pola-like.ts` meloloskan `\`, `%`,
`_` dengan garis miring terbalik (escape bawaan `ILIKE`) dan dipakai di
ketiga tempat.

**Pagar.** `sqli-asap.e2e-spec.ts` (5 uji pola, merah sebelum perbaikan),
`pola-like.spec.ts` (merah 5 dengan stub kompilabel), dan satu uji
`sso.service.spec.ts` bahwa klaim `dinke_` dicari sebagai `dinke\_`. Mutasi
yang membuang peloloskan garis miring terbalik memerahkan 2 uji unit;
percobaan mutasi pertama lewat `sed` hampa (polanya tak cocok) dan diulang.

### BUG-052 — Mutasi bercookie dari origin lain diterima: tak ada penahan CSRF selain SameSite=Lax

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Charter**  | QA-SECURITY-UAT #6 (`docs/TEST_KEAMANAN.md` §15)             |
| **Tanggal**  | ditemukan 28 Oktober 2026, ditutup 29 Oktober 2026           |
| **Peran**    | semua peran bersesi cookie                                   |
| **Berkas**   | `apps/api/src/app.setup.ts`                                  |
| **Severity** | Medium (usulan penguji)                                      |

**Cacatnya.** Backend menjalankan POST/PUT/PATCH/DELETE yang membawa
cookie sesi tanpa memeriksa dari origin mana permintaan itu datang. CORS
tidak menahannya: CORS hanya menyembunyikan JAWABAN dari JavaScript origin
lain, sedangkan permintaannya tetap sampai dan dijalankan. Penahan yang
tersisa hanya `SameSite=Lax` pada cookie sesi, dan atribut itu tidak
berlaku antar-subdomain di bawah domain yang sama, karena bagi peramban
keduanya masih satu situs. Terukur di `skm_uji`: mutasi bercookie dengan
`Origin` asing dijawab sukses dan perubahannya tersimpan.

Dinilai Medium, bukan High: dari situs yang benar-benar lain `SameSite=Lax`
sudah menahan cookie pada POST, jadi jalurnya menuntut penyerang menguasai
halaman di subdomain saudara.

**Ditutup 29 Oktober 2026** — `c830db4`, merge `5cd1770` di `main`. Penjaga
di `configureApp`, sesudah `enableCors`, untuk POST/PUT/PATCH/DELETE: bila
`Origin` ada, ia harus termasuk `cors.origin` (dari `CORS_ORIGIN`); bila
`Origin` tak ada, `Sec-Fetch-Site` `cross-site` atau `same-site` ditolak.
Jawabannya 403 "Origin permintaan tidak diizinkan". Permintaan tanpa kedua
header (curl, antarserver) dan semua GET tetap lolos. Kodenya ditulis
pengguna sendiri; dua upaya sebelumnya di sesi asisten terhenti sebelum
berkas apa pun tersimpan.

**Syarat penggelaran.** `CORS_ORIGIN` produksi WAJIB memuat origin
frontend. Tanpa itu setiap formulir di antarmuka dijawab 403.

**Pagar.** `apps/api/test/csrf-origin.e2e-spec.ts`, 11 uji terhadap rute
yang tidak ada (403 = ditolak penjaga, 404 = lolos penjaga), tanpa sesi
maupun baris yang ditulis. Dengan `app.use` penjaganya dikomentari, enam
uji penolakan merah (403 menjadi 404) dan lima uji jalur sah tetap hijau.
Playwright penuh lewat `http://skema.local`: 155 lulus, 0 gagal, nol
jawaban 403 dari penjaga.

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
<a id="cat-007"></a>

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

<a id="cat-009"></a>

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

> **(15 Oktober 2026) "Sudah diperbaiki" HANYA BENAR DI CABANG `tester`, dan itu
> baru terukur hari ini.** `apps/web/jest.setup.js` di `tester` memuat perbaikan
> itu beserta keterangannya; di `main` baris yang rusak masih utuh apa adanya:
> `const { fetch, ..., File } = require('undici')` diikuti `global.File = File`.
> Perbaikannya karena itu TERKANDAS di `tester` dan belum pernah sampai ke
> `main`.
>
> Terukur, bukan dibaca: menjalankan tiga belas berkas uji milik `tester`
> terhadap kode `main` hari ini menghasilkan `TypeError: File is not a
> constructor` pada empat uji — tiga `FileDropzone` di `KitUiBersama.test.jsx`
> dan satu `ChatReplyForm` di `ComplaintChat.test.jsx`. Keempatnya bukan uji
> basi; keempatnya kegagalan setelan `main`. Sebuah probe di lingkungan jest
> memastikan sebabnya: `require('undici').File` bernilai `undefined` pada undici
> 8.10.0, sementara jsdom murni menyediakan `File` sebagai fungsi — jadi
> penugasan itu memang MENIMPA yang berfungsi.
>
> Tak ada satu pun uji di `main` yang memakai `new File(...)` hari ini, jadi
> tidak ada yang memerah di sana dan cacat ini sepenuhnya diam. Itu membuatnya
> lebih buruk, bukan lebih baik: uji lampiran berikutnya yang ditulis di `main`
> akan gagal dengan pesan yang menuding uji-nya. Lihat juga
> [CAT-023](#cat-023), sebab ini satu gejala dari pemisahan cabang yang lebih
> besar.
>
> **(19 Oktober 2026) SUDAH DIPERBAIKI DI `main` JUGA** (`1bd55ec`), jadi
> kalimat "Sudah diperbaiki" di atas kini benar di kedua cabang — selama empat
> hari ia hanya benar di satu. Barisnya di `main` sekarang mengambil `File` dari
> `node:buffer` dengan penjaga `if (File)`, dan penjaga itu DIPERTAHANKAN dengan
> sengaja: bila kelak `node:buffer` pun berhenti mengekspornya, yang benar
> adalah membiarkan `File` milik jsdom apa adanya, bukan menimpanya dengan
> `undefined` sekali lagi.
>
> **Angka "empat uji" pada catatan 15 Oktober di atas MENGECILKAN akibatnya.**
> Yang tersandera bukan empat uji, melainkan DUA BERKAS PENUH:
> `KitUiBersama.test.jsx` dan `ComplaintChat.test.jsx`. Selama satu berkas
> memerah, seluruh berkas itu tak dapat dipindahkan ke `main` — jadi biaya cacat
> ini bukan empat uji yang hilang, melainkan 22 uji di dua berkas. Terukur:
> daftar berkas yang dapat dipindahkan naik dari enam berkas / 44 uji menjadi
> **tujuh berkas / 66 uji** semata karena perbaikan ini. Lihat catatan
> 19 Oktober di [CAT-023](#cat-023).
>
> Angka tujuh itu bukan angka akhir, dan sebab kenaikan berikutnya BUKAN
> perbaikan ini. Berkas kedelapan menyusul pada hari yang sama lewat perbaikan
> tenggat uji yang terpisah (`6b1a7bc`); rinciannya di koreksi
> [CAT-023](#cat-023) 19 Oktober. Yang dapat dikreditkan kepada perbaikan
> `global.File` tetap enam-ke-tujuh.
>
> **Dua kalimat lain di atas juga tak lagi berlaku, dan disebut di sini alih-alih
> ditulis ulang di tempatnya.** "Tak ada satu pun uji di `main` yang memakai
> `new File(...)` hari ini" sudah tidak benar: kedua berkas itu kini hidup di
> `main` dan keduanya memakainya. Dan cacat ini tidak lagi dapat "sepenuhnya
> diam", sebab penjaga langsung dipasang di
> `apps/web/src/__tests__/penyiapan-file-global.test.js` pada `main` — dua uji
> yang memeriksa `typeof global.File` dan membangun sebuah berkas sungguhan,
> dibuktikan merah lebih dulu (`"undefined"`, lalu `TypeError: File is not a
> constructor`). Kekambuhan kini memerah pada langkah `Uji unit web` di CI dan
> menyebut penyiapannya, bukan menuding uji yang kebetulan memakai `File`.

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
<a id="cat-014"></a>

### CAT-014 — `pnpm db:seed` tak dapat dijalankan sejak peran jamak

> ✅ **DIPERBAIKI & DIVERIFIKASI 15 September 2026** — lihat blok penutup entri ini.

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

#### Perbaikan — 15 September 2026, atas permintaan penguji

Dikerjakan menyimpang dari aturan biasa (penguji tidak menyentuh `apps/api`)
karena penguji memintanya secara tersurat. Tiga berkas, delapan baris:

| Berkas | Perubahan |
| ------ | --------- |
| `prisma/seed.ts` | lima `role: Role.x` → `roles: [Role.x]` |
| `tsconfig.json` | `prisma/**/*` masuk `include` |
| `tsconfig.build.json` | `prisma` masuk `exclude` |

**Berkas ketiga itu tidak ada dalam rencana, dan justru itu bagian
terpentingnya.** Memasukkan `prisma/` ke `include` mematahkan `nest build`:
`tsconfig.build.json` menetapkan `rootDir: ./src`, sehingga seed yang kini ikut
terbaca menghasilkan `error TS6059: File 'prisma/seed.ts' is not under rootDir
'src'`. Perbaikan yang dihentikan pada dua berkas pertama akan menukar satu
kerusakan dengan kerusakan lain yang lebih parah — build produksi gagal.

**Yang dibuktikan, bukan diandaikan:**

1. **Penjaganya dapat memerah.** Satu baris dikembalikan ke bentuk lamanya, dan
   `tsc` langsung menolak dengan TS2561 — diuji dua kali pada baris berbeda,
   lalu dikembalikan. Tanpa langkah ini, `include` yang ditambahkan mungkin saja
   tak berpengaruh apa-apa dan hijaunya palsu.
2. **Seed benar-benar jalan pada lingkungan yang benar-benar baru.** Basis data
   sekali pakai `skm_seed_uji` dibuat, `prisma migrate deploy` dijalankan
   penuh, lalu `pnpm db:seed`:

   ```
   Seed selesai: admin kabupaten (id=1), superuser (id=2, + akses log aktivitas),
   admin OPD (id=3), responden (id=4), 3 OPD, template 9 unsur
   (2 survei: 1 draft + 1 aktif), 1 pengaduan contoh.
   ```

   Isinya diperiksa: 4 pengguna ber-`roles` `{kabupaten}`, `{superuser}`,
   `{opd}`, `{responden}`; 3 OPD; 2 survei; 18 pertanyaan; 1 pengaduan.
3. **Idempoten.** Dijalankan kedua kalinya tanpa galat, dan seluruh jumlahnya
   tak bergerak.
4. **`skm_db` tak tersentuh sama sekali.** Basis data sekali pakai itu dipakai
   justru supaya `update: { roles: [Role.superuser] }` tak menimpa akun
   `superuser@example.go.id` di dev, yang kini ber-peran empat. Sesudah selesai
   ia dihapus; `skm_db` tetap 7 pengguna, 5 survei, 13 pengaduan, 254 notifikasi
   — persis seperti sebelum perbaikan dikerjakan.
5. **708 uji unit backend tetap lulus** di 46 berkas.

**Satu keputusan yang sengaja TIDAK diambil di sini.** Seed dipulihkan persis
seperti maksud aslinya — satu peran per akun. Apakah akun seed sebaiknya
mencerminkan peran jamak seperti keadaan dev sekarang adalah keputusan rancangan
tim backend, bukan penguji, dan mengubahnya diam-diam akan menyelundupkan
keputusan itu ke dalam perbaikan yang seharusnya mekanis.

---
<a id="cat-016"></a>

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
<a id="cat-017"></a>

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
<a id="bug-016"></a>

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

#### Penutupan BUG-016 (20 Oktober 2026)

Diperbaiki di `main` (`c58e8c5`, merge `0de0285`) dan **dilihat di peramban
sungguhan**, bukan hanya dihijaukan oleh uji. Saran perbaikan di atas diikuti
seluruhnya, termasuk klausa "bila perlu batas waktu" — dan klausa itu ternyata
bukan "bila perlu", melainkan intinya; lihat temuan pertama di bawah.

Perbaikannya dua lapis. `TurnstileWidget` mendapat prop `onError`, sehingga
`error-callback` tak lagi hanya mengosongkan token. `ModalKirimSurvei` mendapat
tenggat 15 detik, peringatan `role="alert"`, dan tombol "Muat Ulang
Verifikasi" yang memasang ulang widgetnya lewat perubahan `key` — pemasangan
ulang itulah yang meminta tantangan baru, dan blok pembersih widget sendiri
yang mengosongkan token basinya. `expired-callback` SENGAJA tidak ikut
melaporkan: token kedaluwarsa itu normal dan widget meminta yang baru sendiri.

**Tombol kirim tetap terkunci, dan itu keputusan.** Membukanya hanya
memindahkan kegagalan ke `403 CAPTCHA_TIDAK_SAH` dari server. Yang diminta
laporan ini pemberitahuan beserta jalan keluar, bukan tombol yang menipu.

Pengukuran di Chrome sungguhan, pengunjung tanpa akun, rute `/survei/:id`,
survei `izinkanAnonim` yang dibuat dan dimusnahkan oleh probenya sendiri:

| Yang diukur | Hasil |
| --- | --- |
| Tombol kirim terkunci saat modal baru terbuka | ya |
| Peringatan muncul sesudah | **15,3 detik** |
| Tombol kirim sesudah peringatan | masih terkunci |
| Tombol "Muat Ulang Verifikasi" | ada |
| Sesudah muat ulang | peringatan hilang |
| Peringatan muncul LAGI sesudah | 15,2 detik |
| Galat konsol | seluruhnya milik Cloudflare (pelanggaran CSP `connect-src` saat mencoba `data:,`) |

**TIGA TEMUAN LAHIR DARI MENJALANKANNYA, bukan dari membacanya.**

**Pertama, dan yang paling mengubah penilaian atas perbaikannya sendiri:
peringatan itu terbit lewat TENGGAT, bukan lewat `onError`.** Widget Cloudflare
terlihat jelas terpasang di layar ("Verify you are human"), tantangannya tak
pernah selesai, dan `error-callback` TAK PERNAH dipanggil sama sekali selama
pemantauan. Artinya lapisan yang semula dianggap penjaga tambahan justru
SATU-SATUNYA yang menyelamatkan kasus yang sesungguhnya dilaporkan; prop
`onError` sendirian akan meninggalkan layar itu tetap diam persis seperti
sebelum perbaikan. Pagar Jest-nya menguji `onError`, dan itu tetap benar —
tetapi ia menguji jalur yang BUKAN jalur yang menyelamatkan pengisi di sini.

**Kedua, satu lulus palsu pada alat ukurnya sendiri yang nyaris lolos.**
`getByRole('alert')` di peramban sungguhan ikut mencocokkan pengumum rute milik
Next (`<div role="alert" aria-live="assertive" id="__next-route-announcer__">`),
yang SELALU ada dan kosong. Jalan pertama karena itu melaporkan "peringatan
muncul sesudah 0,0 detik" dengan teks hampa, dan itu terbaca persis seperti
keberhasilan. Dipersempit ke dalam dialognya, angkanya menjadi 15,3 detik. Uji
Jest tidak kena sebab jsdom tak memasang pengumum itu — jadi ini kelas cacat
yang HANYA muncul pada pengukuran di peramban, dan akan terulang pada probe
berikutnya yang memakai peran `alert`.

**Ketiga, di luar lingkup dan tidak diubah:** tombol **Kirim Survei** yang
terkunci tidak terlihat terkunci. Gayanya putih-berbingkai dan serupa tombol
yang hidup. Itu perkara terpisah dari BUG-016 dan dicatat di sini supaya tidak
hilang, bukan sebagai bagian dari temuan ini.

Uji: merahnya dibuktikan lebih dulu (4 gagal / 13 lulus dari 17 uji sebelum
satu baris produksi disentuh), dan tiga uji yang hijau sejak awal masing-masing
dibuktikan dapat memerah lewat mutasi yang dipulihkan di `finally`. Verifikasi
penuh pascaperbaikan: 1.359 uji api, 1.777 uji web, eslint kode=0 — uji web
naik dari 1.770 sebab tujuh uji ditambahkan tanpa berkas uji baru.

---
<a id="cat-018"></a>

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

**Diperiksa ulang 15 September 2026 (sore) — diagnosisnya terkonfirmasi, dan
perubahannya dua baris.** Kedua kunci di lingkungan ini berawalan `0x4AAA…`,
yaitu bentuk kunci **sungguhan** Cloudflare, bukan kunci uji. Itu menutup
kemungkinan bahwa widgetnya diam karena kunci uji yang salah pasang, dan
menyisakan tepat satu sebab yang tersisa: daftar domain kunci itu tak memuat
`skema.local`.

Perubahan yang dibutuhkan, bila pilihan 2 yang diambil:

```
apps/web/.env.local : NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
apps/api/.env       : TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Keduanya kunci uji resmi Cloudflare yang **selalu lulus**, dan keduanya wajib
berpasangan — menukar salah satunya saja menghasilkan token yang terbit di
peramban lalu ditolak backend dengan 403, yaitu gejala yang lebih
membingungkan daripada keadaan sekarang.

**Tidak diterapkan oleh penguji, dan itu keputusan yang disadari.** Berkas `.env`
keduanya di luar git (gitignore), berisi kunci sungguhan yang dipasang orang
lain, dan menukarnya menuntut `next dev` maupun `nest start` dinyalakan ulang —
tiga hal yang mengubah lingkungan bersama, bukan menguji produk. Selama itu
belum dilakukan, kedua pengujian di `e2e/isi-survei-anonim.spec.ts` tetap
**dilewati, bukan lulus**, dan laporan mana pun yang menghitungnya sebagai lulus
keliru.

**Terkunci uji otomatis sejak 15 September 2026** —
[`pagar-bug-016-captcha-gagal.test.jsx`](../apps/web/src/features/surveys/components/__tests__/pagar-bug-016-captcha-gagal.test.jsx).

**Pagarnya sengaja TIDAK dipasang di `ModalKirimSurvei`.** Godaannya di sana:
render dengan `captchaToken: null`, lalu tuntut sebuah pesan. Itu pagar yang
bohong — keadaan "token null" juga keadaan dua detik pertama setiap pengisian
yang normal, jadi uji itu menuntut peringatan muncul saat tak ada yang salah,
dan perbaikan yang benar (pesan muncul hanya sesudah galat atau sesudah tenggat)
tetap membuatnya merah. Pagar yang tak pernah bisa hijau bukan pagar.

Yang dikunci karena itu **jalur pelaporannya**, satu tingkat di bawah:
`TurnstileWidget` harus melaporkan kegagalan lewat saluran yang terpisah dari
token. Selama galat hanya menjelma jadi `null`, antarmuka mana pun di atasnya
mustahil membedakan "gagal" dari "belum". Dibuktikan dua arah dengan menambahkan
prop `onError` sementara, lalu mengembalikannya.

> **Bila perbaikannya memilih saluran lain** — misalnya keadaan `captchaError` di
> store, atau `onStatus('error')` — pagar itu **wajib disesuaikan**, bukan
> dibiarkan hijau sebagai gagal-yang-diharapkan. Anotasi `test.failing()` yang
> ditinggalkan pada kontrak yang sudah berubah adalah pagar yang diam-diam mati.

---
<a id="bug-017"></a>

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

**Terkunci uji otomatis sejak 15 September 2026** —
[`pagar-bug-017-dropdown.test.jsx`](../apps/web/src/components/ui/__tests__/pagar-bug-017-dropdown.test.jsx).
Tiga `test.failing()`: nama terbaca memuat nilai terpilih, `aria-haspopup` ada,
dan `aria-expanded` mengikuti keadaan panel — didahului satu uji kendali yang
wajib lulus (nilai itu memang TAMPAK di layar). Dibuktikan dua arah dengan
memasang ketiga atribut sementara, lalu mengembalikannya.

**Satu hal yang tersingkap saat pagarnya ditulis.** `Dropdown.test.jsx` milik
tim dev mencari pemicunya dengan `screen.getByLabelText('Instansi')` — dan itu
berhasil **justru karena cacat ini**. Uji yang sudah ada diam-diam bersandar
pada perilaku yang salah. Ia tetap lulus sesudah diperbaiki (labelnya masih
menjadi bagian namanya), jadi bukan penghalang perbaikan — tetapi pantas
diketahui sebelum seseorang menyimpulkan bahwa nama aksesibelnya sudah teruji.

#### Penutupan BUG-017 (21 Oktober 2026)

`Dropdown.jsx` di `main` (commit `4d0080b`) memasang `aria-labelledby` yang
menunjuk label DAN span nilai sekaligus, ditambah `aria-haspopup="listbox"` dan
`aria-expanded={isOpen}` pada pemicunya. Nama terbacanya kini "Instansi, Dinas
Kesehatan". Ketiga `test.failing()` memerah pada momen perbaikan dan anotasinya
dicabut.

`"listbox"` dipilih, bukan `"menu"` seperti `EksporMenu.jsx` dan
`RowActionsMenu.jsx` di folder yang sama: keduanya memang menu AKSI, sedangkan
kontrol ini memilih satu NILAI.

**Satu batas disengaja, dicatat supaya tidak terbaca sebagai sudah tuntas.** Pola
combobox/listbox penuh — `role="combobox"` di pemicu, `role="option"` dan
`aria-selected` di tiap item — TIDAK ditegakkan, sehingga `aria-haspopup` di sini
menjanjikan listbox yang panelnya masih daftar tombol biasa. Sebabnya bukan
kemalasan melainkan dua kendala terukur: pagar BUG-017 sendiri menuntut pemicunya
tetap terbaca sebagai `button`
(`getByRole('button', { name: /dinas kesehatan/i })`), dan 238 kueri
`getByRole('button')` di uji web memilih opsi dropdown sebagai tombol. Pekerjaan
itu menyentuh 19 berkas uji dan pantas berdiri sebagai temuan sendiri.

**Perbaikannya mematahkan satu uji yang diam-diam bersandar pada cacatnya**, dan
itu bukan kebetulan melainkan akibat langsung dari nilai yang mulai diumumkan.
`penyaringJenis.test.jsx` mencari opsi dengan
`getByRole('button', { name: /SKM Triwulan Dua/ })`, dan pola itu unik HANYA
selama nama pemicu tidak memuat nilai terpilih. Begitu nilainya masuk, dua elemen
yang sama-sama benar cocok — pemicunya dan opsi di panel — dan jest memerah
`Found multiple elements`. Polanya dijangkari `^`, idiom yang sudah dipakai
berkas itu sendiri satu baris di bawahnya. Kausalitasnya diukur, bukan diduga:
dengan perubahan di-`stash` berkas itu 17/17 lulus, dengan perubahan dipulihkan
satu merah. Hanya SATU tempat di seluruh 1777 uji web yang menyimpan asumsi itu —
catatan di atas tentang `Dropdown.test.jsx` memperkirakan ada yang bersandar pada
cacatnya, dan perkiraan itu benar, hanya berkasnya lain.

---
<a id="bug-018"></a>

### BUG-018 — Meneruskan pengaduan menyiarkan ulang "Pengaduan Baru Masuk" kepada admin yang sudah menerimanya

|                       |                                              |
| --------------------- | -------------------------------------------- |
| **Charter**           | C-18                                         |
| **Tanggal**           | 15 September 2026                            |
| **Peran**             | Admin Kabupaten, Superuser, Admin OPD (penerima notifikasi) |
| **Halaman**           | lonceng & riwayat notifikasi seluruh admin   |
| **Severity**          | Low                                          |
| **Kasus uji terkait** | TC-FE-017, C-18                              |

**Langkah reproduksi**

1. Sebagai warga, kirim pengaduan **tanpa memilih OPD** (`opdId` null).
2. Sebagai Admin Kabupaten, teruskan pengaduan itu ke sebuah OPD
   (`PATCH /complaints/:id/opd`).
3. Hitung notifikasi yang menaut nomor tiketnya.

**Hasil sebenarnya — dibandingkan dengan dua kendali:**

| Tiket | Perlakuan | Notifikasi | Penerima unik |
| ----- | --------- | ---------: | ------------: |
| `…USKO` | dibuat **dengan** OPD, tak pernah diteruskan | 5 | 5 |
| `…HT8F` | dibuat tanpa OPD, **tidak** diteruskan | 4 | 4 |
| `…GDRT` | dibuat tanpa OPD, **lalu diteruskan** | **9** | **5** |

Empat akun menerima pemberitahuan **"Pengaduan Baru Masuk" yang sama dua kali**,
berselang 0,6 detik. Yang kedua lahir dari peneruskan — bukan dari pengaduan baru.

**Dua hal yang salah sekaligus.** Pertama, **duplikasi**: admin yang sudah
diberi tahu diberi tahu lagi. Kedua, **kalimatnya keliru**: yang terjadi bukan
pengaduan baru masuk, melainkan pengaduan lama yang akhirnya menemukan OPD-nya.
Satu-satunya akun yang pantas menerima kabar baru di langkah itu adalah admin OPD
yang baru ditunjuk — dan ia memang menerimanya; sisanya kebisingan.

Jalur penumpukannya sama persis dengan yang melahirkan 7.986 notifikasi tanpa induk:
disiarkan ke setiap akun admin, tanpa yang menyapu.

**Satu pengamatan yang menyertainya, dan ini bukan bagian temuan di atas.**
**Pelapornya sendiri tidak diberi tahu.** Sembilan notifikasi seluruhnya untuk
admin; warga yang mengirim pengaduan tanpa memilih instansi tak pernah menerima
kabar bahwa laporannya akhirnya ditangani OPD tertentu. Ia diberi tahu saat
*status* berubah, tetapi penugasan OPD bukan perubahan status. Apakah itu perlu
diberitahukan adalah keputusan rancangan, bukan cacat — dicatat di sini supaya
keputusannya diambil sadar, bukan terlewat.

**Sebabnya kini pasti, dan bukan kelalaian melainkan pertukaran yang terlewat.**
`ComplaintsService.forward` diakhiri dengan `notifyComplaintCreated(updated)` —
jalur penyiaran yang sama persis dengan pengaduan baru. Komentar di atasnya
menyatakannya terang-terangan dan alasannya sah: *"bagi OPD tujuan, inilah saat
tiket itu benar-benar masuk"*. Yang terlewat adalah bahwa jalur itu menyiarkan
ke **setiap akun admin**, bukan ke OPD tujuan saja. Perbaikannya karena itu
bukan membuang panggilannya, melainkan mempersempit penerimanya.

**Terkunci uji otomatis sejak 15 September 2026** —
[`apps/web/e2e/notifikasi-siklus.spec.js`](../apps/web/e2e/notifikasi-siklus.spec.js).
Uji kendali yang wajib lulus menghitung **1** kabar "Pengaduan Baru Masuk" bagi
Admin Kabupaten saat pengaduan dibuat; pagar `test.fail()` menuntut angka itu
tetap 1 sesudah diteruskan. Dibuktikan dua arah dengan menonaktifkan panggilan
itu sementara — pagarnya langsung melapor `Expected to fail, but passed` — lalu
mutasinya dikembalikan.

**Ditutup 23 Oktober 2026** — `77da88b`, merge `2c2bb47` di `main`.

Resep dalam laporan ini diikuti apa adanya: penerimanya dipersempit, bukan
panggilannya dibuang. Bagian OPD dipisahkan menjadi `notifyOpdTujuan`, dipakai
saat pengaduan LAHIR maupun saat DITERUSKAN, sehingga kalimat untuk OPD tetap
tinggal di satu tempat. `forward()` memanggil jalur sempit itu, lalu
`notifyComplaintForwarded(updated, opd.nama, user.userId)`.

**Cacatnya ternyata DUA, bukan satu.** Selain penyiaran ganda, pengecualian
penerima menyasar orang yang salah: `notifyKabupaten(excludeUserId, ...)`
dipanggil dengan `complaint.userId`, yaitu PELAPOR, padahal pelaku penerusan
adalah admin kabupaten — jadi ia mengabari dirinya sendiri. Terukur pada uji
merah: dua baris notifikasi identik, tiket sama, pengguna sama, berselang 59
milidetik, keduanya mendarat pada akun yang menekan tombolnya.

**Admin Kabupaten lain TETAP dikabari**, dengan kalimat yang menyebut yang
benar-benar terjadi (`Pengaduan <tiket> diteruskan ke <OPD>`) dan pelakunya
dikecualikan — pola yang sama dengan `notifyComplaintStatusChanged`. Pilihan itu
diambil atas persetujuan tersurat pengguna; alternatifnya tak mengabari
Kabupaten sama sekali.

**Satu uji lama yang BUKAN basi ikut diganti kontraknya.**
`notifications.service.spec.ts` memuat uji berjudul "TIDAK mengabari kabupaten:
ia pelaku penerusannya, jadi sudah tahu" — keputusan sengaja 7 Oktober 2026.
Alasan itu tidak salah, hanya tak lengkap: ia benar bagi PELAKUNYA, sementara
admin kabupaten bisa lebih dari satu. Yang diasersikannya pun MEKANISME
(`prisma.user.findMany` tak pernah dipanggil), lebih ketat daripada keputusan
yang hendak dijaganya. Alasan lamanya dicatat utuh di tempat uji barunya.

**Kelemahan pembuktian, dicatat apa adanya:** uji "admin yang meneruskan tidak
dikabari atas tindakannya sendiri" LULUS HAMPA pada jalan merah — saat itu
`complaint_forwarded` ke kabupaten belum ada sama sekali, jadi nol memang bukan
satu. Yang membuktikannya bekerja MUTASI: pengecualian diubah menyasar pelapor,
dan uji pengawas memerah dengan `id: {not: 10}` alih-alih `99`.

**Pengamatan "pelapornya sendiri tidak diberi tahu" sudah terjawab** sejak
7 Oktober 2026, sebelum temuan ini ditutup: `notifyComplaintForwarded` mengirim
`complaint_forwarded` kepada pelapor. Keputusan rancangan yang diminta catatan
itu sudah diambil.

**Pagar di cabang ini MASIH memakai `test.fail(true, ...)`, dan itu benar.**
Perbaikannya ada di `main`, sementara `apps/api` di `tester` belum memuatnya —
terukur, `notifyOpdTujuan` nol kemunculan pada
`tester:apps/api/src/modules/notifications/notifications.service.ts`. Mencabut
anotasinya di sini akan memerahkan suite karena sebab yang bukan cacat. Cabut
begitu `tester` disegarkan dari `main`.

---

<a id="bug-019"></a>

### BUG-019 — Layar "Gagal masuk lewat SSO" menampilkan kalimat dari luar, apa adanya

|                       |                                                      |
| --------------------- | ---------------------------------------------------- |
| **Charter**           | C-09                                                  |
| **Tanggal**           | 15 September 2026                                     |
| **Peran**             | **siapa pun yang mencoba masuk** — termasuk warga     |
| **Halaman**           | `/sso/callback` (layar gagal masuk)                   |
| **Severity**          | Medium                                                |
| **Kasus uji terkait** | TC-AUTH-001 s/d 003, C-09                             |

**Langkah reproduksi**

1. Buka tautan berikut di peramban (tanpa sesi apa pun):

   ```
   http://skema.local/api/v1/auth/sso/callback?error=access_denied&error_description=Akun+Anda+diblokir.+Hubungi+0812-PENIPU+untuk+membukanya.
   ```

2. Baca layar yang muncul.

**Hasil yang diharapkan** — aplikasi menjelaskan kegagalannya dengan kalimatnya
sendiri. Keterangan mentah dari penyedia identitas boleh masuk log, bukan layar.

**Hasil sebenarnya** — kalimat karangan itu tampil utuh, **di domain yang asli,
di dalam alur masuk**, lengkap dengan tombol milik aplikasi di bawahnya:

```
Gagal masuk lewat SSO Helpdesk
Akun Anda diblokir. Hubungi 0812-PENIPU untuk membukanya.
[ Coba masuk lagi ]  [ Kembali ke beranda ]
```

Diperiksa di peramban sungguhan, bukan disimpulkan dari kode.

**Sebabnya, dua baris di dua berkas.**
`auth.controller.ts:164` meneruskan keterangannya apa adanya:

```ts
this.ssoService.buildFailureRedirect(query.error_description ?? query.error)
```

`buildFailureRedirect` menaruhnya di fragment `#error=`, dan `AuthCallbackLoader`
merendernya lewat `setMessage(galat)`. DTO-nya mengizinkan **1024 karakter**
bebas (`@MaxLength(1024)`), tanpa daftar nilai yang boleh.

**Ini BUKAN XSS, dan perbedaannya penting.** React merender pesan itu sebagai
teks, bukan HTML — tak ada `dangerouslySetInnerHTML` di jalur ini, jadi tak ada
kode yang dapat dijalankan. Yang disuntikkan **kalimatnya**. Justru itu yang
membuatnya bekerja: korban melihat nomor telepon palsu pada halaman pemerintah
yang sah, di dalam alur yang paling ia percayai, tanpa satu pun tanda bahaya yang
biasa diajarkan (alamatnya benar, sertifikatnya benar, tampilannya benar).

**Sisi kedua yang terjadi tanpa penyerang mana pun.** Percobaan dengan `code`
karangan tetapi `state` yang sah menghasilkan layar berbunyi:

```
Helpdesk tidak mengembalikan access_token: invalid authorization code
```

Itu bukan kalimat untuk warga. Jadi jalur yang sama menghasilkan dua masalah
sekaligus: dapat disalahgunakan bila ada yang mau, dan **sudah membingungkan
sekarang** tanpa ada yang mau.

**Saran perbaikan** — petakan galat yang dikenal ke kalimat milik aplikasi
(`access_denied` → "Anda membatalkan proses masuk."), dan untuk yang tak dikenal
tampilkan satu kalimat baku beserta kode galatnya saja. Keterangan aslinya sudah
ikut tercatat di log (`auth.controller.ts:159-161`), jadi kemampuan menelusuri
tak berkurang sedikit pun.

**Terkunci uji otomatis sejak 15 September 2026** —
[`apps/web/e2e/sso-galat.spec.js`](../apps/web/e2e/sso-galat.spec.js). Uji
kendali yang wajib lulus membuktikan jalur gagalnya memang hidup dan mengalihkan
ke `/sso/callback#error=`; pagar `test.fail()` menuntut kalimat karangan tak ikut
ke sana. Dibuktikan dua arah dengan menghapus `query.error_description` dari
pemanggilan itu sementara, lalu mengembalikannya.

**Ditutup 22 Oktober 2026** — `3fb335f`, merge `e3ce3f8` di `main`.

Tujuh kode galat RFC 6749 §4.1.2.1 dipetakan ke kalimat milik aplikasi sendiri
di berkas baru `apps/api/src/modules/auth/sso-galat.util.ts`; controller tak
lagi menyentuh `error_description`, yang tetap tercatat di log.

**Saran perbaikan di atas TIDAK diikuti sepenuhnya, dan itu disengaja.** Saran
itu berbunyi "untuk yang tak dikenal tampilkan satu kalimat baku beserta kode
galatnya saja". Kode galatnya tidak ditampilkan: `error` pun medan bebas 256
karakter, jadi memantulkannya hanya memperkecil cacatnya alih-alih menutupnya.
Keputusan tersurat pengguna pada hari yang sama.

**Pagar di cabang ini MASIH memakai `test.fail(true, ...)`, dan itu benar.**
Perbaikannya ada di `main`, sementara `apps/api` di `tester` belum memuatnya —
terukur, `pesanGalatSso` nol kemunculan pada `tester:apps/api/src/modules/auth/auth.controller.ts`.
Mencabut anotasinya di sini akan memerahkan suite karena sebab yang bukan cacat.
Cabut begitu `tester` disegarkan dari `main`.

**`main` kini punya pagarnya sendiri**, sebab `sso-galat.spec.js` hidup hanya di
cabang ini: `apps/api/test/sso.e2e-spec.ts` menuntut kalimat karangan tak sampai
ke header `Location`. Kedua asersinya dibuktikan lewat mutasi — controller
dikembalikan meneruskan `error_description`, keduanya memerah dengan
`#error=Akun Anda diblokir. Hubungi 0812-PENIPU...`, lalu kode dipulihkan dari
salinan dan diperiksa `diff` kode=0.

**Tiga uji yang sudah ada ternyata mengunci cacatnya** dan kontraknya diganti,
bukan asersinya dilonggarkan: `auth.controller.spec.ts` menuntut
`#error=Pengguna membatalkan`, dan `sso.e2e-spec.ts:237` menuntut
`toContain('Pengguna%20membatalkan')` — yakni menuntut teks dari luar MUNCUL di
alamat tujuan.

---
<a id="cat-019"></a>

### CAT-019 — Ekspor daftar survei mewarisi batas 100 baris, dan "Excel" sebenarnya CSV

**Ditemukan:** 15 September 2026 (charter C-19)

**Ekspornya bekerja.** Diperiksa dengan benar-benar mengunduh berkasnya di
peramban, bukan sekadar menekan tombolnya:

| Pilihan | Berkas | Ukuran | Isi |
| ------- | ------ | -----: | --- |
| Ekspor Excel | `daftar-survei.csv` | 145 byte | baris kepala + data: `"Judul Survei","Periode","Status","Responden","Nilai IKM"` |
| Ekspor PDF | `daftar-survei.pdf` | 5.458 byte | berawalan `%PDF-` — PDF sungguhan, bukan HTML bernama .pdf |

Dua hal yang perlu diketahui sebelum berkas ini dipakai sebagai lampiran resmi:

**1. Batas 100 baris, dan ia diam.** `/admin-opd/surveys` mengambil
`getSurveys({ limit: 100 })` lalu menyaring di peramban, dan `SurveyListExportMenu`
mengekspor apa pun yang tersisa di array itu. Pola yang sama sudah melahirkan
[BUG-011](#bug-011) dan [CAT-011](#cat-011) pada halaman OPD. Untuk ekspor
akibatnya lebih tajam: berkasnya **terbaca sebagai rekaman resmi yang lengkap**,
padahal begitu satu OPD melewati 100 survei, kelebihannya hilang tanpa
peringatan — dan subjudul PDF-nya tetap mengumumkan angka yang sudah terpotong
itu sebagai total. Belum terjangkau hari ini (jumlah survei masih jauh di bawah
100), jadi dicatat sebagai batas yang diketahui, bukan cacat yang terjadi.
Memperbaikinya menuntut paginasi atau endpoint ekspor sisi server — `limit`
backend memang berhenti di 100.

**2. "Ekspor Excel" menghasilkan `.csv`, bukan `.xlsx`.** Excel membukanya, jadi
tak ada yang rusak; tetapi pemakai yang memilih "Excel" lalu menerima CSV akan
mengira ada yang salah — terutama di Windows berlokal Indonesia, tempat CSV
berpemisah koma kerap terbuka menumpuk dalam satu kolom. Menamainya "Ekspor CSV"
menyelesaikannya tanpa mengubah satu baris kode pun di jalur unduhnya.

**Yang justru pantas dicontoh dari komponen ini.** `EksporMenu` memakai
`aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, dan `role="menuitem"` —
lengkap. Perbandingan itulah yang membuat ketiadaan atribut serupa pada
`components/ui/Dropdown.jsx` ([BUG-017](#bug-017)) terbaca sebagai kelalaian,
bukan gaya rumah: polanya sudah dikuasai di berkas sebelah.

<a id="cat-020"></a>

### CAT-020 — nginx menandai API mati dan tak pulih sendiri; inilah sebagian "kegoyahan" E2E

**Ditemukan:** 15 September 2026 (saat memasang pagar regresi)

**Gejalanya membingungkan justru karena separuhnya sehat.** Sepanjang sore
`http://skema.local/api/v1/*` membalas **502** terus-menerus, sementara
`http://skema.local/` membalas 200 — padahal keduanya dilayani nginx yang sama
dan menunjuk hostname upstream yang sama.

Ditelusuri berlapis, dan tiap lapis mematahkan satu dugaan:

| Yang diperiksa | Hasil |
| -------------- | ----- |
| Proses API masih hidup? | ✅ `dist/main` berjalan, port **3001 mendengarkan** |
| API dapat dicapai dari host? | ✅ `127.0.0.1:3001` dan `[::1]:3001` membalas **200** |
| API dapat dicapai **dari dalam container nginx**? | ✅ `host.docker.internal:3001` membalas **200** |
| Resolusi `host.docker.internal` | ✅ `192.168.65.254`, sama untuk web maupun api |
| Lewat nginx | ❌ **502** |

Jadi bukan API yang mati, bukan DNS, bukan jaringan container. Yang tersisa:
**nginx menandai upstream `skm_api` mati saat API benar-benar sedang restart, lalu
tidak memulihkannya kembali.** Satu `nginx -s reload` menyembuhkannya seketika.

**Apa yang benar-benar dijelaskannya — dan apa yang tidak.** Dua jalan E2E sore
itu mati di `globalSetup` dengan **`POST /auth/dev-login → HTTP 502`**, dan
keduanya memang ini sebabnya. Tetapi jalan penuh **sesudah** nginx dimuat ulang,
dengan `api=200` dan `web=200` diperiksa sebelum maupun sesudahnya, **tetap
gagal 5 dari 17** — seluruhnya `page.goto`/`waitForURL` yang kehabisan waktu,
tanpa satu pun 502 di lognya. Jadi catatan ini **tidak** menutup kegoyahan E2E
yang dicatat [§Y.3 TEST_CASES](TEST_CASES.md); ia hanya mencabut dua jalan dari
daftar itu dan menambahkan satu pemeriksaan murah yang sebelumnya tak ada.

Godaan untuk menyatakannya sebagai sebab tunggal besar justru karena gejalanya
mirip — dan menyerah pada godaan itu akan menghentikan penelusuran pada sebab
yang salah.

**Yang harus dilakukan penguji berikutnya sebelum menulis temuan apa pun:**

```
curl -o /dev/null -w "api=%{http_code} " http://skema.local/api/v1/statistics
curl -o /dev/null -w "web=%{http_code}\n" http://skema.local/
```

Bila `api=502` sementara `web=200`, jalankan `docker exec skm-proxy nginx -s reload`
lalu ulangi. Kegagalan E2E yang dikumpulkan dalam keadaan itu **tidak berarti
apa-apa tentang produk** — dan sebaliknya, kegagalan yang dilaporkan tanpa
pemeriksaan ini tak dapat dipercaya.

**Terulang, dan obatnya terbukti dua kali.** Gejala yang sama muncul lagi pada
15 September 2026 pukul 03.30 — `api=502` sementara `web=200` — di tengah jalan
Jest yang membebani mesin. `docker exec skm-proxy nginx -s reload` kembali
menyembuhkannya seketika. Jadi ini **bukan kejadian sekali**, melainkan pola
yang berulang tiap kali API sempat tak menjawab: satu-satunya yang dibutuhkan
adalah jeda cukup panjang pada upstream, dan beban mesin sudah cukup
menyediakannya. Pemeriksaan `curl` dua baris di atas karena itu pantas dijadikan
kebiasaan sebelum menjalankan suite, bukan hanya saat ada yang mencurigakan.

**Bukan cacat produk.** nginx di sini hanya perkakas pengembangan; di produksi
frontend dan backend tak dilayani lewat `host.docker.internal`. Dicatat sebagai
catatan lingkungan yang **menjelaskan kegagalan pengujian**, bukan sebagai
temuan atas aplikasinya.

---

<a id="cat-021"></a>

### CAT-021 — Seed tak menghasilkan satu pun akun berperan jamak, padahal peran jamak inti model aksesnya

**Ditemukan:** 15 September 2026 (saat menimbang apakah suite perlu dijalankan
ulang dari seed bersih)

Basis data sekali pakai dibangun dari nol — `migrate deploy` lalu `db:seed`,
keduanya lulus — dan isinya:

```
1 | admin.kabupaten@example.go.id | {kabupaten}
2 | superuser@example.go.id       | {superuser}
3 | admin.opd@example.go.id       | {opd}
4 | warga@example.go.id           | {responden}
```

**Keempatnya berperan tunggal.** Bandingkan dengan `skm_db`, tempat **lima dari
tujuh** akun berperan lebih dari satu (`superuser` memegang empat).

**Kenapa itu celah, bukan sekadar perbedaan.** Sejak 5 September 2026 kolom
`role` tunggal dibuang dan diganti `roles Role[]`; akses ditentukan klaim `act`
pada token. Seluruh kontrak yang lahir dari situ **hanya dapat diamati pada akun
berperan banyak**:

| Yang hanya muncul pada akun berperan jamak | Akibat di lingkungan hasil seed |
| ------------------------------------------ | ------------------------------- |
| `dev-login` pulang dengan `actingRole: null` | tak pernah terjadi — semua langsung ber-peran |
| **401 "Peran yang ingin dipakai belum dipilih"** | tak pernah terjadi |
| `POST /auth/acting-role` | tak pernah dipanggil |
| `RoleLoginPicker` (pemilih peran saat masuk) | tak pernah dirender |
| Berpindah peran dalam satu sesi (**seluruh charter C-15**) | **tak dapat dijalankan sama sekali** |

Artinya siapa pun yang menyiapkan lingkungan baru persis sesuai dokumen —
`migrate deploy`, `db:seed`, selesai — **tak dapat menguji mekanisme yang kini
menjaga setiap endpoint terlindung**, kecuali ia menulis SQL sendiri.

**Yang lebih rapuh daripada celahnya sendiri.** Ketujuh akun di `skm_db` berperan
jamak bukan karena seed, melainkan karena **seseorang menyetelnya dengan tangan**
di suatu titik, dan penyetelan itu **tidak tercatat di mana pun dalam repositori**.
Ia hidup hanya di satu basis data pengembangan di satu mesin. Hilang basis data
itu, hilang pula satu-satunya lingkungan tempat peran jamak dapat diuji — dan tak
ada yang tahu cara membangunnya kembali.

**Saran perbaikan** — cukup satu baris arah: beri minimal satu akun seed lebih
dari satu peran. `admin.opd@example.go.id` dengan `[Role.opd, Role.responden]`
paling masuk akal, sebab pasangan itulah yang nyata dipakai di `skm_db` dan yang
membuat admin OPD dapat ikut mengisi survei. Dengan itu, lingkungan baru langsung
memiliki jalur `actingRole: null` → pemilih peran → `POST /auth/acting-role`
untuk diuji.

**Catatan yang menyertainya, dan ini kabar baik.** Keputusan untuk **tidak**
menjalankan ulang seluruh suite dari seed bersih diambil setelah menimbang ini:
seed bersih menghasilkan **dunia yang berbeda**, bukan dunia yang sama dengan
lebih rapi. Lagi pula angka yang paling sering dikutip — **Jest 673/673 di 92
berkas** — tak menyentuh basis data sama sekali (MSW yang menjawab), jadi ia
**sudah** dapat direproduksi di mesin mana pun tanpa seed. Yang bergantung pada
basis data hanya lapisan E2E, dan ketakstabilannya berasal dari sisi peramban
([§Y.3 TEST_CASES](TEST_CASES.md)), bukan dari data.

---

---

<a id="bug-020"></a>

### BUG-020 — Parameter boolean bernilai `false` dibaca sebagai `true` di empat endpoint

|                       |                                                                              |
| --------------------- | ---------------------------------------------------------------------------- |
| **Charter**           | — (ditemukan saat menulis uji e2e penyaring OPD, 15 Oktober 2026)            |
| **Tanggal**           | 15 Oktober 2026                                                              |
| **Peran**             | siapa pun yang memanggil API; tak ada peran tertentu yang terdampak          |
| **Halaman**           | — cacatnya di lapis kontrak API, bukan di satu halaman                       |
| **Severity**          | Low                                                                          |
| **Kasus uji terkait** | TC-OPD-003 (sudah ✅), TC-BOOL-001, TC-BOOL-002, TC-BOOL-003                 |

**Catatan lingkup, disebut lebih dulu supaya tidak menyesatkan.** Kepala dokumen
ini menyatakan lingkupnya `apps/web` saja, dan temuan ini di luar itu: cacatnya
ada di DTO `apps/api`. Ia dicatat di sini atas permintaan pengguna, karena
tempat lain tak ada, dan karena akibatnya terasa oleh pemakai API mana pun —
termasuk `apps/web` bila suatu saat mengirim medannya.

**Langkah reproduksi**

1. Panggil `GET /api/v1/opd?search=<kode OPD nonaktif>&isActive=false` sebagai
   Admin Kabupaten.
2. Panggil permintaan kendali yang sama tanpa `&isActive=false`.
3. Bandingkan jumlah barisnya.

**Hasil sebenarnya.** Kendali mengembalikan barisnya dengan `"isActive": false`,
jadi datanya memang ada. Permintaan ber-`isActive=false` mengembalikan **nol**
baris, dan `isActive=true` juga **nol**. Dua-duanya kosong hanya mungkin bila
penyaringnya bernilai `true` pada kedua permintaan.

**Sebabnya pasti, dan satu untuk keempat medan.** `apps/api/src/app.setup.ts:289`
menyalakan `transformOptions.enableImplicitConversion`. class-transformer lalu
mengubah nilai masuk memakai tipe hasil refleksi, dan untuk `boolean` ia
menjalankan `Boolean(value)`; `Boolean('false')` bernilai `true`. Konversi itu
berjalan SEBELUM `@Transform` milik DTO, sehingga `@Transform` tak pernah
melihat string aslinya. Nilai `'true'` lolos benar secara kebetulan, `'false'`
tidak, dan `@IsBoolean()` tak dapat menangkapnya karena yang sampai kepadanya
memang sudah boolean yang sah.

Terukur langsung atas class-transformer, bukan disimpulkan dari membaca kode:

| Bentuk dekorator                     | `'false'` | `'true'` |
| ------------------------------------ | --------- | -------- |
| `@Transform` saja                    | `true`    | `true`   |
| `@Type(() => Boolean)`               | `true`    | `true`   |
| `@Type(() => String)` + `@Transform` | `false`   | `true`   |

**Empat medan terkena, satu sudah diperbaiki:**

| Medan        | Berkas                             | Bentuk semula          | Uji yang menanggungnya    |
| ------------ | ---------------------------------- | ---------------------- | ------------------------- |
| `isActive`   | `list-opd-query.dto.ts`            | `@Transform` saja      | `opd.e2e:147`             |
| `isAnonim`   | `create-complaint.dto.ts`          | `@Transform` saja      | `complaints.e2e:473`      |
| `tanpaOpd`   | `list-complaint-query.dto.ts`      | `@Transform` saja      | `complaints.e2e:509`      |
| `unreadOnly` | `list-notification-query.dto.ts`   | `@Type(() => Boolean)` | `notifications.e2e:291`   |

**Keempatnya diperbaiki 15 Oktober 2026**, masing-masing satu dekorator
`@Type(() => String)`. Bentuk perbaikan berbeda pada berkas notifikasi: ia
memakai `@Type(() => Boolean)` tanpa `@Transform` sama sekali, jadi ia mendapat
keduanya.

Perbaikannya satu dekorator per medan, `@Type(() => String)` di atas
`@Transform`, sehingga konversi implisit tak mengubah apa pun dan `@Transform`
menerima stringnya. Mematikan `enableImplicitConversion` secara global akan
mengubah perilaku setiap DTO di aplikasi, jadi tidak dipilih.

**Severity Low, dan alasannya perlu dibaca utuh.** Alinea ini ditulis sebelum
ketiga medan sisanya diperbaiki, dan disimpan apa adanya: ia menjelaskan mengapa
cacat ini dapat bertahan tanpa ada yang memerah, keterangan yang hilang bila
dihapus begitu temuannya ditutup.

Ketiga medan yang tersisa waktu itu tak terjangkau dari antarmuka, dan itu
diperiksa satu per satu:
`complaints.api.js:35-37` hanya menyertakan `isAnonim` bila bernilai benar;
`tanpaOpd` tak punya satu pun pemanggil di `apps/web/src`; dan
`NotificationHistoryScreen.jsx:112` menghilangkan `unreadOnly` alih-alih
mengirim `false`. Karena itu tak ada pengguna yang dapat memicunya lewat
aplikasi, dan tak ada uji yang akan memerah dengan sendirinya.

Yang terjangkau adalah kontrak API-nya. Ketiga medan terdaftar
`@ApiPropertyOptional` dan tampil di `/api/docs`, jadi siapa pun yang memakainya
dari Swagger, dari skrip, atau dari kode frontend baru akan mendapat kebalikan
dari yang diminta tanpa satu pun galat. Itu pula yang terjadi pada `isActive`:
cacatnya tersembunyi sampai sebuah uji benar-benar mengirim `false`.

**Satu di antaranya pantas diperbaiki lebih dulu meski Low.** `isAnonim`
bukan penyaring daftar. Bila jalur itu suatu saat terjangkau, pengaduan yang
dimaksudkan bernama akan tercatat anonim, dan `complaints.service.ts:731`
menyamarkan identitas pelapornya pada seluruh jalur baca sesudah itu.

**Bagaimana ini diverifikasi.** Keempat medan dibuktikan lewat uji e2e
sungguhan, masing-masing merah sebelum perbaikan dan hijau sesudahnya; berkas
dan barisnya ada di tabel di atas. Ketiga uji yang ditulis 15 Oktober memerah
karena cacatnya sendiri, bukan karena mutasi, sebab perilaku yang diuji memang
belum pernah benar. Dua di antaranya dituntut dari DUA ARAH -- `tanpaOpd=true`
dan `unreadOnly=true` wajib TETAP menyaring -- sehingga membuang penyaringnya
pun tetap memerahkan ujinya.

Satu kesalahan penguji pantas dicatat karena hampir lolos: uji `tanpaOpd`
mula-mula memerah dengan **400**, bukan dengan gejala penyaringnya, karena
`limit=200` melampaui batas 100 di `PaginationQueryDto`. Merah karena alasan
yang salah tidak membuktikan apa pun, dan bila dibiarkan ia akan tetap "merah
lalu hijau" sesudah perbaikan tanpa pernah menguji penyaringnya. Diperbaiki ke
`limit=100` lalu dijalankan ulang.

Yang masih TIDAK terjaga: tak ada apa pun yang mencegah bentuk cacat ini
tersalin ke DTO boolean berikutnya. Keempat medan yang ada kini berpagar; medan
baru tidak.

**Komentar yang menyesatkan ikut ditemukan.** `create-complaint.dto.ts` dan
`list-complaint-query.dto.ts` keduanya menolak `@Type(() => Boolean)` dengan
alasan yang tepat — `Boolean('false') === true` — tetapi melewatkan bahwa
konversi implisit melakukan hal yang sama tanpa dekorator itu. Keduanya karena
itu berbunyi seolah masalahnya sudah dihindari, padahal belum.

Komentar itu **dipertahankan, tidak diganti**, karena keputusan yang
direkamnya sungguhan dan masih berlaku. Yang ditambahkan di atasnya adalah
docblock yang menyebut apa yang mereka lewatkan.

---

<a id="bug-021"></a>

### BUG-021 — Kendali paginasi menampilkan angka yang salah, dan tiga tempat memotong daftarnya tanpa suara

|                       |                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------- |
| **Charter**           | — (ditemukan saat menyisir paginasi dashboard atas permintaan pengguna)               |
| **Tanggal**           | 15 Oktober 2026                                                                       |
| **Peran**             | Responden (angka salah), Admin Kabupaten & Admin OPD (pemotongan diam)                |
| **Halaman**           | `/complaints`; `/admin-kab/{complaints,opd,surveys,users}`; `/admin-opd/complaints`; Riwayat Aktivitas di dasbor warga |
| **Severity**          | Medium                                                                                |
| **Kasus uji terkait** | TC-FE-050, TC-FE-051; bersinggungan dengan TC-FE-013 dan TC-FE-049                    |

**Empat gejala, satu pola.** Daftar di aplikasi ini dipotong di sisi klien dan
tak ada yang mengatakannya kepada pemakainya.

**Langkah reproduksi gejala yang paling terang**

1. Masuk sebagai warga yang punya lebih dari tiga pengaduan.
2. Buka `/complaints`.
3. Hitung baris pada tabelnya, lalu baca baris keterangan di bawahnya.

**Hasil sebenarnya.** Tabelnya menampilkan dua belas baris; keterangannya
berbunyi **"Menampilkan 1-3 dari 12 pengaduan"**, dan kedua tombol panah mati.
Angkanya bukan sekadar salah — ia membuat warga menyangka ada sembilan
pengaduan lain yang tak dapat ia buka.

**Sebabnya tersurat di kodenya.** `ComplaintTable.jsx` memanggil `Pagination`
dengan `totalPages={1} currentPage={1} itemsPerPage={3}` dipatok mati, sementara
`totalItems` diisi panjang array yang sebenarnya. Tiga nilai pertama tak pernah
berubah, jadi `endItem` selalu `min(1 × 3, totalItems)` = 3.

**Tiga gejala lain, semuanya diam.**

| Tempat                                  | Pemotongan                                    | Yang hilang                                                             |
| --------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| Lima halaman admin                      | `FETCH_LIMIT = 100` lalu paginasi di klien    | jumlah halaman dihitung dari baris yang TERAMBIL, bukan `meta.pagination.total` |
| Daftar pengaduan warga                  | ambil 50                                      | sisanya tak pernah disebut                                              |
| Riwayat Aktivitas (dasbor warga)         | `MAX_ROWS = 10`                               | tanpa catatan dan tanpa tautan "lihat semua"                            |

Pada lima halaman admin, akibat yang paling mudah terlewat bukan jumlah
barisnya melainkan **penyaringnya**: pencarian di halaman-halaman itu bekerja
atas seratus baris yang terambil, jadi pengaduan yang cocok tetapi tak terambil
tak akan pernah muncul — dan admin yang mencarinya akan menyimpulkan ia tidak
ada.

**Satu tempat SUDAH berterus terang sebelum hari ini**, dan itulah pola yang
dipakai ulang: `ComplaintStatusBreakdown` menyebut "Dihitung dari 100 pengaduan
terbaru saja (total N)". Berkas itu sengaja TIDAK diubah; kalimatnya menerangkan
angka hasil hitungan atas irisan, bukan daftar yang terpotong.

**Perbaikannya.** Satu komponen bersama, `components/ui/CatatanPemotongan.jsx`,
dipasang di empat tempat, ditambah angka `Pagination` yang diturunkan dari baris
yang benar-benar ada. `total` dibaca dari `meta.pagination.total`, dan `0`
diperlakukan sebagai "belum diketahui" alih-alih "tidak terpotong" — ketiadaan
data bukan bukti, dan peringatan palsu di setiap halaman lebih buruk daripada
tak ada peringatan.

**Bagaimana ini diverifikasi.** 21 kasus uji baru, seluruhnya dibuktikan merah
lebih dulu. Komponennya dibuat sebagai stub KOMPILABEL dahulu supaya ujinya
benar-benar jalan dan memerah karena perilaku, bukan karena galat impor: 3 dari
5 gagal, dan 2 yang menuntut "tidak menampilkan apa pun" lulus karena stub
memang merender `null`. `ComplaintTable` 2 dari 5 gagal; tiga uji halaman admin
3 gagal dengan 3 kendali lulus; Riwayat Aktivitas 1 gagal dengan 2 kendali lulus.
Tiap kendali ada supaya uji pasangannya tak tetap hijau bila catatannya dipasang
tanpa syarat. Sesudahnya suite web 200 berkas / 1.640 uji lulus, eslint kode=0.

**DUA PEMASANGAN TIDAK TERCAKUP UJI, DAN KINI TERCAKUP** — keduanya pada
15 Oktober 2026 juga, beberapa jam sesudah entri ini ditulis. Ketika status
"Ditutup" di atas diberikan, `admin-kab/complaints` dan `admin-opd/complaints`
tak punya uji halaman di `main` sama sekali, jadi catatan di kedua halaman itu —
tiga baris, identik dengan tiga halaman yang teruji — tak dibuktikan oleh uji
apa pun, dan batas itu disebut tersurat supaya "Ditutup" tidak dibaca lebih luas
dari kenyataannya. Lubang itu ditutup commit `06a7da7` di `main`: enam kasus
untuk halaman Kabupaten, tujuh untuk halaman OPD.

**Dibuktikan lewat MUTASI, sebab merah alami tak mungkin ada di sini.** Kode
halamannya sudah ada, jadi uji yang baru ditulis lulus pada jalan pertama — dan
uji yang belum pernah terlihat merah tidak membuktikan ia mampu menangkap apa
pun. Sebelas mutasi karena itu dipasang satu per satu ke kedua halaman,
masing-masing dijalankan sendiri, lalu dipulihkan (`git diff` atas kedua halaman
kosong sesudahnya). Setiap satu dari tiga belas uji terbunuh oleh setidaknya satu
mutasi, dan yang mati selalu uji yang memang menjaga perkara itu:

| Mutasi                                              | Uji yang memerah                                       |
| --------------------------------------------------- | ------------------------------------------------------ |
| `ditampilkan={barisTerambil}` → `{totalSeluruhnya}` | 2 per halaman: catatannya tak pernah muncul            |
| `adaPenyaring` → `adaPenyaring={false}`              | 1: kalimat yang menyebut pencarian hilang              |
| `total={totalSeluruhnya}` → `total={99999}`          | 3, termasuk KEDUA uji kendali "TIDAK memasang catatan"  |
| `ITEMS_PER_PAGE` 5 → 10                              | 2                                                      |
| `matchSearch` dibuang dari penyaring                 | 1                                                      |
| `getComplaints` menerima `opdId` lagi                | 1, hanya halaman OPD                                   |

Mutasi ketiga yang paling berguna: ia membuat catatannya SELALU muncul, dan dua
uji kendali itulah yang menangkapnya. Tanpa keduanya, "halaman mengatakan
daftarnya terpotong" dapat dipenuhi oleh halaman yang memperingatkan
terus-terusan, termasuk ketika tak ada yang terpotong.

Uji terakhir di halaman OPD menjaga perkara yang berbeda dan bukan tentang
pemotongan: `?opdId=` TIDAK boleh dikirim dari klien. Penyaring itu dibuang
5 September 2026 ketika hak akses mulai mengikuti peran yang DIPAKAI dan backend
menurunkan instansinya sendiri dari `users.opd_id`; sampai hari ini keputusan itu
hanya hidup sebagai komentar.

**SATU BENTURAN MERGE DITINGGALKAN, dan perlu diputuskan sadar sebelum `main`
ditarik ke `tester` lagi.** Jalur
`apps/web/src/app/admin-opd/complaints/__tests__/page.test.jsx` kini berisi DUA
berkas yang lahir sendiri-sendiri: di `tester` versi September (enam kasus,
`e3c5a0b`, suite TC-FE-041, tak pernah ikut ke `main`), dan di `main` versi
15 Oktober (tujuh kasus, commit `06a7da7`). Keduanya tercatat sebagai
penambahan, bukan suntingan, jadi tarikan berikutnya akan berbenturan di jalur
itu — dan memilih salah satunya akan MEMBUANG cakupan. Versi `tester` menguji
dropdown status, keadaan kosong, Reset Filter, serta pencarian menurut nomor
tiket dan nama pelapor; versi `main` menguji catatan pemotongan, angka paginasi,
dan `opdId` yang tak dikirim. Tak ada satu pun uji yang muncul di keduanya.
Penyelesaiannya gabungan, bukan pilihan.

**GABUNGAN ITU KINI SUDAH ADA** (15 Oktober 2026, commit `9a9ce6d` di `main`).
Kedua berkas dilebur menjadi satu bertiga belas kasus, dan enam kasus September
di dalamnya dipertahankan apa adanya. Yang perlu dibaca tepat: benturan git-nya
TIDAK hilang — kedua sisi tetap tercatat MENAMBAHKAN berkas pada jalur yang
sama, jadi tarikan berikutnya tetap akan berhenti di sana dan meminta
diselesaikan. Yang berubah akibatnya: penyelesaiannya sekarang cukup mengambil
versi `main`, dan tak ada cakupan yang hilang.

Gaya ujinya ikut berpindah ke MSW pada commit yang sama, dan itu bukan selera:
`jest.mock` atas `complaints.api` membuat MSW tak pernah terpanggil, sedangkan
enam kasus September itulah yang menembus `getComplaints` serta `adaptComplaint`
sungguhan dan karena itu ikut membuktikan pemetaan adapternya. Menulis ulang
berkasnya membatalkan sebelas mutasi sebelumnya, jadi tujuh belas mutasi
dipasang satu per satu untuk membuktikan ulang kesembilan belas ujinya; semuanya
memerah, dan 19 dari 19 uji terbunuh oleh setidaknya satu. Dua yang paling
berguna: `setStatusFilter('Semua Status')` menjadi `('')` — persis cacat yang
diperingatkan docblock `handleResetFilters` — membunuh tepat satu uji, dan
`total={99999}` yang membuat catatan pemotongan selalu muncul ditangkap oleh dua
uji kendali.

Temuan sampingan dari benturan itu, dicatat karena ia memperbaiki kesalahan
penguji sendiri: catatan pertama hari ini menyatakan berkas tersebut "tak ada
lagi". Itu bacaan `main`, dan di `tester` berkas itu hidup. Koreksinya ada pada
catatan §Y.1 `TEST_CASES.md`, beserta sebab yang sama yang membuat angka
"200 berkas / 1.640 uji" tak dapat dibandingkan dengan tabel pemetaan di sana.

**Dua kesalahan penguji, dicatat karena keduanya hampir lolos.** Pertama,
kalimat catatannya mula-mula selalu berbunyi "termasuk oleh pencarian dan
penyaring di atas", padahal dua dari empat pemakainya tak punya penyaring sama
sekali; klausanya dibuat bersyarat dan dua uji menjaga kedua bunyinya. Kedua,
uji Riwayat Aktivitas mula-mula memerah karena
`findByText(/Mengajukan Pengaduan/)` cocok ke BANYAK elemen, bukan karena
catatannya belum ada — merah dengan alasan yang salah, yang tidak membuktikan
apa pun; diganti `findAllByText` lalu dijalankan ulang.

**Yang TIDAK diperbaiki** ada di [CAT-022](#cat-022): pemotongannya sendiri
tetap, dan pencarian di lima halaman admin tetap hanya mencari di dalam irisan
seratus baris.

---

<a id="cat-022"></a>

### CAT-022 — Paginasi klien atas satu ambil 100 baris: pencariannya hanya mencari di dalam irisan

Bukan cacat, melainkan pertukaran yang disengaja dan tertulis di kodenya sendiri
(`admin-kab/complaints/page.jsx`): *"ambil satu halaman besar lalu
filter+paginasi di klien, backend belum py search/kategori bebas teks"*. Dicatat
di sini supaya keputusannya diambil sadar, bukan terlewat.

Terukur: `ListComplaintQueryDto` hanya menerima `status`, `opdId`, `tanpaOpd`,
`page`, dan `limit`. Tak ada `search`, tak ada `kategori`. Hal yang sama
berlaku pada daftar pengguna, survei, dan OPD. Karena itu memindahkan paginasi
ke sisi server **tanpa lebih dulu menambah `search` di backend justru akan
MEMATIKAN pencarian** di kelima halaman itu — penyaringnya hanya akan menyaring
halaman yang sedang terbuka.

Akibatnya hari ini, di atas seratus baris: baris yang cocok dengan pencarian
tetapi tidak terambil tak akan pernah muncul, dan admin yang mencarinya akan
menyimpulkan ia tidak ada. Sejak 15 Oktober 2026 halaman itu setidaknya
MENGATAKAN bahwa daftarnya terpotong dan bahwa pencariannya ikut terbatas
(lihat [BUG-021](#bug-021)), tetapi batasannya tetap.

Jalan keluarnya satu pekerjaan lintas-endpoint: `search` dan `kategori` pada DTO
daftar pengaduan, pengguna, survei, dan OPD, lalu frontend berhenti mengambil
seratus baris dan memaginasi dari `meta.pagination.total`. Itu menyentuh DTO,
service, dan setiap halaman admin beserta ujinya, jadi ia pantas punya desain
sendiri lebih dahulu.

Satu angka yang menenangkan untuk sekarang: daftar OPD berisi 62 baris, di bawah
batas seratus, jadi TC-FE-049 ("seluruh baris terjangkau") masih benar. Yang
paling dekat melewati batas adalah pengaduan.

---

<a id="cat-023"></a>

### CAT-023 — Cabang `tester` tertinggal sebulan dari `main`, dan dua puluh sembilan berkas hidup hanya di sana

Bukan cacat produk, melainkan keadaan repositori yang perlu diputuskan sadar.
Disisir 15 Oktober 2026 sesudah satu benturan merge pada [BUG-021](#bug-021)
memaksa pertanyaan ini terbuka.

**Ukurannya.** Commit terakhir `main` yang pernah sampai ke `tester` adalah
`de41245`, **15 September 2026** — tepat sebulan. Di luar `docs/`, 720 berkas
berbeda antara kedua cabang: **342 hanya ada di `main`** (fitur sebulan terakhir
yang `tester` tak pernah terima), **349 berbeda isinya**, dan **29 hanya ada di
`tester`**. Angka itu penting karena ia membalik anggapan yang mudah terbentuk:
"menarik `main` ke `tester`" bukan pekerjaan kecil, dan `tester` bukan cabang
yang berada di depan.

**Dua puluh sembilan berkas milik `tester` saja** terbagi tiga, dan hanya dua
bagian pertama yang bernilai:

| Isi                                         | Jumlah | Catatan                                                                                |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Berkas uji Jest                             | 13     | diukur hari ini, lihat tabel di bawah                                                  |
| Spec Playwright beserta penopangnya (`.js`) | 11     | BELUM dinilai; `main` punya spec `.ts` sendiri yang mungkin sudah menggantikannya      |
| Berkas sumber yang `main` sudah hapus        | 5      | `update-insight.dto.ts`, `InsightCard.jsx`, `users/create/page.jsx`, dan dua komponen — sisa fitur yang dibuang di `main`, jadi kode mati di `tester` |

**Ketiga belas berkas uji dijalankan terhadap kode `main` hari ini**, bukan
dibaca. Masing-masing diambil lewat `git show tester:<jalur>`, ditulis ke pohon
kerja `main`, dijalankan sendiri-sendiri, lalu dihapus kembali di blok `finally`
— tak ada yang di-stage dan tak ada yang tertinggal. Hasilnya **113 uji: enam
berkas hijau seluruhnya, tujuh berkas dengan 14 uji merah**, dan sebab
kemerahannya bukan satu macam:

| Berkas                                     | Merah | Sebab                                                                                   | Kelas                     |
| ------------------------------------------ | ----- | --------------------------------------------------------------------------------------- | ------------------------- |
| `NavigasiPeran.test.jsx`                   | 4     | berporos pada peran `superuser`, yang dilebur ke `kabupaten` 15 September 2026           | basi, produk sengaja ubah |
| `AdminNavbarIdentitas.test.jsx`            | 1     | idem                                                                                     | basi, produk sengaja ubah |
| `UmpanBalikAksi.test.jsx`                  | 3     | mencari `role="button"` bernama "Publikasikan"; aksi itu kini butir di `RowActionsMenu`   | basi, produk sengaja ubah |
| `KitUiBersama.test.jsx`                    | 3     | `File is not a constructor`                                                              | **cacat setelan `main`**  |
| `ComplaintChat.test.jsx`                   | 1     | idem                                                                                     | **cacat setelan `main`**  |
| `RingkasanDashboard.test.jsx`              | 1     | dua kartu kini sama-sama menampilkan `-`, sehingga `getByText('-')` ambigu                | uji terlalu longgar       |
| `SurveyResponses.test.jsx`                 | 1     | fiksturnya tanpa `response.nomor`, jadi selnya berbunyi "Respons" bukan "Respons #1"      | fikstur basi              |

Enam berkas yang hijau seluruhnya: `pagar-bug-015-dialog-konfirmasi`,
`pagar-bug-016-captcha-gagal`, `pagar-bug-017-dropdown`, `HalamanTentang`,
`AuthCallbackLoader`, dan `GrafikDashboard` — 44 uji yang dapat dipindahkan ke
`main` apa adanya.

**Empat dari 14 kemerahan bukan uji basi, melainkan `main` yang kurang satu
perbaikan.** Keduanya `File is not a constructor`, dan perbaikannya sudah ada di
`jest.setup.js` milik `tester` sejak lama — lihat [CAT-009](#cat-009). Memindahkan
satu berkas itu melenyapkan empat kemerahan sekaligus.

**Satu kekhawatiran diperiksa dan TIDAK terbukti, dan itu perlu disebut tersurat
karena ia yang paling menakutkan di daftar ini.** Kegagalan
`SurveyResponses.test.jsx` berbunyi "menomori respons berurutan tanpa menyebut
identitas pengisi", dan tabel yang dirender hari ini memang punya kolom
**Pengisi** — pada pandangan pertama itu tampak seperti anonimitas SKM yang
bocor. Bukan. Kolom itu ditambahkan dengan sengaja untuk responden BUKAN-anonim
dan dinyatakan di docblock komponennya; kegagalan ujinya murni karena fiksturnya
tak membawa `response.nomor`, medan yang lahir kemudian. Uji "tidak menampilkan
satu pun identitas pengisi" pada tampilan detail jawaban **tetap hijau**, jadi
permukaan yang memang wajib anonim tetap anonim. Harapan TC-FE-042 yang
melarangnya di TABEL-lah yang sudah tak berlaku, bukan produknya yang melanggar.

**Yang pantas diputuskan.** Pemisahan ini tak dapat diselesaikan dengan satu
merge tanpa pilihan sadar, dan dokumen ini tidak memilihkannya. Tiga jalan yang
terukur: pindahkan 44 uji hijau beserta perbaikan `jest.setup.js` ke `main` lalu
biarkan `tester` menjadi cabang dokumen saja; atau segarkan `tester` dari `main`
lebih dulu dan perbarui kesembilan uji basi di sana; atau biarkan apa adanya dan
terima bahwa 44 uji yang sudah ditulis tak dijalankan oleh siapa pun. Yang
ketiga adalah keadaan hari ini, dan ia berlangsung tanpa pernah diputuskan.

#### Jalan pertama diambil, sebagian (19 Oktober 2026)

Perbaikan `jest.setup.js` dan **tujuh** berkas uji pindah ke `main` (`1bd55ec`).
Bukan enam, dan bukan 44 uji: **tujuh berkas / 66 uji**, seluruhnya hijau
terhadap kode `main` hari ini.

**DAFTARNYA DIUKUR ULANG SESUDAH PERBAIKAN `jest.setup.js`, BUKAN DIPAKAI DARI
TABEL DI ATAS.** Itu bukan kehati-hatian berlebih: empat kemerahan di tabel ini
disebabkan cacat setelan itu sendiri, jadi memakai bacaan 15 Oktober akan
meninggalkan dua berkas baik di `tester` tanpa alasan. Yang pindah:

- `components/ui/__tests__/KitUiBersama.test.jsx`
- `components/ui/__tests__/pagar-bug-015-dialog-konfirmasi.test.jsx`
- `components/ui/__tests__/pagar-bug-017-dropdown.test.jsx`
- `features/about/components/__tests__/HalamanTentang.test.jsx`
- `features/complaints/components/__tests__/ComplaintChat.test.jsx`
- `features/dashboard/components/__tests__/GrafikDashboard.test.jsx`
- `features/surveys/components/__tests__/pagar-bug-016-captcha-gagal.test.jsx`

Angkanya satu jalan jest atas ketujuhnya: `7 passed, 7 total` suite dan
`66 passed, 66 total` uji. Hitungan per berkas sengaja TIDAK dibagi dengan
tangan; itu hanya akan melahirkan angka yang tak pernah dijalankan.

**SATU BARIS DI TABEL DI ATAS TERNYATA SALAH, dan kesalahannya milik penguji.**
`AuthCallbackLoader.test.jsx` didaftarkan sebagai hijau seluruhnya pada
15 Oktober. Ia TIDAK dipindahkan, dan sebabnya terukur hari ini: lulus 7 dari 7
ketika dijalankan sendiri, tetapi **gagal pada satu dari dua jalan suite penuh**
(210 berkas). Mekanismenya sudah pasti, bukan dugaan:
`await screen.findByText(/Masuk sebagai — Rahmat Hidayat/)` memakai tenggat
bawaan 1.000 ms, dan di bawah beban suite penuh nama itu belum tiba — cetakan
DOM pada kegagalannya menunjukkan kerangka modal pemilih peran sudah terender
sementara namanya belum.

Jadi berkas itu GOYAH, bukan basi, dan dugaan pertama penguji — bahwa ia tak
layak diangkut — TIDAK terbukti: jalan suite penuh yang kedua hijau seluruhnya
(211 berkas / 1.734 uji). Ia dapat dipindahkan, tetapi tidak apa adanya.
Alasannya ada di `.github/workflows/ci.yml` repo ini sendiri: gerbang yang merah
tanpa ada yang rusak adalah cara tercepat membuat orang berhenti memercayai CI.
Penawarnya kecil dan menyasar mekanisme yang terukur itu — naikkan tenggat pada
satu `findByText` tersebut. Satu catatan kejujuran: dua jalan tidak membuktikan
ketiadaan kegoyahan, hanya menunjukkan penawarnya menyasar sebab yang benar.

**Lima berkas yang tetap tinggal**, beserta sebab yang tidak berubah dari tabel
di atas: `NavigasiPeran` dan `AdminNavbarIdentitas` (berporos pada peran
`superuser` yang sudah dilebur), `UmpanBalikAksi` (aksinya kini butir di
`RowActionsMenu`), `RingkasanDashboard` (uji terlalu longgar), dan
`SurveyResponses` (fikstur tanpa `response.nomor`). Kelimanya menuntut penulisan
ulang terhadap komponen `main` hari ini — pekerjaan tersendiri, bukan
penyalinan.

**PEMISAHANNYA SENDIRI BELUM SELESAI, dan ini yang paling mudah disalahbaca dari
catatan ini.** Yang pindah hanya berkas uji dan satu perbaikan setelan; arah
sebaliknya tidak tersentuh. `tester` masih tidak memuat kode `main`: 342 berkas
hanya-di-`main` dan 349 yang berbeda isinya tetap seperti pengukuran 15 Oktober,
11 spec Playwright milik `tester` masih BELUM dinilai sama sekali, dan 5 berkas
sumber mati masih ada. Satu akibat dari pemisahan itu kini bahkan sudah dapat
diduga tanggalnya: pagar `test.fail()` BUG-013 di cabang ini akan memerah pada
merge `main` berikutnya — lihat peringatan di bagian rekap dokumen ini.

#### Koreksi: dua kalimat di atas berhenti benar pada hari yang sama (19 Oktober 2026)

Catatan di atas ditulis pagi ini dan dua kalimatnya sudah tidak berlaku sebelum
hari itu berakhir. Keduanya dibiarkan utuh di tempatnya dan dikoreksi di sini,
bukan ditulis ulang, supaya urutan kejadiannya tetap terbaca.

**Pertama: "Ia TIDAK dipindahkan" sudah salah.** `AuthCallbackLoader.test.jsx`
ikut pindah ke `main` beberapa jam kemudian (`6b1a7bc`), dan yang pindah adalah
**salinan apa adanya dari `tester`** — tak satu baris pun disunting.

**Kedua: penawar yang dianjurkan di atas tidak dipakai, dan itu bukan karena
berubah pikiran.** Anjurannya "naikkan tenggat pada satu `findByText` tersebut".
Suntingan itu benar-benar ditulis lebih dulu, lalu DIBUANG, karena pengukuran
berikutnya menunjukkan sasarannya terlalu sempit.

**YANG MENGUBAHNYA: porting tujuh berkas itu sendiri membuat suite web `main`
goyah, dan itu akibat pekerjaan penguji, bukan cacat yang sudah ada lalu
kebetulan terlihat.** Bandingan tiga jalan suite penuh pada tiap keadaan, kode
produk persis sama dan hanya jumlah berkas uji yang berbeda:

| Keadaan                             | Berkas | Jalan hijau seluruhnya |
| ----------------------------------- | ------ | ---------------------- |
| sembilan berkas tambahan disisihkan | 202    | 3 dari 3               |
| dengan tambahan, tenggat bawaan     | 211    | **1 dari 3**           |
| dengan tambahan, tenggat dinaikkan  | 211    | 3 dari 3               |

Baris pertama itulah yang menentukan tafsirnya. Tanpa mengukurnya, kesimpulan
yang paling mudah diambil adalah "keempat berkas itu memang sudah goyah sejak
lama" — dan baris pertama membantahnya: pada 202 berkas suite itu hijau tiga
dari tiga kali.

**Empat berkas yang memerah, dan tak satu pun isinya disentuh siapa pun hari
itu:** `app/admin-kab/audit-logs/__tests__/page.test.jsx`,
`features/surveys/builder/components/__tests__/BuilderNilaiSurvei.test.jsx`,
`features/notifications/components/__tests__/NotificationHistoryScreen.test.jsx`,
dan `features/surveys/components/__tests__/SurveyManagement.integration.test.jsx`.
Seluruhnya satu kelas kegagalan — satu `Exceeded timeout of 5000 ms for a test`
dan tiga `Unable to find an element with the text`, yang terakhir berarti tenggat
`findBy` bawaan 1.000 ms yang habis. Kelas yang sama dengan kegagalan
`AuthCallbackLoader`, dan itulah yang membuat satu penawar menyeluruh lebih masuk
akal daripada empat tambalan.

**Sebabnya pertikaian CPU, bukan cacat produk.** Jest memakai `inti - 1`
pekerja; di mesin berinti delapan itu tujuh jsdom berebut satu CPU, dan sembilan
berkas tambahan mendorong tekanan itu melewati ambang. `ubuntu-latest` di CI
biasanya berinti empat, jadi tekanan di sana sekitar separuh — **kegoyahan ini
mungkin tak pernah terlihat di CI sama sekali.** Itu bukan alasan membiarkannya;
ia terlihat oleh siapa pun yang menjalankan suite di mesinnya sendiri.

**Penawar yang akhirnya dipakai dua baris, di `main`:** `testTimeout: 20000` di
`apps/web/jest.config.js` dan `configure({ asyncUtilTimeout: 5000 })` di
`apps/web/jest.setup.js`. `configure` diambil dari `@testing-library/react`,
BUKAN dari `@testing-library/dom` — paket kedua bukan dependensi langsung
`apps/web`, jadi pnpm tak membuatnya dapat di-resolve dari sana. Harganya nyata
dan disebut di kodenya: uji yang benar-benar menggantung kini butuh 20 detik
untuk memerah, bukan 5. Waktu jalan suite tidak bergerak berarti (157,8 detik),
sebab tenggat yang longgar hanya berlaku ketika sesuatu memang lambat.

**Hitungan berkas yang pindah kini DELAPAN, dan uji yang ikut 73.** Angka 73
bukan jumlahan dengan tangan atas daftar tujuh di atas, melainkan selisih dua
jalan suite penuh yang sungguh dijalankan: 1.734 uji pada 211 berkas berbanding
1.659 uji pada 202 berkas, yaitu 75 uji, dikurangi 2 uji milik penjaga baru
`src/__tests__/penyiapan-file-global.test.js` yang bukan berkas `tester`.
Daftarnya: tujuh di atas ditambah
`features/authentication/components/__tests__/AuthCallbackLoader.test.jsx`.

**Lima berkas yang tetap tinggal tidak berubah**, dan sebabnya tidak berubah
pula. Pemisahan cabangnya pun tetap tak tersentuh: yang bertambah hari itu hanya
satu berkas uji dan satu perbaikan setelan uji, keduanya ke arah `main`.

#### Besarnya merge akhirnya terukur, dan satu cacat porting ikut tersingkap (19 Oktober 2026)

Catatan di atas menyebut pemisahan cabang berulang kali tanpa pernah menyebut
berapa benturan yang sebenarnya menanti. Angkanya sekarang ada, dan ia jauh
lebih kecil daripada yang diduga siapa pun di dokumen ini.

**Uji-coba merge dijalankan tanpa menyentuh pohon kerja** lewat
`git merge-tree --write-tree --name-only tester main`. Hasilnya **13 berkas
berbenturan**, bukan ratusan. Angka 342 berkas hanya-di-`main` dan 349 yang
berbeda isinya tetap benar, tetapi keduanya BUKAN ukuran kesulitan merge-nya:
berkas yang hanya ada di satu sisi melebur tanpa benturan sama sekali.

**TUJUH DARI TIGA BELAS BENTURAN ITU SAYA SENDIRI YANG SEBABKAN, dan sebabnya
cacat, bukan perbedaan isi yang sah.** Ketujuhnya justru berkas uji yang
dipindahkan ke `main` pagi itu, yang mestinya salinan identik. Mereka
bertabrakan sebagai `add/add` karena salinan di `main` RUSAK: skrip Python
penyalinnya membaca isi berkas dengan kodekan bawaan Windows (cp1252) lalu
menuliskannya sebagai UTF-8, sehingga tiap aksara non-ASCII tersimpan sebagai
mojibake yang kebetulan UTF-8 yang sah. Byte `e2 80 94` (tanda pisah) menjadi
`c3 a2 e2 82 ac e2 80 9d`. 58 baris di tujuh berkas.

`AuthCallbackLoader.test.jsx` tidak ikut rusak dan tidak ikut berbenturan, dan
itu yang menunjuk sebabnya: ia disalin dengan cara lain.

**Yang rusak bukan hanya komentar.** Nama `describe` dan `it` pada tiga berkas
pagar (BUG-015, BUG-016, BUG-017) ikut rusak, jadi keluaran jest di `main`
berbunyi `BUG-015 â€” dialog konfirmasi ...` dan penyaringan `-t`
atas nama itu tak lagi cocok. Nilai pernyataan tidak kena — itu diperiksa,
bukan diduga: pemeriksaannya melaporkan setiap baris rusak yang TIDAK dibuka
penanda komentar, dan yang muncul hanya enam baris `describe`/`it`. Karena
itulah 211 suite di `main` tetap hijau selama cacat ini ada.

**TAK SATU ALAT PUN MEMERAH, dan ini yang pantas diingat.** `.prettierignore`
mengecualikan `apps/web`, jadi `prettier --check` tak pernah melihat berkas
itu; eslint tak mempersoalkan aksara di dalam komentar maupun di dalam string
nama uji; dan mojibake-nya UTF-8 yang sah, jadi tak ada pembacaan yang gagal.
Satu-satunya cara menemukannya adalah membandingkan isi dengan sumbernya —
dan yang memaksanya terlihat justru uji-coba merge di atas.

**Sapuan pertama saya menjawab NOL secara salah** karena memakai daftar pola
tangan, dan hampir menghasilkan laporan "tidak ada apa-apa" yang palsu. Yang
akhirnya dipakai pembalikan: kodekan teks ke cp1252 lalu baca sebagai UTF-8;
bila langkah itu berhasil dan hasilnya berbeda, teks itu memang mojibake.

Diperbaiki di `main` (`978fcb2`, merge `900cba6`). Buktinya bertingkat byte,
bukan pemeriksaan mata: ketujuh berkas kini BYTE-IDENTIK dengan sumbernya di
cabang ini. Cabang `tester` sendiri disapu penuh lewat objek git tanpa
checkout — **0 dari 748 berkas rusak** — jadi kerusakannya memang
terisolasi pada salinan di `main` dan sumber di sini tak pernah tersentuh.

**Benturan merge karena itu turun dari 13 menjadi 6**, dan keenam sisanya
perbedaan isi sungguhan yang memang menuntut keputusan:

| Berkas                                             | Selisih `tester` — `main` |
| -------------------------------------------------- | -------------------------- |
| `apps/api/prisma/seed.ts`                          | 15 tambah / 18 buang       |
| `apps/api/tsconfig.json`                           | 1 tambah / 1 buang         |
| `apps/api/tsconfig.build.json`                     | 9 tambah / 1 buang         |
| `apps/web/jest.setup.js`                           | 49 tambah / 8 buang        |
| `apps/web/playwright.config.ts`                    | 100 tambah / 56 buang      |
| `app/admin-opd/complaints/__tests__/page.test.jsx` | 221 tambah / 24 buang      |

Tiga yang pertama berasal dari perbaikan CAT-014 yang dikerjakan di cabang ini
15 September; dua berikutnya setelan uji yang kedua cabang kembangkan sendiri;
yang terakhir satu jalur uji yang kedua sisi tulis masing-masing.

#### Keputusan atas pagar `test.fail()` BUG-013 (19 Oktober 2026)

**Pagarnya DIBIARKAN terpasang, dan pencabutannya dilakukan saat merge.**
Diputuskan pengguna, dan dasarnya terukur.

Hari ini pagar itu masih BENAR di cabang ini: cacatnya memang masih hidup di
sini. `DashboardService.hitungStatistik` di `tester` masih memanggil
`prisma.ikmResult.findMany({ select: ... })` tanpa `where` sama sekali, jadi
`test.fail()` membuat suite hijau sebagaimana mestinya dan tak ada yang perlu
dicabut. Ia baru memerah ketika `main` dimerge ke sini.

Satu hal yang membuat menunggu tidak meninggalkan celah, dan ini yang paling
pantas dicatat: **BUG-013 sudah berpagar di `main` lewat sembilan uji e2e
`apps/api`** di `test/dashboard.e2e-spec.ts`, yang dibuktikan merah oleh
cacatnya sendiri. Jadi penundaan di sini bukan penundaan penjagaan — pagar
Playwright di cabang ini penjaga KEDUA atas cacat yang sama, lewat endpoint
publik.

Dua jalan lain ditimbang dan ditolak, sebabnya dicatat supaya tak ditimbang
ulang dari nol. Memindahkan pagarnya ke `main` menuntut `e2e/support/api.js`
(279 baris) dan `support/global-setup.js` ikut pindah, sementara
`playwright.config.ts` di `main` menunjuk `e2e/global-setup.ts` yang lain dan
akun ujinya berbeda (`warga@example.go.id` di sini berbanding
`E2E_IDENTIFIER=seed-admin-kabupaten` di sana) — dan hasilnya hanya
menduakan sembilan uji e2e yang sudah menjaga BUG-013 di sana. Merge `main` ke
sini sekarang adalah penyelesaian sesungguhnya, tetapi ia membawa lima berkas
uji basi yang akan memerah dan 11 spec Playwright yang belum pernah dinilai;
itu pekerjaan tersendiri, bukan perkara pagar ini.

Ketika merge itu akhirnya terjadi, yang harus dilakukan **penghapusan enam
baris**: panggilan `test.fail(...)` di dalam uji kedua pada
`apps/web/e2e/statistik-sampah.spec.js`. **Specnya JANGAN dihapus** — sejak
saat itu ia menjadi pagar regresi sungguhan.

#### MERGE-NYA DIKERJAKAN pada hari yang sama, dan sebabnya bukan kerapian (19 Oktober 2026)

Tiga catatan di atas memperlakukan merge `main` ke cabang ini sebagai pilihan
yang dapat ditunda. Pilihan itu habis beberapa jam kemudian: **`apps/api` di
cabang ini ternyata sudah tidak dapat dijalankan sama sekali.**

Terukur saat pengguna mencoba menyalakan server dev. Lima puluhan galat
TypeScript, dan ketiga jenisnya satu akar yang sama — klien Prisma di
`node_modules` dibuat dari schema `main`, basis data `skm_db` juga sudah
bermigrasi mengikuti `main`, sementara sumber di sini masih schema sebulan lalu:

| Yang diperiksa | `tester` | `main` / `skm_db` |
| --- | --- | --- |
| enum `Role` di schema | kabupaten opd responden **superuser** | kabupaten opd responden |
| enum `user_role` di `skm_db` | — | kabupaten opd responden (superuser TAK ADA) |
| `statistics_insight` | ada di schema | TIDAK ADA di `skm_db` (`to_regclass` NULL) |
| `notifications.untuk_peran` | tak ada di schema | ADA dan NOT NULL |
| jumlah migrasi | 21 | 33 |

`prisma generate` diperiksa lebih dulu dan TIDAK menyelesaikannya: ia membuat
kodenya kompilasi lalu gagal saat dijalankan, sebab `Role.superuser` ditolak
Postgres, `statisticsInsight` memukul tabel yang tak ada, dan setiap
`notification.create` gagal pada kolom wajib yang kodenya tak pernah isi.
Menurunkan `skm_db` ke schema cabang ini DITOLAK: Prisma tak dapat bermigrasi ke
belakang, dan satu-satunya jalan ke sana `migrate reset`, yang membuang seluruh
isi basis data pengembangan termasuk 528 baris `audit_logs` — dan baris audit
tidak pernah boleh dihapus di repo ini.

**ENAM BENTURAN, dan semuanya selesai dengan mengambil versi `main`** — tetapi
bukan karena `main` otomatis menang, melainkan karena tiap sisi `main` terbukti
superset atau lebih dalam:

| Berkas | Alasan |
| --- | --- |
| `tsconfig.json`, `tsconfig.build.json` | versi `main` superset; perbaikan CAT-014 (`prisma/**/*`) tetap ada, ditambah `scripts` |
| `prisma/seed.ts` | `main` membuang blok `seed-superuser`, dan docblock-nya menjelaskan justru kegagalan ini: `Role.superuser` jadi `undefined` dan seed berhenti di akun kedua |
| `apps/web/jest.setup.js` | kedua sisi perbaikan `global.File` yang sama; komentar `main` bertanggal dan menyebut CAT-009/CAT-023 |
| `apps/web/playwright.config.ts` | `E2E_ORIGIN` dapat ditimpa; `globalSetup` menunjuk `e2e/global-setup.ts` |
| `admin-opd/complaints/page.test.jsx` | 13 uji / 317 baris berbanding 6 / 120 — persis resolusi yang sudah diramalkan revisi 4.9 |

`seed.ts` diselesaikan PER-HUNK, bukan `git checkout --theirs`, supaya bagian
yang sudah melebur otomatis tidak ikut terbuang.

**MERGE OTOMATIS MENANAM SATU CACAT SENYAP, dan ini temuan yang paling pantas
diingat dari seluruh operasi ini.** `apps/web/jest.config.js` berakhir dengan
`testPathIgnorePatterns` **terdeklarasi dua kali**; deklarasi kedua menimpa yang
pertama dan MEMBUANG `<rootDir>/.next/` dari daftar, sehingga Jest kembali
menyisir direktori build `next dev`. Kunci objek kembar di JavaScript bukan
galat — yang terakhir menang — dan tak satu alat pun memerah: berkasnya
JavaScript yang sah, eslint tak mempersoalkannya, dan `.prettierignore`
mengecualikan `apps/web`. Satu-satunya cara menemukannya membandingkan berkasnya
dengan versi `main`. `apps/web/.gitignore` kena hal serupa (satu blok Playwright
terduplikasi) dan dilebur dengan mempertahankan dua baris yang hanya ada di sini.

**HASILNYA:** `apps/api` kini BYTE-IDENTIK dengan `main`, dan `apps/web` berbeda
dari `main` hanya pada 16 berkas — enam spec e2e milik cabang ini, empat
penopangnya, `.gitignore`, dan lima berkas uji yang diperbaiki di bawah. Kelima
berkas sumber mati ikut terhapus. Kelima dokumen pengujian utuh; mereka disalin
ke luar repositori lebih dulu dan dicocokkan byte-per-byte sesudahnya.

**LIMA BERKAS UJI MERAH, dan "lima berkas basi" ternyata gambaran yang terlalu
kasar.** Tiga dari lima bukan perkara selektor:

| Berkas | Merah | Tindakan |
| --- | --- | --- |
| `SurveyResponses` | 1 / 10 | fikstur dapat `nomor`; nomor urut kini dari backend, bukan dari indeks baris |
| `RingkasanDashboard` | 1 / 14 | pernyataan DIPERSEMPIT ke kartu IKM lewat `within()`; `-` kedua milik kartu "Akun Aktif" |
| `AdminNavbarIdentitas` | 1 / 7 | uji DIPENSIUNKAN — menuntut label `Superuser` yang tak mungkin lagi dikirim backend |
| `NavigasiPeran` | 4 / 6 | **premisnya DIBALIK**, bukan dibuang |
| `UmpanBalikAksi` | 3 / 3 | DIPERBAIKI — helper jadi tiga langkah lewat `RowActionsMenu` |

`NavigasiPeran` yang paling perlu dijelaskan, sebab ia menjaga hal SEBALIKNYA
dari yang kini benar: bahwa **Manajemen User** dan **Audit Logs** hanya milik
superuser dan harus disembunyikan dari Admin Kabupaten. `proxy.js` baris 40-43
menyatakan `SUPERUSER_ONLY_PREFIXES` dibuang bersama perannya, dan
`AdminKabSidebar` kini merender kedua menu itu tanpa syarat peran. Membuang
berkas itu diperiksa lebih dulu dan ditolak: ia SATU-SATUNYA uji yang menyentuh
kedua menu tersebut di navigasi, jadi membuangnya meninggalkan celah tanpa
penjaga. Arah pernyataannya dibalik, dan dua uji lama pensiun seutuhnya karena
keduanya menjaga kebocoran menu yang DIGERBANGI PERAN — tak ada lagi menu
semacam itu, jadi uji yang menjaga ketiadaan akan hijau selamanya tanpa pernah
memeriksa apa pun.

Kedua uji baru itu dibuktikan dapat memerah lewat dua mutasi pada
`AdminKabSidebar.jsx` yang dipulihkan di blok `finally`: menyesatkan `href`
Manajemen User membunuh uji rute, dan menghapus labelnya membunuh keduanya.

**Satu pergeseran lain tersingkap, dan ia tersembunyi justru oleh kegagalan yang
lain.** Daftar `MENU_UMUM` basi dalam tiga hal sekaligus: `Manajemen OPD` sudah
berganti nama menjadi `Daftar OPD`, lalu `Statistik & Laporan` dan
`Dokumentasi API` lahir sesudahnya. Selama uji itu memerah karena sebab
superuser, tak ada yang pernah sampai ke pernyataan berikutnya — **satu
kegagalan menutupi kegagalan sesudahnya.**

Sesudah kelimanya dibereskan: **216 suite / 1.770 uji hijau pada dua jalan penuh
berurutan**, eslint kode=0. Jumlah uji turun dari 1.774 dan itu diharapkan —
satu uji dipensiunkan dan blok lima uji menjadi dua.

#### JALAN PERTAMA AKHIRNYA TUNTAS, dan hitungan spec-nya dikoreksi (20 Oktober 2026)

Judul bagian 19 Oktober di atas berbunyi "Jalan pertama diambil, **sebagian**",
dan kata terakhirnya kini tidak lagi berlaku. Kelima berkas yang 19 Oktober
"tetap tinggal karena basi" sudah tidak basi — semuanya diperbaiki di cabang
ini sesudah `main` ditarik, jadi perbaikannya memang sudah teruji terhadap kode
yang ada di sana. Kelimanya pindah ke `main` pada 20 Oktober (`ad9e0e9`, merge
`ce9ffaf`): `SurveyResponses` 10 uji, `RingkasanDashboard` 14,
`AdminNavbarIdentitas` 6, `NavigasiPeran` 3, `UmpanBalikAksi` 3.

Dengan itu ketiga belas berkas uji milik cabang ini terhitung seluruhnya:
delapan pindah 19 Oktober, lima menyusul 20 Oktober, **nol tertinggal**.
Verifikasi di `main` sesudah merge: 84 suite / 1.359 uji api, 216 suite /
1.770 uji web, eslint kode=0; e2e `apps/api` dan Playwright DILEWATI, bukan
lulus. Angka web-nya cocok persis dengan bacaan di cabang ini, dan itu memang
yang diharapkan — `apps/web/src` kedua cabang identik untuk kelima berkas itu.

Disalin dengan `git checkout tester -- <jalur>`, **bukan dengan skrip**, dan itu
bukan pilihan gaya: skrip penyalin pada `1bd55ec` yang melahirkan cacat mojibake
di bagian 19 Oktober di atas. Dibuktikan, bukan dipercaya — `git hash-object`
kelima berkas sama dengan `git rev-parse tester:<jalur>`.

**DUA ANGKA PADA TABEL DI ATAS DIKOREKSI.** Baris "Spec Playwright beserta
penopangnya" mencatat **11** berkas, dan catatan-catatan 19 Oktober menyebut
"11 spec Playwright belum dinilai" serta "tujuh spec `.js` milik penguji
berdampingan dengan 15 spec `.ts` tim dev". Dihitung ulang dari git pada
20 Oktober, yang benar: **6 spec `.js`** milik penguji dan **14 spec `.ts`**
milik tim dev. Angka 11 itu benar sebagai jumlah BERKAS — enam spec ditambah
lima penopang di `e2e/support/` — tetapi dipakai sebagai jumlah SPEC di tiga
tempat, dan di sana ia salah. Satu dari enam spec itu
(`statistik-sampah.spec.js`) kini sudah dinilai; lima sisanya belum.

`.gitignore` `apps/web` di `main` juga disamakan dengan cabang ini pada hari
yang sama (`7a7cd04`, merge `b570baf`): `/blob-report/` dan
`/playwright/.cache/` tertinggal saat merge 19 Oktober melebur kedua sisi berkas
itu, sehingga benturan yang sama akan muncul lagi pada tarikan berikutnya. Nol
berkas terlacak di bawah kedua jalur itu, jadi ini pencegahan, bukan
pembersihan.
#### KEENAM SPEC PLAYWRIGHT AKHIRNYA DINILAI (20 Oktober 2026)

Baris "Spec Playwright beserta penopangnya" pada tabel di atas berbunyi BELUM
dinilai sejak 15 Oktober. Keenamnya dijalankan hari ini, satu berkas satu jalan
sebagaimana aturan di `CLAUDE.md`, dan data ujinya dibersihkan sesudah tiap
jalan.

| Spec | Uji | Hasil |
| --- | --- | --- |
| `ajukan-pengaduan.spec.js` | 3 | **3 lulus**, 45,5 detik |
| `sso-galat.spec.js` | 2 | **2 lulus**, 1,6 detik |
| `statistik-sampah.spec.js` | 2 | **2 lulus** sesudah diperbaiki hari ini, 2,1 menit |
| `proteksi-route.spec.js` | 4 | **4 lulus, tetapi GOYAH** — dua di antaranya habis tenggat 150 detik lalu lulus pada percobaan ulang dalam 28,6 dan 21,3 detik |
| `isi-survei.spec.js` | 2 | **1 gagal, 1 tak jalan** — `E2E_SURVEY_ID belum disetel` |
| `notifikasi-siklus.spec.js` | 4 | **1 gagal, 1 tak jalan, 2 lulus** — `POST /surveys — HTTP 400` |

**Tiga sehat, satu goyah, dua basi.** Yang basi bukan dua perkara berbeda
melainkan satu akar yang sama dengan `statistik-sampah` tadi: keduanya ditulis
terhadap keadaan sebelum merge `fbdf85c`.

`notifikasi-siklus` gagal pada uji KENDALI BUG-014 dengan
`POST /surveys — HTTP 400`, yakni kontrak survei yang sama (medan `jenis`
wajib). Pagar BUG-014-nya karena itu TIDAK JALAN sama sekali — keduanya
berurutan — sehingga BUG-014 tetap tak terukur lewat Playwright. Pasangan
BUG-018 di berkas yang sama baik-baik saja: kendalinya lulus dan pagarnya
memerah sebagaimana mestinya, artinya BUG-018 MASIH TERBUKA dan anotasinya
masih benar.

`isi-survei` gagal dengan `E2E_SURVEY_ID belum disetel`, dan ini **ramalan yang
menjadi pengamatan**: catatan 19 Oktober menulisnya tersurat sebagai dugaan
berdasar kode, sebab `playwright.config.ts` yang terpakai adalah versi `main`
dan `globalSetup`-nya menunjuk `e2e/global-setup.ts`, bukan
`e2e/support/global-setup.js` yang menyiapkan survei tetap itu. Satu hal
tambahan yang hanya terlihat dengan menjalankannya: **pesan galatnya sendiri
kini menyesatkan.** Ia menganjurkan "jalankan lewat `pnpm test:e2e`", padahal
skrip itu berisi `playwright test` apa adanya dan memakai config yang sama,
jadi anjuran itu tak lagi menolong siapa pun.

`proteksi-route` lulus keempat ujinya tetapi GOYAH, dan angka tenggatnya perlu
disebut supaya tak salah dibaca: 150 detik itu milik berkasnya sendiri
(`proteksi-route.spec.js:109`, `test.describe.configure({ timeout: 150_000 })`),
bukan dari `playwright.config.ts` — config itu tak menyetel tenggat uji sama
sekali. Dua uji habis tenggat pada `locator.fill`, lalu lulus pada percobaan
ulang dalam 28,6 dan 21,3 detik. Pola yang sama dengan §Y.3.1 di
`TEST_CASES.md`: kegoyahan, bukan kegagalan.

Hitungan ujinya ikut dikoreksi: **17 uji di 6 spec**, bukan 19 di 7 seperti yang
tercatat sejak v3.1 `TEST_CASES.md`.

Data uji sesudah seluruh jalan: 3 pengaduan dan 5 notifikasi berpenanda `[UJI `
terhapus, nol survei dan nol respons tertinggal. `audit_logs` TIDAK disentuh.

#### Kedua spec basi dibereskan, dan pemanasan rute dipulihkan (20 Oktober 2026)

Tabel pada bagian tepat di atas dibiarkan apa adanya — ia bacaan yang benar pada
saat diukur. Dua spec yang di sana berstatus basi diperbaiki beberapa jam
kemudian (`d88abb7`), dan pemanasan rute yang ikut mati pada merge dipulihkan
(`6af266d`). Rinciannya di [TEST_CASES.md §Y.8.5](TEST_CASES.md), dan yang
pantas berdiri di sini hanya ringkasnya.

| Spec | Hasil sesudah perbaikan |
| --- | --- |
| `notifikasi-siklus.spec.js` | **4 lulus**, 4,1 detik — dua di antaranya pagar `test.fail()` yang memerah sebagaimana mestinya |
| `isi-survei.spec.js` | **2 lulus**, 29,9 detik |
| `proteksi-route.spec.js` | **4 lulus**, 1,9 menit |
| `ajukan-pengaduan.spec.js` | **1 goyah + 2 lulus**, 1,3 menit |
| `sso-galat.spec.js` | 2 lulus — tak disentuh |
| `statistik-sampah.spec.js` | 2 lulus — tak disentuh |

Keenam spec penguji kini hijau, satu di antaranya goyah. Dua akibat yang
berarti bagi dokumen ini: **pagar BUG-014 akhirnya benar-benar jalan** — pagi
ini ia "did not run" karena uji kendalinya gagal lebih dulu — dan BUG-014
maupun BUG-018 terbukti masih terbuka lewat pagarnya sendiri, bukan lewat
pembacaan kode.

Yang tidak diakui terverifikasi: pemulihan pemanasan rute itu sendiri. Rute
sudah panas di server dev yang hidup, jadi angka di atas hanya membuktikan
kodenya tak merusak apa pun. Dan satu kegoyahan baru pada `ajukan-pengaduan`
(balapan dropdown, bukan kompilasi rute) BELUM diperbaiki.

---

<a id="bug-022"></a>

### BUG-022 — Pilihan jawaban survei tak dapat dicapai papan ketik maupun pembaca layar

|                       |                                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| **Charter**           | — (ditemukan saat menjalankan alur pengisian anonim di peramban)          |
| **Tanggal**           | 22 Oktober 2026                                                           |
| **Peran**             | Responden, dan siapa pun yang mengisi survei tanpa akun                   |
| **Halaman**           | `/survei/:id` (dan `/isi/:id` yang mengalihkannya)                        |
| **Severity**          | **High**                                                                  |
| **Kasus uji terkait** | TC-FE-003 (pengisian survei), bersinggungan dengan TC-FE-016              |

**Gejalanya satu kalimat: survei ini tidak dapat diisi tanpa tetikus.**

`RadioCard.jsx:21` merender `<input type="radio" className="hidden peer">`.
`hidden` adalah `display: none`, dan elemen ber-`display: none` dibuang dari
pohon aksesibilitas SEKALIGUS dari urutan Tab. Yang terlihat di layar hanyalah
`<div>` pembungkusnya, yang tak punya peran, tak punya nama, dan tak dapat
difokus.

**Langkah reproduksi**

1. Buka `/survei/:id` sebuah survei SKM aktif, lewati gerbang persetujuan.
2. Letakkan tetikus, lalu tekan Tab berulang kali.
3. Coba pilih salah satu dari empat skala.

**Hasil sebenarnya.** Fokus melompati keempat pilihan dan mendarat di tombol
"Pertanyaan Selanjutnya" yang mati. Tak ada jalan maju sama sekali.

**Terukur, bukan disimpulkan.** Pada halaman yang jelas menampilkan empat
pilihan skala, `getByRole('radio')` mengembalikan **nol**. Sesudah diperbaiki,
angka yang sama menjadi **4**, dengan `display: block` dan kotak `1x1`.

**Kenapa ini High, bukan Medium.** Sembilan unsur SKM wajib menurut
PermenPANRB 14/2017; tanpa jawaban, surveinya tak dapat dikirim sama sekali.
Jadi bagi pemakai papan ketik dan pembaca layar ini bukan ketidaknyamanan,
melainkan jalur yang tertutup rapat — dan jalur itu justru jalur publik yang
ditujukan kepada seluruh warga.

**Kenapa tak pernah tertangkap Jest.** jsdom tidak memuat Tailwind sama
sekali, sehingga di sana `hidden` hanyalah kelas tanpa akibat: radionya tetap
terbaca `getByRole` dan ujinya HIJAU justru pada keadaan yang rusak. Hanya
peramban sungguhan yang menghitung `display: none`. Pagarnya karena itu uji
Playwright yang menekan Tab sungguhan, dan dibuktikan merah lebih dulu dengan
`element(s) not found`.

**Perbaikan.** `sr-only peer` menggantikan `hidden peer` — penyamaran visual
yang sama (1x1 piksel, terpotong) tetapi radionya tetap terfokus dan tetap
terbaca. `peer-checked:` tak terpengaruh sebab pemilih itu bekerja atas
keadaan input, bukan atas cara ia disembunyikan. Ditambah cincin
`peer-focus-visible:`; tanpa itu cacatnya hanya ditukar — terjangkau papan
ketik, tetapi pemakainya tak dapat melihat di mana dirinya berada.

**Ditutup** — `78cb40f`, merge `88137d8` di `main`. Pagar:
`apps/web/e2e/isi-survei-anonim.spec.ts`, uji "kuesioner dapat dijawab dengan
papan ketik saja".

---

<a id="bug-023"></a>

### BUG-023 — Dua spec responsif menunjuk nomor tiket yang sudah tiada

|                       |                                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| **Charter**           | —                                                                         |
| **Tanggal**           | 22 Oktober 2026                                                           |
| **Berkas**            | `apps/web/e2e/percakapan-pengaduan-responsif.spec.ts:36`, `apps/web/e2e/urutan-detail-pengaduan.spec.ts:24` |
| **Severity**          | Medium                                                                    |
| **Jenis**             | Cacat perkakas uji, bukan cacat produk                                    |

Kedua spec memegang nomor tiket tetap — `PGD20260916GZQI` dan
`PGD20260916CGAO` — dan **keduanya tidak ada di basis data mana pun lagi**.
Basis data pengembangan hanya memuat empat pengaduan: `PGD20260811KT4E`,
`PGD20261008JD44`, `PGD202610098V5I`, `PGD20261013IJVU`.

**Akibatnya enam uji memerah atas sebab yang bukan tata letak**, dan yang
paling merugikan: **kedua uji KONTROL ikut memerah**. Kontrol itu dipasang
justru untuk membedakan "tata letaknya rusak" dari "halamannya tak ada".
Ketika kontrolnya ikut mati, tak ada lagi yang dapat memberi tahu mana yang
sedang terjadi, dan pembaca laporannya akan menyangka ada enam kerusakan
responsif.

Peringatan tentang angka tetap sudah tertulis di `e2e/fixtures/responsif.ts`
sejak lama, lengkap dengan alasannya ("spec yang memakai angka tetap akan
gagal di komputer orang lain karena datanya tak ada"). Kedua berkas itu saja
yang belum mengikutinya.

**Perbaikan.** Keduanya mengambil tiket lewat `ambilContoh()` saat uji
berjalan. `ambilContoh` sekaligus diubah MENGUTAMAKAN pengaduan yang sudah
berbalasan: dua dari empat pengaduan tak punya balasan satu pun, dan panel
percakapan yang kosong membuat `riwayat < 200` memerah tanpa ada yang salah.

**Ditutup** — `0d601ef`, merge `59cc729` di `main`. Sesudahnya keempat spec
terdampak 74 lulus / 0 gagal.

---

<a id="bug-024"></a>

### BUG-024 — Detektor luberan menuduh teks yang sengaja dipotong elipsis

|                       |                                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| **Charter**           | —                                                                         |
| **Tanggal**           | 22 Oktober 2026 (hidup sejak 7 Oktober 2026)                              |
| **Berkas**            | `apps/web/e2e/fixtures/responsif.ts`, fungsi `UKUR`                       |
| **Severity**          | Medium                                                                    |
| **Jenis**             | Cacat perkakas uji, bukan cacat produk                                    |

`getBoundingClientRect` mengembalikan kotak tata letak yang UTUH: ia tidak
dipangkas oleh `overflow: hidden` leluhurnya. Sebuah `span` sebaris di dalam
paragraf ber-`truncate` karena itu terbaca menjorok keluar layar, padahal yang
terlihat mata hanyalah titik-titik di tepi paragrafnya.

**Terukur di `RecentActivities.jsx:73`.** Paragraf berkotak `165x20` memuat isi
`236x20`, `span`-nya berakhir di `x=342` pada layar 320px — sementara
`document.scrollWidth` tetap **320**. Halamannya tidak meluber satu piksel pun.

**Tiga uji "Tata letak di 320px" memerah karenanya selama dua minggu**, dan
semuanya melaporkan pelanggar yang sama: laci navigasi, panel notifikasi, dan
menu akun ketiganya bersih (`luber: 0`), yang keluar adalah halaman di
belakangnya.

**Akibat yang paling merugikan bukan merahnya.** Pada sesi sebelumnya penguji
mencatat "luberan tata letak 320px" sebagai utang PRODUK, atas dasar nama uji
yang gagal dan bukan atas dasar apa yang dilaporkan asersinya. Catatan itu
salah dan sempat mengarahkan pilihan pekerjaan berikutnya.

**Perbaikan.** `dipotongDenganElipsis()` melewati elemen yang dipotong leluhur
ber-`text-overflow: ellipsis`. HANYA elipsis yang dimaafkan: `overflow: hidden`
polos tetap dilaporkan, sebab potongan tanpa tanda membuat isinya hilang tanpa
pembacanya tahu — dan itulah yang hendak ditangkap detektor ini sejak awal.
Saringan yang sama sudah lama ada di `UKUR_TEKS_TERPOTONG`; ia cuma tak pernah
ikut dibawa ke atas.

**Ditutup** — `0d601ef`, merge `59cc729`. Pagar:
`apps/web/e2e/pagar-detektor-responsif.spec.ts`, dengan dua uji KENDALI yang
membuktikan detektornya masih menangkap potongan tanpa elipsis dan elemen yang
sungguh keluar layar.

---

<a id="bug-025"></a>

### BUG-025 — Detektor teks terpotong menuduh label `sr-only`

|                       |                                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| **Charter**           | —                                                                         |
| **Tanggal**           | 22 Oktober 2026 (hidup sejak 7 Oktober 2026)                              |
| **Berkas**            | `apps/web/e2e/fixtures/responsif.ts`, fungsi `UKUR_TEKS_TERPOTONG`        |
| **Severity**          | Low                                                                       |
| **Jenis**             | Cacat perkakas uji, bukan cacat produk                                    |

Utilitas `sr-only` Tailwind berukuran satu kali satu piksel dengan
`overflow: hidden` ATAS KEMAUAN SENDIRI: ia memang menyimpan teks jauh lebih
besar daripada kotaknya, sebab tujuannya dibacakan pembaca layar dan bukan
dilihat mata. Detektor ini melaporkannya sebagai teks yang terpotong.

**Terukur.** Pelanggarnya `label.sr-only`, kotak `1x1`, isi `46x20` dan `60x18`.
Empat uji "tak ada teks yang terpotong" memerah karenanya.

Menghukum `sr-only` berarti menghukum justru markah yang memberi NAMA kepada
kontrol yang labelnya disembunyikan — markah yang ada karena aksesibilitas,
dinilai sebagai cacat.

**Perbaikan.** Elemen berkotak satu piksel atau kurang di salah satu sisi
dilewati. Kendalinya membuktikan teks yang terpotong di kotak berukuran WAJAR
tetap dilaporkan.

**Ditutup** — `0d601ef`, merge `59cc729`.

---

<a id="bug-026"></a>

### BUG-026 — `isi-survei-anonim` menyimpan empat harapan basi dan selalu melewati dirinya

|                       |                                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| **Charter**           | —                                                                         |
| **Tanggal**           | 22 Oktober 2026                                                           |
| **Berkas**            | `apps/web/e2e/isi-survei-anonim.spec.ts`                                  |
| **Severity**          | Medium                                                                    |
| **Jenis**             | Cacat perkakas uji, bukan cacat produk                                    |

Berkas ini menuntut `E2E_SURVEY_ANONIM_ID` diisi dengan tangan. Karena hampir
tak pernah diisi, **ia melewati dirinya pada setiap jalan — termasuk pada
setiap jalan yang dilaporkan hijau.** Di balik lewatan itu menumpuk empat
harapan yang sudah tidak benar, dan tak satu pun pernah terbantah:

1. Ia menuntut URL TETAP di `/isi/:id`. Rute itu dialihkan permanen (308) ke
   `/survei/:id` sejak **8 September 2026** demi QR yang sudah tercetak;
   alasannya tertulis lengkap di `src/app/isi/[id]/page.jsx`. Harapan itu benar
   sebelum 8 September dan salah sejak saat itu — enam minggu.
2. Ia tak pernah melewati **gerbang persetujuan PDP** yang kini berdiri di
   depan kuesioner, sebab gerbang itu lahir sesudah uji ini ditulis.
3. Ia memilih pilihan skala lewat `getByRole('radio')`, yang mengembalikan nol
   karena BUG-022.
4. Ia menunggu tombol "Kirim" di layar pertanyaan terakhir, padahal di sana
   tombolnya bernama **"Selesaikan"** dan "Kirim Survei" baru muncul di dalam
   modal captcha.

**Perbaikan.** Pintu masuknya DIPERTAHANKAN di `/isi/:id` — justru pengalihan
itulah yang menjaga QR cetak tetap berguna — dan yang diasersi kini
pendaratannya. Gerbang PDP dilewati tersurat. Surveinya disiapkan sendiri
dengan penanda `[UJI `, bukan menuntut env diisi tangan dan bukan memakai
survei seed yang kebetulan anonim: respons yang masuk ke survei sungguhan tak
berpenanda, sehingga pembersih tak dapat mengambilnya kembali dan angka IKM
survei itu bergeser permanen.

**Pengirimannya BERCABANG, dan itu disengaja.** Di mesin pengembangan Turnstile
tak menerbitkan token sama sekali — nol iframe Cloudflare — karena kunci situs
yang terpasang terikat daftar domain yang tidak memuat `skema.local`. Menuntut
`201` di sana menghasilkan MERAH PALSU atas keadaan yang justru ditangani
produk dengan benar; memakluminya dengan `test.skip` menghasilkan HIJAU PALSU.
Keduanya ditolak: bila token terbit, kirim dan tuntut 201; bila tidak, tuntut
penanganan BUG-016 secara utuh — peringatannya, tombol muat ulangnya, dan
tombol kirim yang TETAP terkunci.

**Ditutup** — `78cb40f` dan `75f3f0b`, merge `88137d8`.

---

<a id="bug-027"></a>

### BUG-027 — Uji KENDALI pengisian anonim lulus tanpa pernah mengisi apa pun

|                       |                                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| **Charter**           | —                                                                         |
| **Tanggal**           | 22 Oktober 2026                                                           |
| **Berkas**            | `apps/web/e2e/isi-survei-anonim.spec.ts`, uji "KONTROL: peramban baru"    |
| **Severity**          | Medium                                                                    |
| **Jenis**             | Cacat perkakas uji, bukan cacat produk                                    |

Seluruh isi uji kendali itu adalah satu asersi **ketiadaan**: kalimat "Anda
Sudah Mengisi Survei Ini" tidak ada di halaman. Ketiadaan sebuah kalimat juga
sifat halaman galat, halaman kosong, dan halaman hasil pengalihan yang salah.
Jadi ia lulus tanpa pernah mengisi apa pun.

**Terukur, dan inilah buktinya yang paling telak:** pada jalan pertama yang
benar-benar menjalankannya, ia HIJAU sementara surveinya mencatat **nol
respons**. Uji yang bertugas membuktikan "peramban baru masih dapat mengisi"
tidak pernah mengisi.

Ini kelas kegagalan yang sama yang diperingatkan `e2e/global-setup.ts` dengan
kalimatnya sendiri: *"Kegagalan yang berbunyi seperti keberhasilan jauh lebih
berbahaya daripada kegagalan yang berisik."*

**Perbaikan.** Kendalinya kini harus membuktikan hal yang POSITIF: mengisi
sampai jawabannya tersimpan. Yang ditunggu respons `201` dari server, bukan
layar ucapan terima kasih — layar itu dapat muncul dari keadaan klien mana pun,
sedangkan 201 hanya terbit kalau barisnya sungguh masuk basis data.

**Ditutup** — `78cb40f`, merge `88137d8`.

---

### BUG-028 — Penolakan unggahan dijawab 500, bukan 400 — galat klien menyamar sebagai kerusakan server

|              |                                                        |
| ------------ | ------------------------------------------------------ |
| **Charter**  | —                                                      |
| **Tanggal**  | 22 Oktober 2026                                        |
| **Berkas**   | `apps/api/src/common/filters/all-exceptions.filter.ts` |
| **Severity** | Medium                                                 |
| **Jenis**    | Cacat produk (respons API)                             |

Berkas yang dikirim pada nama medan selain `lampiran` dijawab:

```
status=500  {"message":"Unexpected file field","error":{"code":"INTERNAL_SERVER_ERROR"}}
```

Permintaan kendali yang sama persis, hanya dengan medan `lampiran` yang benar,
dijawab `201`. Jadi yang membedakan memang nama medannya, bukan bentuk
permintaannya.

Ini galat **klien** yang disajikan sebagai galat **server**. Akibatnya dua, dan
keduanya menimpa orang yang tidak membuat kesalahannya: pemantauan melaporkan
kerusakan server padahal servernya sehat, dan siapa pun yang menyisir log
mencari sebab yang tak pernah ada. Frontend sendiri tak pernah memicunya —
`FileDropzone.jsx` selalu memakai nama medan yang benar — jadi yang memicunya
integrasi pihak lain atau klien lama.

**Akar masalahnya, dan ia mengoreksi laporan saya sendiri.** Temuan ini
mula-mula saya catat sebagai SATU kasus. Pengukuran menunjukkan cacatnya lebih
luas: `transformException` milik `@nestjs/platform-express@11.1.28` mencocokkan
galat multer pada `error.message`, memakai tabel kalimat yang disalin dari
multer 1.x. Yang terpasang di sini multer 2.4.0, dan versi itu mengganti satu
kalimat serta menambah empat kode. **Lima** kode karena itu luput dari `switch`
tersebut, lewat apa adanya sebagai `Error` biasa, lalu jatuh ke cadangan 500:

| kode multer               | kalimat multer 2.4.0               | tabel Nest         |
| ------------------------- | ---------------------------------- | ------------------ |
| `LIMIT_UNEXPECTED_FILE`   | `Unexpected file field`            | `Unexpected field` |
| `LIMIT_FIELD_NESTING`     | `Field name nesting too deep`      | tidak ada          |
| `LIMIT_FIELD_ARRAY_INDEX` | `Field name array index too large` | tidak ada          |
| `STREAM_DESTROYED`        | `File stream was destroyed`        | tidak ada          |
| `INVALID_FIELD_NAME`      | `Invalid field name`               | tidak ada          |

Yang paling merugikan diam-diam justru bukan kasus yang ditemukan lebih dulu,
melainkan `STREAM_DESTROYED`: pengunggahan yang terputus — warga di jaringan
ponsel yang goyah — tercatat sebagai kerusakan server.

**Perbaikan.** Pemetaannya dikunci pada `error.code`, bukan pada kalimatnya.
Itu bukan selera: docblock multer sendiri memerintahkannya (_"Check `err.code`
rather than the message"_), dan pelanggaran perintah itulah yang melahirkan
cacat ini. Tabel baru di `multer-galat.util.ts` memuat seluruh dua belas kode,
termasuk delapan yang hari ini sudah dipetakan Nest dan karena itu tak pernah
sampai ke filter. Justru itu gunanya: bila multer kelak mengganti kalimat lain,
kodenya jatuh ke jalur mentah ini dan tetap dijawab 4xx.

`LIMIT_FILE_SIZE` tetap `413`, bukan `400`, dan itu diuji tersurat. Jalur lama
untuk galat itu TIDAK dilebur ke jalur baru walau menggoda: begitu Nest
membungkusnya menjadi `PayloadTooLargeException`, `MulterError` aslinya hilang,
sehingga pemetaan berbasis kode tak dapat menjangkaunya.

**Catatan yang tidak enak tentang pembuktiannya.** Merahnya dibuktikan tiga
kali, dan dua di antaranya merah karena sebab yang SALAH sehingga harus
diperbaiki lebih dulu — keduanya `Tests: 0 total`, yaitu galat kompilasi, bukan
uji yang memerah. Sebabnya pun bagian dari temuan ini: `@types/multer@2.2.0`
ketinggalan dari runtime-nya, union `ErrorCode` di sana belum memuat empat kode
baru multer 2.4.0. Jalan ketiga merah dengan alasan yang benar, lewat HTTP
sungguhan: `Expected: 400, Received: 500`.

**Ditutup** — bersama perbaikannya pada hari yang sama.

---

### BUG-029 — Layar gagal masuk SSO membocorkan URL internal dan nama kunci konfigurasi

|              |                                                     |
| ------------ | --------------------------------------------------- |
| **Charter**  | —                                                   |
| **Tanggal**  | 22 Oktober 2026                                     |
| **Berkas**   | `apps/api/src/modules/auth/auth.controller.ts`      |
| **Severity** | Medium                                              |
| **Jenis**    | Cacat produk (kebocoran detail internal)            |

Ditemukan selagi [BUG-019](#bug-019) dibaca, lalu diperbaiki dalam commit yang
sama atas persetujuan tersurat pengguna.

Dua blok `catch` di `auth.controller.ts` meneruskan `err.message` ke fragment
`#error=` yang sama dengan BUG-019. Yang sampai ke layar warga:

| Sumber                       | Kalimat yang dibaca warga                                             |
| ---------------------------- | --------------------------------------------------------------------- |
| `helpdesk-sso.client.ts:175` | `Tidak dapat menghubungi Helpdesk (https://api.madiunkab.go.id/api/oauth/token): TypeError: fetch failed` |
| `helpdesk-sso.client.ts:186` | `Helpdesk membalas 403 dengan tipe "text/html", bukan JSON`           |
| `helpdesk-sso.client.ts:95`  | `Helpdesk tidak mengembalikan access_token: invalid_client`           |
| `helpdesk-sso.client.ts:200` | `Konfigurasi SSO "helpdesk.ssoClientSecret" belum diisi`              |
| `sso.service.ts:789`         | `SSO Helpdesk belum dikonfigurasi. Kunci yang masih kosong: ...`      |

Yang pertama memuat URL internal berikut pesan pustaka; dua yang terakhir
membocorkan nama kunci konfigurasi.

**Rancangan pertama saya untuk ini SALAH dan dibatalkan sebelum ditulis ke
commit.** Saya menduga kebocorannya datang sebagai `Error` biasa, sehingga cukup
melewatkan pesan `HttpException` saja. Kode membantahnya: `helpdesk-sso.client.ts`
membungkus SETIAP kegagalan jaringan menjadi `ServiceUnavailableException`, yang
juga `HttpException`. Aturan itu justru akan melewatkan kalimat yang bocor dan
hanya menutup kasus yang tak pernah terjadi di produksi. Fungsi beserta ujinya
sudah sempat ditulis dan hijau, lalu dihapus.

**Perbaikan.** Batasnya STATUS, bukan jenis galat. Di bawah 500 adalah kalimat
yang kita sendiri tulis untuk warga (`Akun tidak aktif`) dan tetap lewat; 5xx
diganti kalimat umum, sebab ia berarti pihak kita atau Helpdesk yang bermasalah
dan penjelasannya milik log. `logger.error` tetap mencatat pesan aslinya utuh.

**Satu uji yang BUKAN basi ikut diganti kontraknya, dan alasan lamanya dicatat
di tempatnya.** `sso-unconfigured.e2e-spec.ts:65` menuntut `toMatch(/ssoClientId/)`
dengan alasan yang sah dari tanggal lain: "pesannya harus benar-benar memberi
tahu apa yang kurang — bukan sekadar gagal". Yang menjatuhkannya: layar itu
bukan layar pengembang, melainkan layar masuk warga. Kebutuhan pengembang tidak
dibuang, hanya dipindahkan ke log.

**Dua uji lain memalsukan jenis galat.** Keduanya melempar `new Error(...)` di
tempat produksinya melempar `ServiceUnavailableException` dan `ForbiddenException`,
dan keduanya hijau hanya karena perilaku lama meneruskan apa saja — jadi keduanya
menguji keadaan yang tak pernah terjadi. Tiruannya dibetulkan.

**Yang belum dikerjakan, dan masih terbuka:** memagari pesan 5xx dengan
`app.nodeEnv === 'production'` seperti `boleh-admin-opd.ts`, sehingga pengembang
tetap melihat kunci yang kosong di peramban sementara warga tidak. Itu
menghormati kedua niat sekaligus; yang diambil malam ini pilihan yang lebih
sederhana.

**Ditutup** — `3fb335f`, merge `e3ce3f8` di `main`.

---

### BUG-030 — Sapuan proteksi route membaca 502 sebagai keputusan proxy

|              |                                      |
| ------------ | ------------------------------------ |
| **Charter**  | —                                    |
| **Tanggal**  | 22 Oktober 2026                      |
| **Berkas**   | `apps/web/e2e/proteksi-route.spec.js` |
| **Severity** | Medium                               |
| **Jenis**    | Cacat perkakas uji, bukan cacat produk |

`sapuMatriks` menyimpulkan keputusan `proxy.js` **dari alamat akhir** sebuah
navigasi, dan tidak pernah memeriksa status responsnya. Halaman galat server
tinggal di alamatnya sendiri, jadi 502 tak terbedakan dari "rute yang tidak
dipantulkan".

**Terukur dua arah, dan arah keduanya yang lebih berbahaya.**

Arah pertama, merah palsu: pada jalan 22 Oktober 2026 uji `responden` melaporkan
`/admin-kab/dashboard`, `/admin-opd/dashboard`, dan `/admin-opd/complaints`
terbuka bagi responden. Dibaca apa adanya itu lubang kontrol akses tingkat
Critical. Cuplikan halaman yang Playwright simpan membantahnya:

```yaml
- heading "502 Bad Gateway" [level=1]
- generic: nginx/1.29.8
```

`apps/api` sedang memuat ulang di tengah jalan. Penegakan sesungguhnya tetap
hijau di tingkat API pada jalan yang sama — `peran-matriks-rbac.e2e-spec.ts`
11 uji lulus.

Arah kedua, **hijau palsu**, dan inilah yang menuntut pagar: bila rute yang
dijawab 502 kebetulan SAMA dengan alamat yang diharapkan, matriksnya cocok dan
sapuan ini lulus sambil tak memeriksa apa pun. Baris `/` pada kolom `tanpaToken`
tepat begitu. Pagar barunya memalsukan 502 pada `/` saja dan menuntut sapuan itu
menolak; sebelum perbaikan ia dijawab `Received promise resolved instead of
rejected` — lulus, atas halaman galat.

**Perbaikan.** `page.goto` mengembalikan responsnya, jadi statusnya dibaca; rute
ber-status ≥ 500 dikumpulkan dan diasersikan kosong **sebelum** matriksnya
dinilai — sealasan dengan pengintai 429 yang sudah ada di berkas yang sama,
sebab hasil matriks tak bermakna bila servernya sendiri tak menjawab.

**Perbaikan itu membuktikan dirinya pada pemakaian sungguhan, bukan hanya di
pagar.** Pada jalan berikutnya dua uji goyah berbunyi
`/admin-opd/dashboard → HTTP 502` dan `/admin-opd/complaints → HTTP 502`,
menunjuk `health` alih-alih menuduh RBAC jebol.

**Satu akibat samping yang jujur dicatat:** ketika pagar ini berada di AWAL
berkas, dua percobaan uji `responden` sesudahnya kehabisan 150 detik di
`masukSebagai` — bukan di matriksnya — sementara uji yang sama lulus 30,8 detik
bila dijalankan sendiri. Delapan navigasi tambahan milik pagar diduga menghabiskan
anggaran batas laju 100 permintaan/60 detik, tetapi **dugaan itu tidak terbukti**:
artefak `test-results` sudah terhapus oleh jalan berikutnya sebelum sempat dibaca.
Pagarnya dipindah ke akhir berkas, dan alasannya ditulis di tempatnya.

**Ditutup** — bersama perbaikannya pada hari yang sama.

---

<a id="bug-035"></a>

### BUG-035 — Lima uji E2E mencari tombol yang sudah pindah ke menu aksi

|              |                                                                    |
| ------------ | ------------------------------------------------------------------ |
| **Charter**  | —                                                                  |
| **Tanggal**  | 26 Oktober 2026                                                    |
| **Berkas**   | `apps/web/e2e/poster-qr-survei.spec.ts`, `apps/web/e2e/responsif-komponen.spec.ts` |
| **Severity** | Medium (usulan penguji)                                            |
| **Jenis**    | Cacat perkakas uji, bukan cacat produk                             |

**Ditemukan lewat sapuan Playwright penuh**, yang pertama sejak perubahan
23–26 Oktober: 131 lulus, 0 gagal, 6 terlewat. Keenam lewatan berbunyi "tak ada
survei", padahal `skm_db` punya lima survei aktif. Lima di antaranya cacat ini;
yang keenam [BUG-036](#bug-036).

**Yang terjadi.** Sejak `22b2d03` (30 September 2026) aksi survei Admin
Kabupaten ada di menu titik-tiga "Aksi untuk …". Butirnya baru masuk DOM
sesudah menunya dibuka, dan berperan `menuitem`, bukan `button`. Lima uji masih
mencari `button "Bagikan"` / `button "Hapus"` di halaman, tak menemukannya, lalu
melewati dirinya lewat `test.skip((await tombol.count()) === 0, …)`:

- `poster-qr-survei.spec.ts:41` — unduhan QR berupa poster 1080×1440
- `responsif-komponen.spec.ts` — modal bagikan dan konfirmasi hapus, masing-masing di 320px dan 390px

**Mengapa Medium untuk cacat uji.** Sealasan dengan [BUG-030](#bug-030): ini
hijau palsu, bukan merah palsu. Hampir empat minggu tiga perilaku tak terukur
sama sekali, dan laporan suite tetap terbaca "0 gagal". Bahayanya sudah
diperingatkan tertulis di `playwright.config.ts` dekat `workers` — uji yang
melewati diri lewat `count() === 0` mengubah "tak terukur" menjadi "dilewati".

**Satu ironi yang perlu dicatat:** uji KONTROL di `poster-qr-survei.spec.ts`
sudah dibetulkan untuk menu itu 7 Oktober 2026, dengan komentar panjang yang
menjelaskan pemindahannya. Uji utama tiga puluh baris di atasnya terlewat dari
perbaikan yang sama.

**Perbaikan.** Helper `cariButirAksi` di `e2e/fixtures/responsif.ts` membuka menu
baris demi baris sampai butirnya ketemu — bukan baris pertama, sebab "Bagikan"
hanya ada pada survei aktif — dan menunggu pemicunya tampil lebih dulu supaya
tabel yang belum dirender tak terbaca sebagai tabel kosong.

**Celah kedua yang ikut ditutup.** Kedua uji modal hanya mengukur luberan
halaman sesudah butirnya diklik, dan pengukuran itu lulus juga atas halaman
TANPA modal. Begitu dibetulkan, keduanya akan tetap hijau bila butirnya
berhenti membuka apa pun. Kini modalnya diasersikan terbuka lebih dulu:
konfirmasi hapus lewat `role="dialog"`, modal bagikan lewat judul "Bagikan
Survei".

**Bukti.**

- `poster-qr-survei` + `responsif-komponen`: 70 lulus, **0 terlewat**.
- Mutasi "butir tidak diklik" pada kedua uji modal: 4 dari 4 merah tepat di
  asersi baru, lalu dipulihkan.

**Pengamatan samping, tidak dikerjakan di sini:** `ShareSurveyModal.jsx` tidak
ber-`role="dialog"` maupun `aria-modal`, berbeda dengan `ConfirmActionModal`
sejak BUG-015. Itu sebabnya ujinya terpaksa mencari judul. Dicatat dan
ditutup kemudian sebagai [BUG-037](#bug-037).

**Ditutup** — `e58b3c3`, merge `c307179` di `main`.

---

<a id="bug-036"></a>

### BUG-036 — Fixture E2E mencocokkan status `draf`, enum-nya `draft`

|              |                                                   |
| ------------ | ------------------------------------------------- |
| **Charter**  | —                                                 |
| **Tanggal**  | 26 Oktober 2026                                   |
| **Berkas**   | `apps/web/e2e/fixtures/responsif.ts:551` (sebelum perbaikan) |
| **Severity** | Low (usulan penguji)                              |
| **Jenis**    | Cacat perkakas uji, bukan cacat produk            |

`ambilContoh` mencari survei draf dengan
`s.status.toLowerCase() === 'draf'`, sementara API mengirim nilai enum
`SurveyStatus` apa adanya, `draft`. `contoh.surveiDraf` karena itu tak pernah
terisi, dan uji "tombol di perancang survei punya nama di 320px"
(`nama-terakses.spec.ts:142`) selalu melewati dirinya dengan alasan "Tak ada
contoh data" — juga ketika draf ada.

**Mengapa Low, bukan Medium seperti BUG-035.** Pada sapuan 26 Oktober memang
tak ada draf hasil seed, jadi lewatan hari itu kebetulan sah. Cacatnya tetap
nyata: ia menyembunyikan uji itu tepat ketika uji itu dapat berjalan.

**Bukti, dengan draf ADA di basis data:** ejaan lama `'draf'` → terlewat;
`'draft'` → lulus. Draf yang dipakai (id 580, 581) tidak berpenanda `[UJI ` dan
hanya dibaca, tidak diubah.

**Ditutup** — `e58b3c3`, merge `c307179` di `main`, bersama BUG-035.

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
| 2.8   | 3 September 2026   | **Dua belas kasus uji terakhir Modul Y ditutup** (TC-FE-005/006/007/010/012/028/032/042/043/045/046/047) — Jest 80 → **195** di 24 berkas, E2E 6 → **9**. Nol temuan baru, tetapi **tiga premis kasus uji ternyata usang** dan dikoreksi alih-alih dipaksakan: TC-FE-006 menuntut toast pada aplikasi yang tak punya sistem toast, TC-FE-012 menuntut tooltip pada grafik SVG yang nilainya selalu terlihat, dan satu temuan mobile TC-FE-007 (guliran mendatar 809 px) **dibatalkan sendiri** setelah terbukti berasal dari gambar `w-auto` yang diukur sebelum dimuat — masuk §Y.5 sebagai butir keempat. Ditambah **pembersihan data uji dari basis data dev** atas permintaan penguji: 6 pengaduan, 43 respons, 2 survei mati, 30 notifikasi tanpa FK, 2 akun karangan, dan 22 berkas unggahan tak tertaut dihapus — `/statistics` publik jujur kembali (responden 44 → 3, pengaduan 11 → 6). Survei 332/333 sengaja dipertahankan karena BUG-005 masih terbuka, dan `consentAt` `warga@gmail.com` dikembalikan `null` sehingga fixture responden tanpa persetujuan tersedia lagi. |
| 2.9   | 4 September 2026   | **Tiga survei uji tersisa dihapus paksa** atas permintaan penguji: 332 & 333 (reproduksi hidup BUG-005) dan 336 (fixture E2E). Keberatan sudah disampaikan — BUG-005 masih terbuka dan peragaannya jadi hilang — tetapi keputusan tetap di penguji. Bukti tertulis BUG-005 utuh di laporan ini dan dapat dibangun ulang dalam hitungan menit; baris aslinya dicadangkan lebih dulu. Fixture E2E dibuat ulang sendiri oleh `globalSetup` pada jalan berikutnya. Basis data dev kini **nol baris bertanda `[UJI `**. |
| 3.0   | 15 September 2026  | **`main` ditarik ke `tester`** (85 commit, 11 hari). 16 kasus uji merah di 4 berkas — **nol di antaranya cacat produk**: seluruhnya pengujian yang masih berbicara dengan kontrak yang sudah tidak ada (`role` tunggal → `roles`+`actingRole`, callback membaca `/auth/roles`, `reply.dariPelapor`, taksonomi sub-kategori dihapus, gerbang pengisian survei, peran jamak pada dev-login). Rinciannya di TEST_CASES §Y.7. Dua berkas uji penguji dibuang karena menguji antarmuka yang tak pernah lagi dirender; dua konflik merge diselesaikan dengan versi `main` yang lebih dalam. Tambah **CAT-013** (keterangan `proxy.js` menerangkan aturan yang sudah tidak berlaku) dan matriks A.5.1 disesuaikan. Suite: Jest **663/663 di 89 berkas**, eslint 0 galat. Basis data dev dibersihkan, termasuk **7.986 notifikasi tanpa induk** yang menunjuk tiket pengaduan yang sudah lenyap. |
| 3.1   | 15 September 2026  | Dokumen pengujian dicocokkan ulang dengan kode, bukan dengan versi sebelumnya. Tambah **CAT-014** — `pnpm db:seed` tak dapat dijalankan sejak peran jamak (`seed.ts` menulis `role` tunggal; kolomnya sudah dibuang), sehingga titik awal yang dapat direproduksi tak tersedia bagi siapa pun. Peta otomatisasi TEST_CASES §Y.1 dibaca ulang dari `jest --json`: **delapan baris meleset**, termasuk satu berkas yang sudah tak ada. TEST_PLAN dinaikkan ke v1.3 setelah tertinggal 13 hari di belakang model peran jamak. |
| 3.2   | 15 September 2026  | **Sesi C-14 (Sampah survei & hapus permanen) dijalankan** — tiga temuan. **BUG-013 (High)**: survei yang dibuang ke Sampah tetap menghitung IKM kabupaten, papan peringkat OPD, jumlah responden, dan tren triwulan pada halaman publik; dibuktikan dengan uji kendali — memusnahkannya permanen mengembalikan seluruh angka persis ke semula. **BUG-014 (Medium)**: hapus permanen membersihkan enam tabel tetapi meninggalkan notifikasi yang menaut lewat teks `link`, menumpuk di lonceng lima akun admin sungguhan. **BUG-015 (Medium)**: dialog konfirmasi destruktif tak terbaca pembaca layar — `ConfirmActionModal` tanpa `role`/`aria-modal` sama sekali, dan `ConfirmTypeToDeleteModal` mengaku `aria-modal="true"` sambil meninggalkan fokus di luar dirinya. Delapan pemeriksaan lain **nihil cacat**, termasuk isolasi Sampah antar-OPD, penolakan 403 atas pemusnahan oleh Admin OPD, dan ketepatan sasaran pada dua survei berjudul sama. |
| 3.3   | 15 September 2026  | **Sesi C-15 (berpindah peran dalam satu sesi) dijalankan — nihil cacat.** Sepuluh hal ditelusuri dan seluruhnya benar, termasuk penolakan **403** atas peran yang tidak dimiliki, **401** atas token yang belum berperan, pemantulan area sesudah berpindah, dan gerbang PDP yang berdiri tepat saat peran `responden` diambil. Satu dugaan sengaja diuji dan **gugur**: akun tanpa persetujuan PDP yang tetap boleh memakai area Admin Kabupaten bukan gerbang jebol, melainkan pembagian yang benar antara data pribadi responden dan tugas jabatan. Dua catatan: **CAT-016** (sesi memegang dua token berbeda; yang di cookie tak pernah berperan, sehingga keputusan area bersandar pada cookie `role` polos padahal klaim `act` bertanda tangan sudah tersedia) dan **CAT-017** (berpindah peran tidak mencabut token peran sebelumnya — token lama masih menulis, dan masih sah 24 jam bahkan sesudah logout). |
| 3.4   | 15 September 2026  | **Sesi C-16 (rute publik tanpa sesi & captcha) dijalankan.** Sepuluh pemeriksaan lulus — termasuk gerbang PDP bagi pengunjung tanpa akun, penolakan **404** atas survei non-anonim, **400** atas kiriman tanpa `setuju`, dan **403** `CAPTCHA_TIDAK_SAH` atas token karangan maupun token yang tak ada. **BUG-016 (Medium)**: ketika Turnstile gagal menerbitkan token, tombol "Kirim Survei" terkunci selamanya tanpa satu pun pesan — `error-callback` hanya mengosongkan token, dan satu-satunya jalur pesan (`submitError`) baru hidup sesudah pengiriman dicoba. **CAT-018**: pengiriman publik tak dapat diuji ujung-ke-ujung di lingkungan ini karena site key Turnstile tak memuat hostname `skema.local`; ini pula sebab dua pengujian E2E milik tim dev dilewati, bukan lulus. Satu probe keliru (mencentang kotak yang salah) hampir menghasilkan laporan "jalan buntu" yang palsu, dan dibatalkan sesudah struktur gerbangnya didaftar ulang. |
| 3.5   | 15 September 2026  | **Sesi C-17 (riwayat notifikasi) dijalankan.** Enam pemeriksaan lulus, termasuk satu dugaan yang sengaja diuji dan **gugur**: penyaringan & paginasi halaman ini dikerjakan backend, bukan diambil semua lalu disaring di peramban seperti halaman OPD yang melahirkan BUG-011. **BUG-017 (Medium)**: pemicu `Dropdown` dilabeli `<label for>` sehingga nama terbacanya adalah labelnya, bukan nilainya — pemakai awas melihat "Aduan", pembaca layar mendengar "Kategori Pengaduan". Berlaku pada **17 berkas**, terburuk di formulir pengaduan warga: pelapor tunanetra tak dapat memastikan OPD tujuan sebelum mengirim. `aria-haspopup` dan `aria-expanded` juga tak ada di mana pun. |
| 3.6   | 15 September 2026  | **Sesi C-18 & C-19 dijalankan — seluruh charter baru sesudah tarikan `main` tuntas.** C-18 (teruskan pengaduan antar-OPD): enam pemeriksaan lulus, termasuk isolasi sebelum & sesudah penugasan, **403** bagi Admin OPD, **404** bagi OPD yang tak ada, dan **400** pada peneruskan kedua. **BUG-018 (Low)**: meneruskan menyiarkan ulang "Pengaduan Baru Masuk" kepada admin yang sudah menerimanya — dibuktikan dengan dua kendali (5/5 dan 4/4 berbanding 9 notifikasi untuk 5 penerima); pelapornya sendiri justru tak diberi tahu. C-19 (tiga menu ekspor): **nihil cacat** — CSV dan PDF benar-benar diunduh dan isinya diperiksa, dan menu ekspor ternyata komponen paling lengkap aksesibilitasnya di antara semua yang diperiksa hari ini. **CAT-019**: ekspor daftar survei mewarisi batas `limit: 100` sisi klien (belum terjangkau hari ini) dan pilihan "Ekspor Excel" sebenarnya menghasilkan `.csv`. |
| 3.7   | 15 September 2026  | **CAT-014 diperbaiki dan diverifikasi** atas permintaan penguji — menyimpang dari aturan biasa bahwa penguji tak menyentuh `apps/api`. Tiga berkas: lima baris `role:` menjadi `roles: [...]` pada `seed.ts`, `prisma/**/*` masuk `include` tsconfig, dan `prisma` masuk `exclude` tsconfig.build. Berkas ketiga tidak ada dalam rencana dan justru terpenting: tanpa itu `nest build` patah dengan TS6059 karena `rootDir: ./src`. Dibuktikan berlapis — penjaganya dibuat memerah lewat mutasi sengaja dua kali, seed dijalankan penuh pada basis data sekali pakai yang dibuat dari nol (`migrate deploy` + `db:seed`, idempoten pada jalan kedua), `skm_db` dipastikan tak tersentuh, dan 708 uji unit backend tetap lulus. |
| 3.8   | 15 September 2026  | **BUG-013 terkunci uji otomatis** (`e2e/statistik-sampah.spec.js`). Sebabnya kini pasti: `DashboardService.getStatistics` memanggil `prisma.ikmResult.findMany` **tanpa `where` sama sekali**, dan query itu menyuapi `summary.ikm` sekaligus seluruh `ikmTrend`. Ditulis sebagai `test.fail()` supaya suite tetap hijau selama cacatnya ada dan MERAH begitu diperbaiki. Efek sampingnya menyingkap gigi BUG-014: spec memusnahkan surveinya sendiri dan `bersihkan-data-uji.mjs` tak dapat menemukan notifikasi yang ditinggalkannya — skrip pembersih karena itu dapat bendera opt-in `--tanpa-induk`. |
| 3.9   | 15 September 2026  | **Lima temuan sisa terkunci — keenam temuan C-14…C-19 kini berpagar.** BUG-014 & BUG-018 di E2E (`e2e/notifikasi-siklus.spec.js`), BUG-015/016/017 di Jest dengan `test.failing()`. Enam siklus mutasi, seluruhnya dikembalikan; tak ada kode produksi yang berubah. Sebab BUG-018 kini pasti: `ComplaintsService.forward` memanggil `notifyComplaintCreated`, jalur siar yang sama dengan pengaduan baru, dan jalur itu menyiarkan ke **setiap** akun admin. Pagar BUG-016 sengaja dipasang di `TurnstileWidget`, bukan `ModalKirimSurvei`: uji yang menuntut pesan saat token kosong akan menuntutnya muncul ketika tak ada yang salah, dan tetap merah sesudah perbaikan yang benar. |
| 4.0   | 15 September 2026  | **CAT-020** — nginx menandai upstream `skm_api` mati saat API restart dan **tidak memulihkannya sendiri**: `…/api/v1/*` membalas 502 berjam-jam sementara `/` tetap 200, padahal API sehat dan dapat dicapai dari dalam container nginx. Menjelaskan **dua** jalan E2E yang mati di `globalSetup`, tetapi **bukan** kegoyahan yang tercatat di §Y.3 — jalan penuh sesudah `nginx -s reload` tetap gagal 5 dari 17 tanpa satu pun 502. Ditambahkan pula peringatan `pnpm db:seed` di TEST_PLAN §5.1: dijalankan dari akar repo ia **tidak ada**, dan dijalankan pada `skm_db` ia memangkas peran superuser dev dari empat menjadi satu. |
| 4.1   | 15 September 2026  | **C-09 ternyata tidak lagi terkunci.** Kredensial SSO Helpdesk sudah terisi di `apps/api/.env` — tombol masuk tak lagi menjawab 503 — dan seluruh laporan sebelumnya masih mencatatnya terkunci. Charter dijalankan sebagian: pengalihan ke `api.madiunkab.go.id` benar, issuer terjangkau, kredensial klien **diterima Helpdesk** (`code` karangan ditolak dengan `invalid authorization code`, bukan `invalid_client`), dan penjagaan CSRF-nya bukan sekadar ada — `state` yang sah TANPA cookie-nya pun ditolak. **BUG-019 (Medium)**: `error_description` dari luar ditampilkan apa adanya di layar "Gagal masuk lewat SSO Helpdesk", hingga 1024 karakter bebas; bukan XSS (React merendernya sebagai teks) melainkan penyuntikan KALIMAT di domain pemerintah yang sah. Sisi keduanya terjadi tanpa penyerang: kegagalan biasa menampilkan "Helpdesk tidak mengembalikan access_token: invalid authorization code" kepada warga. Terkunci `e2e/sso-galat.spec.js`. Sisa charter menunggu **akun pengguna** Helpdesk, bukan kredensial aplikasi. |
| 4.2   | 15 September 2026  | **CAT-021** — basis data hasil `db:seed` menghasilkan empat akun yang seluruhnya **berperan tunggal**, padahal peran jamak adalah inti model akses sejak 5 September. Akibatnya lingkungan yang disiapkan persis sesuai dokumen tak dapat mengamati `actingRole: null`, 401 "Peran yang ingin dipakai belum dipilih", `POST /auth/acting-role`, pemilih peran, maupun **seluruh charter C-15**. Yang lebih rapuh: kelima akun berperan jamak di `skm_db` disetel dengan tangan dan penyetelannya tak tercatat di repositori mana pun — hilang basis data itu, hilang satu-satunya lingkungan tempat peran jamak dapat diuji. Atas dasar ini diputuskan **tidak** menjalankan ulang suite dari seed bersih: ia menghasilkan dunia yang berbeda, bukan dunia yang sama dengan lebih rapi, sementara angka Jest (673/673) sudah reproducible tanpa basis data sama sekali. |
| 4.3   | 15 September 2026  | Kata **"yatim"** diganti **"tanpa induk"** di seluruh dokumen pengujian dan perkakas uji atas permintaan pengguna — 40 kemunculan di enam berkas; bendera pembersih `--yatim` menjadi `--tanpa-induk`. Satu kemunculan di `docs/Routes-List-API-dan-Frontend.md` sengaja **tidak** diubah: itu tulisan tim dev yang hidup di `main`. Selain itu, kegoyahan E2E akhirnya **terukur** ([TEST_CASES §Y.3.1](TEST_CASES.md)) dan sebabnya bukan produk: empat peramban berebut satu mesin. |
| 4.5 | 15 Oktober 2026 | **BUG-020** — parameter boolean bernilai `false` dibaca sebagai `true` di empat endpoint, satu sebab: `enableImplicitConversion` membuat `Boolean('false')` berjalan sebelum `@Transform` DTO. `isActive` pada `GET /opd` diperbaiki dan beruji; `isAnonim`, `tanpaOpd`, `unreadOnly` belum, dan ketiganya tak terjangkau dari antarmuka hari ini. Tiga kasus uji baru di Modul J `TEST_CASES.md`. Versi 4.4 tak pernah punya barisnya sendiri di tabel ini; nomor itu dilewati alih-alih dikarang. |
| 4.6 | 15 Oktober 2026 | **BUG-020 ditutup.** Tiga medan sisanya -- `isAnonim`, `tanpaOpd`, `unreadOnly` -- diperbaiki dengan `@Type(() => String)` dan masing-masing dapat uji e2e yang dibuktikan merah lebih dulu oleh cacatnya sendiri, bukan oleh mutasi. TC-BOOL-001 s.d. 003 di Modul J kini ✅. Satu kesalahan penguji ikut dicatat: uji `tanpaOpd` mula-mula memerah dengan 400 karena `limit=200` melampaui batas 100, merah karena alasan yang salah, lalu dibetulkan. e2e api 441 -> 444 uji. |
| 4.7 | 15 Oktober 2026 | **BUG-021** — `ComplaintTable` memanggil `Pagination` dengan `1/1/3` dipatok mati, sehingga daftar pengaduan warga berbunyi "Menampilkan 1-3 dari 12" di bawah dua belas baris; ditambah pemotongan diam di lima halaman admin (`FETCH_LIMIT = 100`), daftar warga (50), dan Riwayat Aktivitas (10). Ditutup lewat satu komponen bersama `CatatanPemotongan` dan angka paginasi yang diturunkan dari baris yang ada, 21 uji dibuktikan merah lebih dulu. Pemotongannya sendiri TIDAK diperbaiki dan dicatat sebagai **CAT-022**, sebab paginasi sisi server menuntut backend menerima `search`. Dua pemasangan tanpa uji disebut tersurat. TC-FE-050 & 051 lahir dari sini. Label "Beranda" juga berganti menjadi "Layanan" di seluruh antarmuka pada hari yang sama; sebelas sebutan bertanggal di dokumen ini dibiarkan utuh. |
| 4.8 | 15 Oktober 2026 | **Dua pemasangan tanpa uji pada BUG-021 ditutup** (`06a7da7` di `main`): `admin-kab/complaints` dan `admin-opd/complaints` mendapat uji halaman pertamanya, 6 + 7 kasus. Kode halamannya sudah ada sehingga uji baru lulus pada jalan pertama, jadi ketiga belas uji dibuktikan lewat SEBELAS MUTASI yang dipasang satu per satu lalu dipulihkan; setiap uji terbunuh oleh setidaknya satu. TC-FE-051 dikoreksi: "tiga uji halaman admin" menjadi lima. Dua kesalahan penguji pada catatan 4.7 ikut dikoreksi, bukan dihapus: berkas yang disebut "tak ada lagi" sebenarnya hidup di `tester` dan hanya tak ada di `main`, dan angka "200 berkas / 1.640 uji" adalah bacaan `main` yang tak dapat dibandingkan dengan tabel pemetaan §Y.1 yang dibaca di `tester`. Satu benturan merge ditinggalkan dengan sengaja pada jalur uji halaman OPD, berisi dua berkas yang lahir sendiri-sendiri; penyelesaiannya gabungan, bukan pilihan. |
| 4.9 | 15 Oktober 2026 | **Benturan merge BUG-021 dilumpuhkan** (`9a9ce6d` di `main`): kedua berkas dilebur menjadi satu bertiga belas kasus, gaya berpindah ke MSW supaya enam kasus September tetap menembus service dan adapter sungguhan, dan 19 ujinya dibuktikan ulang lewat tujuh belas mutasi. Benturan git-nya tetap ada; yang berubah, penyelesaiannya kini cukup mengambil versi `main` tanpa kehilangan cakupan. **CAT-023 baru** menyisir pemisahan cabang yang melahirkannya: `tester` tertinggal sebulan dari `main` (commit bersama terakhir `de41245`, 15 September), 720 berkas berbeda di luar `docs/`, dan 29 berkas hidup hanya di `tester`. Ketiga belas berkas uji milik `tester` DIJALANKAN terhadap kode `main`: 113 uji, enam berkas hijau seluruhnya (44 uji), tujuh berkas dengan 14 uji merah — sembilan karena produknya sengaja berubah, empat karena `main` kekurangan perbaikan `jest.setup.js` yang sudah ada di `tester` (**CAT-009 dikoreksi**: "sudah diperbaiki" hanya benar di `tester`), satu karena uji yang terlalu longgar. Kekhawatiran anonimitas pada kolom "Pengisi" diperiksa dan TIDAK terbukti. **Rekap temuan dikoreksi** dari 20/14/5 Low menjadi 21/15/6 Low: angka lamanya ditambah satu alih-alih dihitung ulang dari tabelnya. |
| 5.0 | 16 Oktober 2026 | **BUG-005 DITUTUP** (`6d2f298` di `main`), dan dengan itu tak ada lagi temuan Critical yang terbuka — pertama kalinya sejak dokumen ini dibuat. Itulah sebabnya nomor minornya naik ke 5.0, bukan 4.10. Akar masalahnya dua lapis: `duplicate()` tak pernah memuat relasi `options`, dan penjaga "minimal 2 opsi" di `QuestionsService` tak berada di jalur nested create sehingga tak pernah dapat menangkapnya. Ujinya merah lebih dulu oleh cacatnya sendiri (`Expected: 7, Received: 0`, sama persis dengan bukti 2 September). Satu koreksi atas laporan aslinya ikut dicatat: opsi pada tipe `skala` memang opsional menurut rancangan — terukur 46 dari 46 pertanyaan skala di `skm_db` tanpa opsi — jadi label yang kembali ke baku adalah kehilangan penyesuaian, bukan kebuntuan. Basis data pengembangan diperiksa dan nol salinan rusak ditemukan, tetapi hasil itu lemah sebab `skm_db` juga memuat nol survei salinan; produksi tidak diperiksa dan pertanyaannya tetap terbuka di sana. TC-FE-031 ❌ menjadi ✅. Rekap dihitung ulang dari tabelnya, bukan dikurangi: 7 ditutup, 14 terbuka, 0 Critical. |
| 5.1 | 19 Oktober 2026 | **BUG-013 DITUTUP** (`f1c132e` di `main`), dan dengan itu tak ada lagi temuan Critical MAUPUN High yang terbuka. Laporan aslinya menyebut SATU sebab; penyisirannya menemukan **tujuh** tempat tanpa penyaring `deletedAt`, dan query `ikmResult` yang disebut laporan itu sendiri menyuapi EMPAT keluaran, bukan dua seperti tertulis di entrinya — kedua pernyataan itu dikoreksi sebagai catatan bertanggal, bukan ditulis ulang. Satu lubang kedelapan disangka ada lalu dibatalkan oleh pengukuran: `remove` menyetel `status: ditutup`, jadi survei di Sampah tak pernah dapat `aktif`. Ujinya merah lebih dulu oleh cacatnya sendiri (`totalRespondents` diharap 1, diterima 2), lalu sembilan uji e2e dipasang; tujuh di antaranya dibuktikan lewat tujuh mutasi, dua sisanya uji prasyarat yang memang tak dapat dibunuh mutasi semacam itu. Satu cacat UJI ikut diperbaiki: `(INT-14) topOpd` terikat singgahan 60 detik dan gagal tiap kali suite dijalankan ulang selagi singgahannya hangat — terukur di Redis, `opdId 755` sementara barisnya sudah dihapus. **Pagar `test.fail()` BUG-013 di cabang ini akan merah pada merge `main` berikutnya; cabut anotasinya, jangan hapus specnya.** Urutan baris 4.9 dan 5.0 di tabel ini juga dibetulkan — 4.9 (15 Okt) sempat tercatat SESUDAH 5.0 (16 Okt). |
| 5.2 | 19 Oktober 2026 | **CAT-009 ditutup di `main` juga** (`1bd55ec`): `jest.setup.js` berhenti menimpa `global.File` dengan `undefined`, dan penjaga langsung dipasang di `src/__tests__/penyiapan-file-global.test.js` yang dibuktikan merah lebih dulu. Dua angka pada catatan 15 Oktober dikoreksi, bukan ditulis ulang: biayanya bukan empat uji melainkan DUA BERKAS PENUH (22 uji), dan daftar berkas yang dapat dipindahkan naik dari enam berkas / 44 uji menjadi tujuh berkas / 66 uji semata karena perbaikan itu. **CAT-023 jalan pertama diambil sebagian**: ketujuh berkas itu pindah ke `main`, lima berkas basi tetap tinggal dengan sebabnya masing-masing, dan pemisahan cabangnya SENDIRI belum tersentuh — 342 berkas hanya-di-`main`, 349 berbeda isinya, 11 spec Playwright belum dinilai. Satu baris tabel CAT-023 terbukti salah: `AuthCallbackLoader` didaftarkan hijau, padahal ia GOYAH — lulus 7/7 sendiri, gagal pada satu dari dua jalan suite penuh karena tenggat bawaan 1.000 ms pada `findByText`. Dugaan pertama bahwa ia tak layak diangkut TIDAK terbukti; ia layak, tetapi tidak apa adanya. |
| 5.3 | 19 Oktober 2026 | **Dua kalimat pada catatan CAT-023 pagi ini berhenti benar sebelum hari itu berakhir, dan dikoreksi alih-alih ditulis ulang.** `AuthCallbackLoader.test.jsx` IKUT pindah ke `main` (`6b1a7bc`) sebagai salinan apa adanya, sehingga "Ia TIDAK dipindahkan" salah; dan penawar yang dianjurkan di sana — menaikkan tenggat pada satu `findByText` — ditulis lebih dulu lalu DIBUANG. Sebabnya terukur: porting tujuh berkas itu sendiri yang membuat suite web `main` goyah, bukan cacat lama yang kebetulan terlihat. Tiga jalan suite penuh per keadaan memisahkannya — 202 berkas hijau 3 dari 3, 211 berkas dengan tenggat bawaan hanya 1 dari 3, 211 berkas dengan tenggat dinaikkan kembali 3 dari 3 — dan keempat berkas yang memerah tak satu pun disentuh. Satu kelas kegagalan, sebabnya pertikaian CPU (`inti - 1` pekerja di mesin berinti delapan), dan CI berinti empat mungkin tak pernah melihatnya. Penawarnya dua baris: `testTimeout: 20000` dan `configure({ asyncUtilTimeout: 5000 })`. Hitungan berkas yang pindah menjadi DELAPAN / 73 uji, diturunkan dari selisih dua jalan suite (1.734 − 1.659 = 75, dikurangi 2 uji penjaga `global.File`) alih-alih dijumlahkan dengan tangan. Nomor versi di kepala dokumen juga dibetulkan: ia masih berbunyi 5.0 / 15 Oktober padahal tabel ini sudah mencatat 5.1 dan 5.2 — kelalaian penguji pada dua commit sebelumnya. |
| 5.4 | 19 Oktober 2026 | **Besarnya merge `main` ke `tester` akhirnya terukur, dan uji-cobanya menyingkap satu cacat porting milik penguji.** `git merge-tree` melaporkan 13 berkas berbenturan, bukan ratusan: angka 342 dan 349 pada CAT-023 tetap benar tetapi BUKAN ukuran kesulitan merge-nya. Tujuh dari 13 benturan itu cacat, bukan perbedaan sah — salinan tujuh berkas uji di `main` RUSAK karena skrip penyalinnya membaca cp1252 lalu menulis UTF-8, sehingga 58 baris menjadi mojibake, termasuk nama `describe`/`it` pada tiga berkas pagar. Tak satu alat pun memerah: prettier mengecualikan `apps/web`, eslint tak mempersoalkan aksara dalam komentar, dan mojibake-nya UTF-8 yang sah. Diperbaiki di `main` (`978fcb2`), ketujuhnya kini byte-identik dengan sumbernya di sini, `tester` sendiri bersih 0 dari 748 berkas, dan benturan merge turun 13 → 6. **Pagar `test.fail()` BUG-013 diputuskan dibiarkan terpasang**, dicabut saat merge; dasarnya BUG-013 sudah berpagar sembilan uji e2e `apps/api` di `main`, jadi menunggu tidak meninggalkan celah. **Tiga puluh dua tautan jangkar putus diperbaiki** dengan memasang 11 jangkar HTML eksplisit; hitungan "tujuh" yang pernah dicatat mengecilkannya karena hanya menyisir tautan internal `BUG_REPORTS.md` dan melewatkan tautan dari `TEST_PLAN.md` dan `TEST_EXPLORATORY.md`. |
| 5.5 | 19 Oktober 2026 | **`main` AKHIRNYA DITARIK KE `tester`** (`fbdf85c`), dan pilihannya habis bukan karena kerapian: `apps/api` di cabang ini terbukti TIDAK DAPAT DIJALANKAN — lima puluhan galat TypeScript dari satu akar, yakni klien Prisma dan `skm_db` yang sudah mengikuti `main` sementara schema di sini masih sebulan lalu (21 migrasi berbanding 33). `prisma generate` diperiksa dan tidak menyelesaikannya; menurunkan `skm_db` DITOLAK sebab satu-satunya jalan `migrate reset`, yang membuang 528 baris `audit_logs`. Enam benturan, semuanya selesai dengan versi `main` karena tiap sisinya terbukti superset atau lebih dalam; `seed.ts` diselesaikan per-hunk. **Merge otomatis menanam satu cacat senyap**: `testPathIgnorePatterns` terdeklarasi dua kali di `apps/web/jest.config.js` dan yang kedua membuang `<rootDir>/.next/` — kunci objek kembar bukan galat, dan tak satu alat pun memerah. Kelima berkas uji basi dibereskan satu per satu, dan tiga di antaranya bukan perkara selektor; `NavigasiPeran` PREMISNYA DIBALIK alih-alih dibuang sebab ia satu-satunya penjaga kedua menu bekas-superuser di navigasi, dengan dua uji baru dibuktikan merah lewat mutasi. Daftar `MENU_UMUM` juga ternyata basi dalam tiga hal, tersembunyi karena satu kegagalan menutupi kegagalan sesudahnya. **Anotasi `test.fail()` BUG-013 dicabut** (`b760088`), specnya tidak dihapus; tiga pagar backend lain diperiksa di kodenya dan masih benar. Suite: 216 suite / 1.770 uji hijau pada dua jalan, eslint kode=0. |
| 5.6 | 20 Oktober 2026 | **Pagar BUG-013 AKHIRNYA DIJALANKAN, dan ia memerah dua kali lebih dulu** (`80e7667`). Pencabutan anotasinya tercatat sebagai belum terbukti karena `apps/api` tak dapat dinyalakan; hari ini ia hidup, dan hasil akhirnya 2 lulus / 2 uji kode=0 dalam 2,1 menit. Dua sebab kemerahannya berlapis dan keduanya BUKAN cacat aplikasi. Pertama, `POST /surveys — HTTP 400`: spec itu lebih tua dari kontrak survei 8 Oktober, dan kontraknya mengubah TIGA hal sekaligus (`jenis` wajib; sembilan unsur lahir sendiri sehingga menambah unsur justru DITOLAK; semua pertanyaan skala wajib dijawab) — kegagalannya hanya menunjuk yang pertama, jadi satu kegagalan kembali menutupi kegagalan sesudahnya. Kedua, `Expected: 25, Received: null`: `GET /statistics` disinggahkan 60 detik di bawah kunci `statistik-publik` dan TAK ADA yang membatalkannya, jadi pembacaannya kini `expect.poll` bertenggat 70 detik dan tenggat ujinya dinaikkan tersurat ke 150 detik — `timeout: 180_000` di config itu milik `webServer`, bukan uji. Derivasi angka 25 diganti: yang lama `(1/4) × 100` dan menyebut "satu-satunya unsur IKM", angkanya kebetulan benar dan jalannya keliru. **CAT-023 jalan pertama TUNTAS**: kelima berkas uji terakhir pindah ke `main` (`ad9e0e9`, merge `ce9ffaf`), tiga belas dari tiga belas terhitung, nol tertinggal. **Dua angka CAT-023 dikoreksi** — spec `.js` milik penguji 6 bukan 7, spec `.ts` tim dev 14 bukan 15; angka 11 benar sebagai jumlah berkas termasuk lima penopang, tetapi dipakai sebagai jumlah spec di tiga tempat. `.gitignore` `apps/web` di `main` disamakan dengan cabang ini (`7a7cd04`). |
| 5.7 | 20 Oktober 2026 | **Pagar BUG-013 terbukti DUA ARAH, dan keenam spec Playwright milik penguji akhirnya dinilai.** Penyaring `where: { survey: TIDAK_DIBUANG }` pada `dashboard.service.ts:337` dibuang sementara dan dipulihkan di `finally`: uji kendali tetap hijau, pagarnya memerah dengan `Received: 25`. Sasarannya dipilih dari kode — membuang survei `aktif` menutupnya lebih dulu lalu menerbitkan snapshot IKM, jadi sesudah masuk Sampah ia masuk lewat `ikmResult`, bukan `activeSurveys`. **Keenam spec: tiga sehat, satu goyah, dua basi.** `ajukan-pengaduan` 3/3, `sso-galat` 2/2, `statistik-sampah` 2/2; `proteksi-route` 4/4 tetapi dua ujinya habis tenggat 150 detik lalu lulus saat diulang (tenggat itu milik berkasnya sendiri, bukan config); `notifikasi-siklus` gagal pada kendali BUG-014 dengan kontrak survei yang sama (`jenis` wajib) sehingga pagar BUG-014 TIDAK JALAN, sementara pasangan BUG-018 sehat dan pagarnya memerah sebagaimana mestinya; `isi-survei` gagal dengan `E2E_SURVEY_ID belum disetel` — ramalan 19 Oktober menjadi pengamatan, dan pesan galatnya sendiri kini menyesatkan sebab `pnpm test:e2e` memakai config yang sama. Hitungan E2E dikoreksi: **17 uji di 6 spec**, bukan 19 di 7. |
| 5.8 | 20 Oktober 2026 | **Kedua spec basi dibereskan (`d88abb7`), dan pemanasan rute yang ikut mati pada merge dipulihkan (`6af266d`).** Keenam spec penguji kini hijau, satu goyah. `notifikasi-siklus` mengikuti kontrak survei yang sama, dan akibat terpentingnya bukan satu uji berubah hijau melainkan **pagar BUG-014 akhirnya BENAR-BENAR JALAN** — pagi ini ia "did not run"; BUG-014 dan BUG-018 terbukti masih terbuka lewat pagarnya sendiri, bukan lewat pembacaan kode. `isi-survei` ternyata soal **premis fiksturnya yang kedaluwarsa**: "survei aktif tidak dapat dihapus" benar sampai 11 September 2026 dan tidak lagi, jadi spec-nya kini membuat dan memusnahkan surveinya sendiri alih-alih menyambung ulang `globalSetup` — yang terakhir menuntut menyunting `playwright.config.ts`, berkas milik `main` di cabang ini. Nol survei `[UJI ` tertinggal membuktikan pembongkarannya bekerja. **Akibat kedua merge itu tersingkap**: `panaskanRute()` ikut mati bersama `globalSetup` cabang ini, dan gejalanya persis yang docblock-nya sendiri peringatkan. Dipulihkan sebagai `support/pemanasan.js`, dipanggil per spec. Perbaikan itu sendiri BELUM terverifikasi sebab rutenya sudah panas; mengukurnya menuntut `next dev` baru. Satu kegoyahan baru pada `ajukan-pengaduan` (balapan dropdown, bukan kompilasi) belum diperbaiki. |
| 5.9 | 20 Oktober 2026 | **BUG-016 DITUTUP** (`c58e8c5`, merge `0de0285`), dan diverifikasi di peramban sungguhan alih-alih hanya dihijaukan uji. Rekap dihitung ulang dari tabelnya: 9 ditutup, 12 terbuka, Medium tinggal enam. **Temuan yang mengubah penilaian atas perbaikannya sendiri: peringatannya terbit lewat TENGGAT 15 detik, bukan lewat `onError`** — widget Cloudflare terlihat terpasang, tantangannya tak pernah selesai, dan `error-callback` tak pernah dipanggil sama sekali, jadi lapisan yang semula dianggap tambahan justru satu-satunya yang menyelamatkan kasus nyata. **Satu lulus palsu nyaris lolos**: `getByRole('alert')` di peramban ikut mencocokkan pengumum rute Next yang selalu ada dan kosong, sehingga jalan pertama melaporkan "muncul sesudah 0,0 detik" dengan teks hampa; jsdom tak memasang pengumum itu, jadi uji Jest tak kena. Dicatat pula di luar lingkup: tombol Kirim yang terkunci tidak terlihat terkunci. |
| 6.0 | 20 Oktober 2026 | **BUG-014 DITUTUP** (`6d9c24a`, merge `fc7877b`): kolom `survey_id` pada `notifications` beserta foreign key `ON DELETE CASCADE`, sebab tabel itu sebelumnya sama sekali tidak mengenal survei dan tautannya cuma teks `link`. Dua jalan lain ditolak dengan alasannya. Migrasinya mengisi mundur tetapi TIDAK menghapus baris tanpa induk yang sudah ada — keputusan itu bukan wewenang sebuah migrasi. Merahnya dibuktikan lebih dulu, dan dua kali merah karena sebab yang salah (galat kompilasi dari komentar yang menutup dirinya sendiri, lalu gerbang persetujuan PDP) sebelum merah pada `Expected: 0, Received: 2`. Rekap: 10 ditutup, 11 terbuka, Medium tinggal lima. **Pemanasan rute akhirnya TERUKUR** pada `next dev` yang baru: `isi-survei` 1,5 menit dengan 1 goyah menjadi 22,3 detik, `proteksi-route` 6,5 menit dengan dua percobaan ulang menjadi 1,4 menit tanpa percobaan ulang. **Kegoyahan `pilihDropdown` ditambal** dengan idiom yang sudah ada di `masuk.js` (klik sebelum hidrasi ditelan tanpa galat); buktinya terbatas pada enam eksekusi tanpa pengulangan, bukan jaminan. |
| 6.1 | 20 Oktober 2026 | **`main` DITARIK KE `tester`** (delapan commit, merge `63aadce`, nol konflik), dan dua pagar berhenti menjadi gagal-yang-diharapkan pada hari yang sama. BUG-016 sembuh sendiri lewat tarikan ini sebab `main` sudah mencabut `test.failing()`-nya; **pagar BUG-014 dicabut di sini**, sebab `notifikasi-siklus.spec.js` hidup hanya di cabang ini. Ramalan yang ditulis sejam sebelumnya terpenuhi persis: pagarnya dijalankan DULU dan menjawab `Expected to fail, but passed` dua kali, baru anotasinya dicabut — specnya tidak dihapus. Jalan kedua 4 lulus / kode=0 / 3,2 detik / nol percobaan ulang. **Bukti terkuatnya datang dari skrip pembersih, bukan dari ujinya:** `notifikasi tanpa induk : 0` sesudah dua pemusnahan survei, padahal tiga jalan sebelum perbaikan menyisakan 4, lalu 2, lalu 2 — uji memeriksa satu akun, skrip memeriksa seluruh tabel. Dicatat pula bahwa kalimat dalam anotasi yang dicabut itu keliru menyebut "penyapu", padahal yang kurang adalah bentuk tabelnya. Dua anotasi lain SENGAJA dibiarkan: BUG-018 dan BUG-019 masih terbuka. |
| 6.2 | 22 Oktober 2026 | **Enam temuan lahir dan ditutup pada hari yang sama (BUG-022 sampai BUG-027), dan hanya SATU di antaranya cacat produk.** Sapuan sepuluh spec Playwright yang belum pernah jalan di mesin ini menghasilkan 13 kegagalan; sesudah ditelusuri, nol cacat produk — enam dari nomor tiket tetap yang sudah tiada (BUG-023), tujuh dari dua cacat detektor yang menuduh markah sehat (BUG-024, BUG-025). **BUG-024 adalah yang paling merugikan, dan korbannya dokumen ini sendiri**: catatan sesi sebelumnya mendaftarkan "luberan tata letak 320px" sebagai utang PRODUK, atas dasar nama uji yang gagal alih-alih atas dasar apa yang dilaporkan asersinya; pengukuran membantahnya (`document.scrollWidth` 320 = `innerWidth` 320, nol piksel meluber). **BUG-022 cacat produk sungguhan dan dinilai High**: `RadioCard` menyembunyikan radionya dengan `hidden`, yang berarti `display: none`, sehingga sembilan unsur SKM wajib tak dapat dijawab sama sekali tanpa tetikus — `getByRole('radio')` mengembalikan nol pada halaman yang menampilkan empat pilihan. Cacat itu MUSTAHIL tertangkap Jest: jsdom tak memuat Tailwind, jadi di sana `hidden` tanpa akibat dan ujinya hijau justru pada keadaan rusak. **BUG-026 dan BUG-027 satu berkas**: `isi-survei-anonim.spec.ts` menyimpan empat harapan basi sekaligus dan tak satu pun pernah terbantah, sebab berkas itu selalu melewati dirinya tanpa `E2E_SURVEY_ANONIM_ID`; uji KENDALI-nya pun hampa — hanya menyatakan satu kalimat tidak ada, sehingga lulus sambil mencatat nol respons. Pengirimannya kini BERCABANG dengan sengaja, sebab Turnstile tak menerbitkan token di mesin ini (nol iframe, kunci situs terikat domain yang tidak memuat `skema.local`): menuntut 201 di sana merah palsu, melewatinya hijau palsu, jadi cabang yang benar-benar terjadi itulah yang diasersi sampai tuntas. Rekap DIHITUNG ULANG dari kolom Status, bukan dikurangi: 27 temuan, 20 ditutup, 7 terbuka (Medium tinggal BUG-019). Angka sebelumnya — "10 ditutup, 11 terbuka" — sudah basi sebelum hari ini dimulai, sebab lima baris Medium yang sudah bertanda `Ditutup` tak pernah ikut dihitung. **Cacat struktur tabel ini sendiri ikut dibereskan**: ENAM baris riwayat (5.6 sampai 6.1) menggantung DI ATAS judul `## 6` tanpa kepala tabel, sehingga tabel di bawah judulnya berhenti di 5.5 dan pembaca yang menggulir ke bawah melihat entri 19 Oktober sebagai yang terbaru; keenamnya dipindahkan apa adanya ke bawah judul dan diurutkan — 6.1 sempat tercatat sebelum 6.0. Dua pernyataan dalam entri ini sendiri sempat salah sebelum dikoreksi di tempat: jumlahnya ditulis lima, dan nomor 5.6 disebut tak pernah ada; keduanya dibantah oleh keluaran skrip pemindahnya, yang menyebut enam baris berikut nomornya satu per satu. Memindahkan baris tabel tidak membuktikan isinya benar — yang diperiksa hanya posisinya. |
| 6.3 | 22 Oktober 2026 | **BUG-028 lahir dan ditutup pada hari yang sama, dan ia cacat PRODUK — bukan cacat perkakas uji seperti lima dari enam temuan sebelumnya hari ini.** Berkas yang dikirim pada nama medan selain `lampiran` dijawab `500 Unexpected file field` berkode `INTERNAL_SERVER_ERROR`: galat klien yang disajikan sebagai kerusakan server, sehingga pemantauan melaporkan server rusak padahal servernya sehat. **Laporan pertama saya atas temuan ini kurang lengkap dan dikoreksi di sini**: saya mencatatnya sebagai satu kasus, padahal pengukuran menunjukkan LIMA kode multer terkena — `transformException` milik Nest 11.1.28 mencocokkan galat multer pada KALIMATnya memakai tabel yang disalin dari multer 1.x, sementara yang terpasang multer 2.4.0 yang mengganti satu kalimat dan menambah empat kode. Yang paling merugikan diam-diam bukan kasus yang ditemukan lebih dulu, melainkan `STREAM_DESTROYED`: pengunggahan yang terputus di jaringan ponsel goyah tercatat sebagai kerusakan server. Pemetaannya kini dikunci pada `error.code` sesuai perintah docblock multer sendiri, dan `LIMIT_FILE_SIZE` tetap 413 dengan uji tersurat. **Dua dari tiga pembuktian merahnya merah karena sebab yang SALAH** — `Tests: 0 total`, yaitu galat kompilasi, dan sebabnya ikut jadi temuan: `@types/multer@2.2.0` pun ketinggalan dari runtime-nya. Rekap dihitung ulang dari kolom Status: 28 temuan, 21 ditutup, 7 terbuka — angka terbukanya TIDAK berubah, sebab temuan ini ditutup pada hari ia lahir. |
| 6.4 | 22 Oktober 2026 | **BUG-019 DITUTUP (`3fb335f`, merge `e3ce3f8`), dan dengan itu tak ada lagi temuan Medium yang terbuka — pertama kalinya sejak dokumen ini dibuat.** Tujuh kode galat RFC 6749 §4.1.2.1 dipetakan ke kalimat milik aplikasi sendiri; `error_description` tak lagi menyentuh layar dan tetap tercatat di log. **Saran perbaikan dalam laporan aslinya tidak diikuti sepenuhnya, dan itu disengaja**: saran itu meminta kode galatnya ikut ditampilkan untuk kode tak dikenal, padahal `error` pun medan bebas 256 karakter, jadi memantulkannya hanya memperkecil cacatnya. **BUG-029 lahir dan ditutup pada hari yang sama**, ditemukan selagi BUG-019 dibaca: dua blok `catch` meneruskan `err.message` ke fragment yang sama, sehingga warga dapat melihat URL internal berikut `TypeError: fetch failed`, dan nama kunci seperti `helpdesk.ssoClientSecret`. **Rancangan pertama saya untuk BUG-029 salah dan dibatalkan**: saya menduga kebocorannya `Error` biasa, padahal `helpdesk-sso.client.ts` membungkus setiap kegagalan jaringan menjadi `ServiceUnavailableException` — aturan yang saya usulkan justru akan melewatkan kalimat yang bocor; fungsi beserta ujinya sempat ditulis, hijau, lalu dihapus. Batas yang dipakai STATUS: di bawah 500 lewat, 5xx diganti kalimat umum. **EMPAT uji yang sudah ada ternyata mengunci perilaku lama** dan keempatnya kontraknya diganti alih-alih asersinya dilonggarkan — termasuk `sso-unconfigured.e2e-spec.ts:65`, yang BUKAN uji basi melainkan keputusan sengaja dari tanggal lain beralasan "pesannya harus benar-benar memberi tahu apa yang kurang"; alasan itu dicatat utuh di tempatnya, bukan dihapus. **Dua uji lain memalsukan jenis galat**, melempar `Error` biasa di tempat produksinya melempar `ServiceUnavailableException` dan `ForbiddenException`, dan hijau hanya karena perilaku lama meneruskan apa saja. **Dua kali tersesat di `Tests: 0 total`** — galat kompilasi, bukan uji yang memerah: `expect` Jest tak menerima argumen pesan kedua seperti Playwright, dan fungsi yang belum ada perlu stub kompilabel lebih dulu. Pagar `sso-galat.spec.js` di cabang ini MASIH memakai `test.fail(true, ...)` dan itu benar, sebab `apps/api` di `tester` belum memuat perbaikannya (terukur: `pesanGalatSso` nol kemunculan); `main` karena itu dibekali pagarnya sendiri di `sso.e2e-spec.ts`, dibuktikan lewat mutasi. Rekap dihitung ulang dari kolom Status: 29 temuan, 23 ditutup, 6 terbuka — seluruhnya Low. Satu hal yang TIDAK dikerjakan dan masih terbuka: memagari pesan 5xx dengan `app.nodeEnv === 'production'` seperti `boleh-admin-opd.ts`, agar pengembang tetap melihat kunci yang kosong di peramban sementara warga tidak. |
| 6.5 | 22 Oktober 2026 | **BUG-030 lahir dan ditutup pada hari yang sama: sapuan proteksi route membaca 502 sebagai keputusan `proxy.js`.** Ia menyimpulkan izin akses dari ALAMAT AKHIR navigasi dan tak pernah memeriksa status respons, sementara halaman galat server tinggal di alamatnya sendiri. Arah merah palsunya sudah terjadi malam itu — tiga rute admin dilaporkan terbuka bagi responden, dan hanya cuplikan halaman `502 Bad Gateway` dari nginx yang membantahnya; penegakan sesungguhnya tetap hijau di `peran-matriks-rbac` 11 uji. **Arah yang lebih berbahaya hijau palsu**: bila rute yang 502 kebetulan sama dengan alamat yang diharapkan, matriksnya cocok dan sapuan itu LULUS tanpa memeriksa apa pun. Pagarnya memilih kasus itu — memalsukan 502 pada `/` di kolom `tanpaToken` — dan sebelum perbaikan dijawab `Received promise resolved instead of rejected`. Status kini diasersikan kosong sebelum matriksnya dinilai, sealasan dengan pengintai 429 yang sudah ada. **Perbaikannya membuktikan diri pada pemakaian sungguhan**: jalan berikutnya berbunyi `/admin-opd/dashboard → HTTP 502` alih-alih menuduh RBAC jebol. **Dua hal yang TIDAK terbukti dan ditulis apa adanya**: (1) ketika pagar ini di awal berkas, dua percobaan uji `responden` kehabisan 150 detik di `masukSebagai` padahal lulus 30,8 detik bila sendiri — batas laju hanya dugaan, sebab artefaknya sudah terhapus; pagarnya dipindah ke akhir. (2) Mengapa pemanasan `/surveys/[id]` tidak mencegah timeout `isi-survei.spec.js` tetap tak terjawab: ketiga rute yang dapat saya ukur sudah terkompilasi (`header` ≈ `tuntas`, 0,04–0,48 detik), dan memaksa keadaan dingin menuntut memuat ulang server dev milik pengguna. Yang terukur hanya bahwa `pemanasan.js:41` tak pernah membaca badan responsnya. Rekap dihitung ulang dari kolom Status: 30 temuan, 24 ditutup, 6 terbuka — seluruhnya Low. |
| 6.6 | 23 Oktober 2026 | **BUG-018 DITUTUP (`77da88b`, merge `2c2bb47`), dan temuan terbuka tinggal lima — seluruhnya Low.** Resep dalam laporan aslinya diikuti apa adanya: penerimanya dipersempit, bukan panggilannya dibuang. `notifyOpdTujuan` dipisahkan dan dipakai dua pemanggil, sehingga kalimat untuk OPD tetap satu tempat. **Cacatnya ternyata DUA, bukan satu**: selain penyiaran ganda, `notifyKabupaten(excludeUserId, ...)` dipanggil dengan `complaint.userId` yaitu PELAPOR, padahal pelaku penerusan adalah admin kabupaten — ia mengabari dirinya sendiri. Terukur pada uji merah: dua baris notifikasi identik, tiket sama, pengguna sama, berselang 59 milidetik. Admin Kabupaten LAIN tetap dikabari dengan kalimat yang benar dan pelakunya dikecualikan, atas persetujuan tersurat pengguna. **Satu uji lama yang BUKAN basi ikut diganti kontraknya**: "TIDAK mengabari kabupaten: ia pelaku penerusannya, jadi sudah tahu" — keputusan sengaja 7 Oktober 2026, yang alasannya benar bagi PELAKUNYA saja dan mengasersikan mekanisme alih-alih keputusan; alasan lamanya dicatat utuh. **Satu kelemahan pembuktian ditulis apa adanya**: uji "pelaku tidak dikabari" lulus HAMPA pada jalan merah sebab kabar itu belum ada sama sekali; yang membuktikannya bekerja mutasi, yang memerahkannya dengan `id: {not: 10}` alih-alih `99`. Pengamatan lama "pelapornya sendiri tidak diberi tahu" ternyata sudah terjawab sejak 7 Oktober 2026 lewat `complaint_forwarded` kepada pelapor. Pagar `notifikasi-siklus.spec.js` di cabang ini masih `test.fail(true, ...)` dan itu benar, sebab `apps/api` di `tester` belum memuat perbaikannya (terukur: `notifyOpdTujuan` nol kemunculan). Rekap dihitung ulang dari kolom Status: 30 temuan, 25 ditutup, 5 terbuka. |
| 6.7 | 23 Oktober 2026 | **BUG-011 dan BUG-012 DITUTUP (`6b8ee7e`, merge `4a39ac4`), BUG-010 ditutup TANPA perubahan kode, dan temuan terbuka tinggal DUA — BUG-003 dan BUG-007, keduanya Low.** BUG-011: `.trim()` ditambahkan di `admin-kab/opd/page.jsx:28`, satu kata, persis yang diharapkan laporannya. BUG-012: kalimat laporan sinkron kini menyebut lima angka, dan bannernya berubah kuning bila yang dilewati lebih dari nol — kontras `amber-700` di atas `amber-50` DIUKUR 4,84:1, lulus WCAG AA, sejajar emerald yang 5,21:1. Nol pun disebut tersurat atas persetujuan tersurat pengguna, sebab kalimat yang menghilangkan angkanya saat nol tak dapat dibedakan dari yang sekadar tidak melaporkannya. **Cacat berdampingan ikut diperbaiki**: banner itu tak punya `role` apa pun, sehingga sinkronisasi menghasilkan KESUNYIAN bagi pembaca layar; diberi `role="status"` yang sopan, bukan `alert` yang di basis kode ini khusus untuk galat. **BUG-010 ternyata sudah diperbaiki enam minggu sebelumnya** oleh `7bc0b83` — sambil lalu, saat halaman riwayat notifikasi ditulis, bukan sebagai penutupan temuan — dan namanya sudah terkunci empat asersi di dua berkas uji. Statusnya tertinggal `Baru` karena tak ada yang memeriksa ulang, jadi rekap dokumen ini menghitungnya terbuka selama itu. Yang benar-benar berubah satu uji: TC-FE-013 berhenti menebak tombol lewat posisi (`querySelectorAll('button')[1]`) dan memakai `getByLabelText('Halaman berikutnya')` — perapian uji, BUKAN bukti perbaikan, sebab ia hijau pada jalan pertama. **Satu kelemahan pembuktian dicatat apa adanya**: kedua uji BUG-012 memerah pada `role` yang belum ada, jadi asersi TEKS-nya tak pernah dijalankan pada jalan merah; yang membuktikannya bekerja mutasi sesudah hijau. **Satu cacat sejenis BUG-010 TIDAK ditutup dan belum dicatat sebagai temuan**: tombol lipat sidebar (`AdminSidebar.jsx:125`, `AdminKabSidebar.jsx:141`) bernama lewat `title`, bukan `aria-label` — sah menurut spesifikasi accname tetapi pilihan terakhir, dan tak pernah muncul di peranti sentuh. Rekap dihitung ulang dari kolom Status: 30 temuan, 28 ditutup, 2 terbuka. |
| 6.8 | 23 Oktober 2026 | **BUG-031 lahir dan ditutup pada hari yang sama (`28574df`, merge `33b70d4`), sementara BUG-007 SENGAJA tetap terbuka walau separuhnya diperbaiki.** BUG-031: zona lampiran pada formulir pengaduan warga sebuah `div` ber-`onClick` tanpa `tabIndex`, `role`, maupun `onKeyDown`, dengan inputnya `display: none` — jadi warga pemakai keyboard TIDAK DAPAT melampirkan bukti sama sekali. Dinilai Medium (nomor dan derajatnya usulan penguji) sebab komponennya dirender di `/complaints/new` DAN beranda publik. Yang membuatnya pantas jadi temuan sendiri: cacat ini **sudah pernah diperbaiki 21 September 2026** di `AdminResolutionWorkspace.jsx` dan `ChatReplyForm.jsx`, berikut kalimatnya yang masih terbaca di sana — "itu fungsi yang hilang, bukan sekadar nama yang kurang" — dan dropzone warga terlewat sebulan. Diperbaiki menjadi `<button>` sungguhan, bukan `div` ber-`role="button"` + `tabIndex`, berikut dua konsekuensinya: isinya `<span>` sebab `<button>` hanya boleh memuat phrasing content, dan inputnya dipindah keluar sebab elemen interaktif bersarang dalam `<button>` bukan HTML yang sah. Tombol hapus diberi nama yang menyebut berkasnya. **BUG-007 hanya separuh**: jalur warga beres (jenis, ukuran, dan batas 5 berkas diperiksa di satu fungsi yang dipanggil KEDUA jalur — pemilih berkas dan seret-lepas, sesuai butir 3 pengukuran 21 Oktober; yang sah tetap diterima; penolakannya ber-`role="status"`; WEBP disebut; "File berhasil diunggah" menjadi "Siap dikirim"; prop `accept` dibuang sebab ia jebakan), tetapi `AdminResolutionWorkspace.jsx` dan `ChatReplyForm.jsx` MASIH `setFile(e.target.files[0])` tanpa pemeriksaan dan masih tanpa `accept`. Kolom Peran baris itu menyebut tiga peran dan dua di antaranya belum tersentuh, jadi menandainya Ditutup akan tidak benar. **Satu uji lama diganti kontraknya**: "membuang hanya berkas yang ditekan silangnya" memakai `getAllByRole('button')[1]` dan indeksnya bergeser begitu zonanya menjadi tombol — ia menebak lewat POSISI, persis yang diramalkan laporan BUG-010, dan diperbaiki dengan cara yang sama. Sembilan uji baru, seluruhnya merah lebih dulu dengan alasan yang benar. Suite web 217 suite / 1803 uji, dari 1794 — nol uji lama patah. Rekap dihitung ulang dari kolom Status: 31 temuan, 29 ditutup, 2 terbuka (BUG-003 dan BUG-007, keduanya Low). |
| 6.9 | 23 Oktober 2026 | **BUG-032 dan BUG-033 lahir dan ditutup pada hari yang sama (`ec1bf88`, merge `e45878a`), keduanya dari perburuan bug atas perubahan yang baru berumur beberapa jam.** Sasaran perburuannya `FileDropzone.jsx` yang ditulis hari itu untuk BUG-007 dan BUG-031, dan laporannya ada di `qa-bug-hunt/` yang TERABAIKAN git — berkasnya hidup hanya di mesin tempat perburuan dijalankan, jadi isinya diringkas ke sini. **BUG-032**: ukuran diformat `toFixed(2)` yang membulatkan ke TERDEKAT, sehingga berkas 5 MiB + 5.000 byte menghasilkan kalimat "ukurannya 5.00 MB, melebihi batas 5MB" — penolakannya benar, kalimatnya tidak. Low tetapi berjangkauan luas: batasnya 5 MiB sementara foto ponsel lazimnya 4–6 MB, jadi inilah golongan yang paling sering ditolak. Diperbaiki dengan satu pemformat untuk kedua tempat dan pembulatan ke ATAS pada kalimat penolakan saja, sebab kalimat itu membuat perbandingan sementara daftar berkas sekadar melaporkan. **BUG-033**: `JENIS_DITERIMA[file.type]` pencarian pada objek literal, jadi ia ikut menemukan anggota `Object.prototype` — `constructor` dan `__proto__` LOLOS gerbang jenis yang baru dipasang untuk menolaknya. Batasnya diukur: hanya dua untai itu, sebab konstruktor `File` membakukan `type` ke huruf kecil, dan satu uji KENDALI merekam fakta itu. Tanpa dampak keamanan (backend memeriksa angka ajaib isi berkas) dan tak dapat ditempuh dari pemilih berkas biasa. Diperbaiki dengan `Object.create(null)`, bukan menjaga satu tempat pemanggilan, supaya SETIAP pencarian ikut benar. **Pagar regresinya DIPINDAHKAN** dari `qa-bug-hunt/repros/` ke `KitUiBersama.test.jsx`: folder itu mengabaikan dirinya sendiri, jadi satu-satunya uji yang membuktikan kedua cacat ini pernah ada akan hilang dari repo begitu perbaikannya di-commit. Empat dari lima pagar merah lebih dulu; yang kelima kendali. Reproduksi asli perburuan dijalankan ulang sesudah perbaikan sebagai pemeriksaan silang dan menghijau 6/6. Suite web 217 suite / 1808 uji, dari 1803. `.gitignore` akar ikut tercatat atas permintaan pengguna — baris `qa-bug-hunt/` sudah ada di pohon kerja dan bersifat rangkap, dan akhiran berkasnya yang tanpa baris baru dibetulkan. Rekap dihitung ulang dari kolom Status: 33 temuan, 31 ditutup, 2 terbuka (BUG-003 dan BUG-007). |
| 7.0 | 23 Oktober 2026 | **BUG-007 DITUTUP SELURUHNYA (`87a8eed`, merge `bede540`), dan temuan terbuka tinggal SATU — BUG-003, Low, kode mati.** Separuh yang tersisa dikerjakan beberapa jam sesudah catatan "sengaja tetap terbuka" ditulis pada hari yang sama. Aturan lampiran DIANGKAT KELUAR menjadi `apps/web/src/utils/lampiran.js`, bukan disalin: sebelumnya ia hidup di dalam `FileDropzone.jsx`, dan menyalinnya ke dua komponen percakapan akan menjadikannya TIGA salinan batas backend yang tak ada penyinkronnya. `periksaSatuBerkas` pembungkus tipis di atas `saringBerkas`, bukan aturan kedua yang mirip, sebab kedua panel menerima satu berkas dan batas jumlah tak berlaku di sana. `BATAS_MB` jadi sumber tunggal, dan baku prop `maxSizeMB` di `FileDropzone` diambil dari sana. **Pemindahannya terbukti netral**: 37 uji `FileDropzone` tetap hijau tanpa satu uji disunting. Pada kedua panel: `accept` dipasang, `periksaSatuBerkas` dijalankan sebelum berkasnya dipasang, penolakannya ber-`role="status"`, dan nilai input direset supaya berkas BERNAMA SAMA dapat dipilih lagi sesudah diperkecil. Dua cacat samping ikut dikerjakan atas persetujuan tersurat pengguna: tombol hapus di kedua cip tak pernah bernama (kelas BUG-010), dan ukuran masih bertitik sementara `formatMb` dari BUG-032 berkoma. Sepuluh pagar baru, seluruhnya merah lebih dulu. **Tiga kekeliruan penguji dicatat apa adanya**: pola berbaris banyak gagal karena SPASI DI UJUNG BARIS yang tak terbawa ke berkas skrip (penjaga memerah, nol berkas tersentuh); komentar JSX disisipkan DI DALAM tag `<button>` sehingga `Tests: 0 total` yang dibaca sebagai galat kompilasi, bukan uji merah; dan satu asersi HAMPA (`queryByText('foto.jpg')` menemukan nama berkas di kabar penolakan, bukan di cip lampiran) yang penggantinya dibuktikan membedakan lewat mutasi. Suite web 217 suite / 1818 uji, dari 1808. Rekap dihitung ulang dari kolom Status: 33 temuan, 32 ditutup, 1 terbuka. |
| 7.1 | 23 Oktober 2026 | **BUG-003 DITUTUP (`2daf59b`, merge `060a3b9`), dan daftar ini NOL TERBUKA untuk pertama kalinya sejak dibuat 12 Agustus 2026 — 33 temuan, 33 ditutup.** BUG-003 temuan tertua yang masih terbuka, dicatat pada hari dokumen ini lahir, sebelum sesi eksploratori pertama dimulai. `MapSection.jsx` dihapus, bukan dipertahankan dengan catatan, DAN alternatif kedua yang laporan itu sendiri tawarkan diperiksa lebih dahulu: tak ada catatan rencana, dan pencarian "peta", "maps", "lokasi kantor", serta "google map" di README maupun PRD menghasilkan NOL sebutan. Diperiksa ulang sebelum menghapus, bukan dipercayai dari laporannya — satu kemunculan di seluruh repo, yaitu definisinya sendiri — dan keempat saudaranya di `components/sections/` semuanya hidup, jadi yang mati komponennya saja. Riwayatnya satu commit, `7bd05d1`, integrasi frontend awal: ia datang bersama impor itu dan tak pernah dipasang. **Ada alasan kedua di luar kode mati**: berkas itu satu-satunya `<iframe>` di seluruh `apps/web/src`, jadi membuangnya menghapus satu-satunya sematan pihak ketiga di frontend — `maps.google.com`, yang memasang cookie dan menerima rujukan lewat `referrerPolicy="no-referrer-when-downgrade"`. Dapat dipulihkan dari `7bd05d1`. Suite web tetap 217 suite / 1818 uji sesudah penghapusan, angka yang sama dengan sebelumnya, jadi tak ada berkas uji yang mengimpornya. Rekap dihitung ulang dari kolom Status: 33 baris, 33 Ditutup, nol Baru. |
| 7.2 | 26 Oktober 2026 | **BUG-034 lahir dan ditutup pada hari yang sama (`ce1e455`, merge `9d2258f`): 34 temuan, 34 ditutup, nol terbuka.** Dari perburuan bug kedua (QA-H2) atas pekerjaan 23 Oktober sore yang belum pernah diburu. Modul baru `utils/lampiran.js` sendiri tak menghasilkan temuan — enam dugaan diperiksa dan gugur — dan yang tertangkap justru akibat perbaikan BUG-031 yang baru berumur tiga hari: `aria-label` tombol hapus dibangun dari `file.name` sementara daftar tak menyaring kembar, sehingga dua lampiran bernama sama menghasilkan dua tombol "Hapus bukti.png" yang tak terbedakan. Daftar berkembar itu perilaku LAMA; nama aksesibelnya yang BARU — sebelumnya kedua tombol sama-sama tak bernama, sesudahnya bernama sama. Diperbaiki dengan nomor urut (`Hapus lampiran 2: bukti.png`), selalu disertakan supaya nama tak berubah saat lampiran lain ditambahkan. **Penolakan kembar sengaja TIDAK dikerjakan**: itu keputusan produk dan tetap terbuka untuk pemilik produk. Kedua panel percakapan tidak diubah sebab menampung satu berkas. Pagarnya dipindah ke `KitUiBersama.test.jsx`. **Pemeriksaan silang dengan repro asli 1/3, bukan 6/6 seperti BUG-032/033**, sebab repro itu mengodekan format nama lama secara harfiah; peralihan sebabnya dari "Found multiple elements" ke "Unable to find" justru bukti perbaikannya, dan repronya sengaja tak disunting. Suite web 217 suite / 1820 uji, dari 1818. Rekap dihitung ulang dari kolom Status: 34 baris, 34 Ditutup, nol Baru. |
| 7.3 | 26 Oktober 2026 | **BUG-035 dan BUG-036 lahir dan ditutup pada hari yang sama (`e58b3c3`, merge `c307179`): 36 temuan, 36 ditutup, nol terbuka.** Keduanya cacat perkakas uji, dicatat di bagian 5 seperti BUG-030. Sapuan Playwright penuh pertama sejak perubahan 23–26 Oktober menjawab 131 lulus, 0 gagal, 6 terlewat — dan **keenam lewatan itu tak satu pun karena data**. Lima uji (poster QR; modal bagikan dan konfirmasi hapus di 320px dan 390px) mencari tombol yang sejak `22b2d03`, 30 September, pindah ke menu titik-tiga, lalu melewati diri lewat `count() === 0` dengan alasan "tak ada survei" sementara lima survei aktif ada; hampir empat minggu ketiga perilaku itu tak terukur. Satu uji lagi terlewat karena fixture mencocokkan `draf` padahal enum-nya `draft`. Helper `cariButirAksi` membuka menu baris demi baris; kedua uji modal kini juga mengasersikan modalnya TERBUKA, sebab pengukuran luberan lulus pula atas halaman tanpa modal — dibuktikan lewat mutasi, 4 dari 4 merah. Draf dibuktikan dua arah dengan draf yang ada di basis data. Dua uji goyah sapuan itu (tersangkut di layar "Memuat …", hijau saat diulang) tidak dikejar, sesuai catatan kegoyahan yang sudah ada. Pengamatan samping: `ShareSurveyModal` belum ber-`role="dialog"`, belum bernomor. Tak ada kode produk yang berubah. Rekap dihitung ulang dari kolom Status: 36 baris, 36 Ditutup, nol Baru. |
| 7.4 | 26 Oktober 2026 | **BUG-037 lahir dan ditutup pada hari yang sama (`c0df858`, merge `7031772`): 37 temuan, 37 ditutup, nol terbuka.** Asalnya pengamatan samping BUG-035, yang kini menunjuk nomor ini. `ShareSurveyModal` tanpa `role="dialog"`/`aria-modal`/nama, tombol silangnya tanpa nama, dan fokusnya tak masuk maupun dikurung — tiga cacat yang sudah dibereskan di dialog lain lewat BUG-015 dan terlewat di sini. Diperbaiki dengan pola `ConfirmActionModal`; empat uji merah lebih dulu, kedua uji fokus dibuktikan lewat mutasi, dan uji E2E-nya kini mencari modal lewat perannya. Pada hari yang sama `/pilih-peran` mendapat uji pertamanya (`330b1e4`, delapan uji, tiga mutasi semuanya merah); itu cakupan uji, bukan temuan, jadi tak bernomor. Rekap dihitung ulang dari kolom Status: 37 baris, 37 Ditutup, nol Baru. |
| 7.5 | 26 Oktober 2026 | **BUG-038 lahir dan ditutup pada hari yang sama (`0855ee1`, merge `5907832`): 38 temuan, 38 ditutup, nol terbuka.** `/persetujuan` membaca `me.role`, medan yang tak ada di `GET /auth/me` sejak peran jamak, sehingga yang tak perlu menyetujui diantar ke beranda publik. Ditemukan karena uji pertama halaman itu memerah, saat tujuan `window.location.assign` di lima tempat dibuat teruji lewat tujuan berupa fragmen. Sebelumnya `RoleLoginPicker.test.jsx` (`bbd6ab0`) membawa tiruan `window.location` yang tak pernah berlaku di jsdom 26; itu bukan cacat produk dan tak bernomor. |
| 7.6 | 27 Oktober 2026 | **BUG-039 dan BUG-040 ditutup: 40 temuan, 40 ditutup, nol terbuka.** BUG-039 (`53d5ab8`, merge `bef537e`): modal Buat/Ubah Survei tanpa peran dialog, nama, tombol tutup bernama, dan kurungan fokus — kelas BUG-037, ditemukan probe Playwright. BUG-040 (`9fa2f63`, merge `93d3370`): lima sisa `max-w-*` yang dibajak token spasi, diukur di Chrome sebelum dan sesudah, kini dijaga penyisir `tanpaMaxWTokenSpasi.test.js`. |
| 7.7 | 27 Oktober 2026 | **BUG-041 ditutup: 41 temuan, 41 ditutup, nol terbuka.** BUG-041 (`69f5b08`, merge `31c9679`): `className` pemanggil `Badge` kalah oleh kelas bawaan; diperbaiki lewat `utils/cn.js`, penggabung kelas yang mengenal token tema, dan delapan pemakai `twMerge` polos ikut dipindah. |
| 7.8 | 27 Oktober 2026 | **BUG-042 ditutup: 42 temuan, 42 ditutup, nol terbuka.** BUG-042 (`3a2eb56`, merge `7b6412b`): tombol ciut sidebar dan tombol menu ponsel kini membawa `aria-expanded` + `aria-controls` ke `<aside>` sidebar; kelas cacat BUG-037/039. |
| 7.9 | 27 Oktober 2026 | **BUG-043 dan BUG-044 ditutup: 44 temuan, 44 ditutup, nol terbuka.** Sapuan tombol buka/tutup sesudah BUG-042 (21 tombol, delapan cacat), `5f259da`, merge `eaf3587`: hamburger dashboard warga tanpa nama (BUG-043, Medium) dan tujuh tombol tanpa `aria-expanded` (BUG-044). |
| 7.10 | 27 Oktober 2026 | **BUG-045 ditutup: 45 temuan, 45 ditutup, nol terbuka.** Pertanyaan FAQ berupa `<h3>` di dalam `<button>` (catatan BUG-044), `4e2217a`, merge `e91aaeb`: judul kini membungkus tombol, tampilan identik di Chrome. |
| 7.11 | 27 Oktober 2026 | **BUG-046 ditutup: 46 temuan, 46 ditutup, nol terbuka.** Tujuh lencana 10px tumbuh 1,67px sejak BUG-041 karena jarak baris `text-xs` ikut terbuang, `edd6823`, merge `2278c31`: kembali ke 17,33 / 21,33 / 25,33px, terukur di Chrome. |
| 7.12 | 27 Oktober 2026 | **BUG-047 ditutup: 47 temuan, 47 ditutup, nol terbuka.** Nilai Survei "4,00 / 4 · Sangat Puas" satu potong nowrap meluapkan tabel survei Admin Kabupaten 58px di 1366px dan keluar dari kotak kartu Admin OPD, `af243aa`, merge `7868221`: dua potong yang patah di antaranya. |
| 7.13 | 28 Oktober 2026 | **BUG-048 ditutup: 48 temuan, 48 ditutup, nol terbuka.** Aksi Teruskan (95x29) dan Monitor Tiket (122x31 di desktop) di daftar pengaduan Admin Kabupaten di bawah 44px, Monitor Tiket `<button>` di dalam `<Link>`, `e078f29`, merge `9000688`. |
| 7.14 | 28 Oktober 2026 | **BUG-049 lahir dan ditutup pada hari yang sama: 49 temuan, 49 ditutup, nol terbuka.** Kandidat injeksi rumus dari rencana uji keamanan (QA-SECURITY-UAT #3) terbukti lewat Excel di mesin pengembang: CSV dari `susunCsv` dan `toCsv` menghitung `=1+1` sebagai rumus bila dipecah per koma, sedangkan XLSX dari exceljs aman. Dinilai Medium, bukan High, karena Excel berpemisah `;` di mesin ini tidak menghitung bentuk yang diuji pada klik ganda. Diperbaiki dengan awalan petik tunggal di `csvEscape` dan `kutip`, dan tiga halaman daftar yang menyusun CSV sendiri dipindah ke `unduhCsv`, `74646df`, merge `68733cf`. |
| 7.15 | 28 Oktober 2026 | **BUG-050 dan BUG-051 lahir dan ditutup pada hari yang sama: 51 temuan, 51 ditutup, nol terbuka.** Uji asap injeksi SQL (QA-SECURITY-UAT #5) tak menemukan injeksi, tetapi menemukan `startDate`/`endDate` log audit yang menjawab 500 untuk teks bukan tanggal (BUG-050) dan `contains`/`equals` + `insensitive` Prisma yang menjadi ILIKE tanpa meloloskan `%` dan `_` (BUG-051), termasuk di pencocokan OPD dari klaim SSO. `bd247e2`, merge `7fc1f50`. |
| 7.16 | 29 Oktober 2026 | **BUG-052 ditutup: 52 temuan, 52 ditutup, nol terbuka.** Uji CSRF (QA-SECURITY-UAT #6) menemukan bahwa mutasi bercookie dari origin lain diterima, dengan SameSite=Lax sebagai satu-satunya penahan. Penjaga origin di `configureApp`, `c830db4`, merge `5cd1770`. Kodenya ditulis pengguna; dua upaya sebelumnya di sesi asisten terhenti sebelum berkas apa pun tersimpan. |
