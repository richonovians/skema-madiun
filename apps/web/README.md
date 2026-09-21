# apps/web

Frontend SKEMA: seluruh halaman yang dilihat warga, Admin OPD, dan Admin Kabupaten. Dibangun dengan Next.js (App Router) dan Tailwind CSS v4.

Penjelasan tentang produknya sendiri, siapa penggunanya, dan cara memasang seluruh sistem dari nol ada di [README akar repositori](../../README.md). Berkas ini hanya membahas bagian frontend.

## Menjalankan

Jalankan dari akar repositori, bukan dari folder ini, supaya backend ikut hidup:

```bash
pnpm dev
```

Lalu buka <http://skema.local>.

**Bukan `http://localhost:3000`.** Frontend dan backend disajikan pada satu alamat oleh reverse proxy. `NEXT_PUBLIC_API_URL` bernilai relatif (`/api/v1`), jadi membuka port 3000 langsung membuat setiap panggilan API jatuh ke Next.js dan dijawab 404. Aplikasinya tampil, tetapi kosong tanpa sebab yang jelas.

Konfigurasi frontend disalin dari contohnya:

```bash
cp .env.example .env.local
```

## Susunan folder

| Folder | Isi |
|---|---|
| `src/app` | Rute App Router. Satu folder per alamat, dikelompokkan per peran: `admin-kab`, `admin-opd`, `(respondent)`, dan halaman publik seperti `about`, `statistics`, `isi`. |
| `src/features` | Kode per domain: `surveys`, `complaints`, `dashboard`, `authentication`, dan seterusnya. Tiap domain memuat `components`, `services`, dan ujinya sendiri. |
| `src/components` | Dipakai lintas domain: `ui` (tombol, tabel, dialog), `layouts` (navbar, sidebar), `sections` (bagian halaman depan). |
| `src/services` | Klien HTTP dan pembungkusnya. |
| `src/hooks`, `src/utils`, `src/constants` | Penolong bersama. |
| `src/mocks` | Handler MSW untuk uji. |
| `src/proxy.js` | Penjaga rute sisi server. Mengarahkan pengguna ke area yang sesuai perannya berdasarkan cookie sesi. Ini kenyamanan navigasi, bukan lapisan keamanan: yang menegakkan hak akses tetap backend. |

## Aturan penulisan

- **JavaScript, bukan TypeScript.** Kode aplikasi ditulis `.js` dan `.jsx`, dan alias `@/` menunjuk ke `src/`. Hanya konfigurasi Playwright dan handler MSW yang memakai TypeScript.
- **Komentar ditulis bahasa Indonesia**, dan menjelaskan alasan sebuah keputusan diambil, bukan mengulang apa yang sudah terbaca dari kodenya.
- **Token desain ada di `src/app/globals.css`**, termasuk warna, jarak, dan tinggi navbar per peran.

Satu jebakan yang perlu diketahui sebelum menulis kelas Tailwind: berkas token mendefinisikan `--spacing-xs` sampai `--spacing-3xl`. Di Tailwind v4, nama itu satu ruang dengan utilitas lebar, sehingga `max-w-xs` di proyek ini bernilai **4px**, bukan 20rem seperti bawaannya. Tidak ada peringatan apa pun saat itu terjadi, elemennya hanya runtuh. Pakai nilai eksplisit seperti `max-w-[20rem]` bila yang dimaksud memang lebar.

## Uji

```bash
pnpm test              # seluruh uji
pnpm test -- NamaBerkas
pnpm test:watch
```

Jest dengan jsdom, React Testing Library, dan MSW untuk memalsukan jawaban API. Beberapa hal yang membedakannya dari setelan bawaan:

- **Tanpa `@testing-library/user-event`.** Interaksi ditulis memakai `fireEvent`.
- **jsdom tidak menghitung tata letak dan tidak mengevaluasi media query.** Uji di sini bisa memastikan sebuah kelas responsif terpasang, tetapi tidak bisa membuktikan sesuatu muat di layar. Bukti seperti itu harus datang dari pengukuran di peramban sungguhan.
- **React 19** menuntut pembaruan keadaan dibungkus `await act(...)` atau ditunggu lewat `findBy...`.

Uji ujung-ke-ujung memakai Playwright:

```bash
pnpm test:e2e
```

Dijalankan terhadap `http://skema.local` dan memakai Chrome yang sudah terpasang, jadi tidak perlu mengunduh peramban tersendiri. Docker dan `pnpm dev` harus sudah hidup lebih dulu. Origin dapat ditimpa lewat `E2E_ORIGIN`.

Spec pengisian survei tanpa sesi butuh satu survei aktif yang mengizinkan pengisian anonim, dan id-nya diberikan lewat env. Tanpa itu spec tersebut dilewati, bukan dinyatakan lulus:

```bash
E2E_SURVEY_ANONIM_ID=<id> pnpm test:e2e --workers=1
```

Dua spec mengukur hal-hal yang mustahil diuji di Jest, sebab jsdom tak menghitung tata letak dan tak memuat Tailwind sama sekali:

| Spec | Yang diukur |
|---|---|
| `responsif-komponen.spec.ts` | Apakah panel, laci, dan modal keluar layar; apakah ada isi melebar yang batang gulirnya disembunyikan; apakah ada sasaran sentuh di bawah 44px; apakah ada teks yang terpotong tanpa elipsis. Diukur pada 320px, 390px, 768px, 900px, 1440px, dan lanskap 844x390. |
| `nama-terakses.spec.ts` | Apakah tombol yang labelnya `hidden sm:inline` masih punya nama yang dapat diakses pada 320px. Di Jest pemeriksaan ini selalu hijau palsu: tanpa Tailwind, `hidden` tak berpengaruh dan labelnya tetap terbaca. |

Keduanya butuh sesi, dan sesinya diterbitkan sekali lewat `dev-login`:

```bash
E2E_IDENTIFIER=<email akun uji> pnpm test:e2e
```

Akunnya sebaiknya memiliki ketiga peran (warga, Admin OPD, Admin Kabupaten); tanpa `E2E_IDENTIFIER`, spec itu melewati dirinya sendiri dengan pesan yang menyebutkan caranya. Beberapa uji juga melewati dirinya sendiri bila basis data mesin Anda tak memuat contohnya — misalnya uji tombol "Publikasikan" yang menuntut satu survei berstatus draf.

Spec ini berjalan di atas basis data lokal Anda dengan data sungguhan — justru nama OPD yang panjang dan nomor tiket tanpa spasi itulah yang merusak tata letak. Aman karena setiap permintaan menulis dibatalkan di tingkat jaringan peramban, jadi modal konfirmasi hapus pun tak dapat mencapai server; dua uji terakhir di `responsif-komponen.spec.ts` membuktikannya, bukan memercayainya.

### Jalannya satu worker, dan itu disengaja

`playwright.config.ts` memaksa `workers: 1` di mana pun, termasuk di mesin sendiri. Empat peramban yang meminta rute berbeda serentak melampaui satu kompilator `next dev`, dan halamannya tersaji sebelum CSS dan bundel JS-nya jadi. Terukur 21 September 2026: dengan empat worker, tiga jalan berturut-turut menjatuhkan 4, lalu 2, lalu 1 uji yang **berbeda-beda**; dengan satu worker, 75 lulus dan tak ada yang gagal.

Bila suatu saat Anda tergoda menaikkannya lagi, ketahui dulu penyamarannya: beberapa uji memakai `test.skip((await tombol.count()) === 0, ...)`, sehingga tombol yang belum sempat dirender menjadi *dilewati*, bukan *gagal*. Jumlah kegagalan lalu tampak menurun tiap jalan padahal yang tak terukur tetap sama banyaknya. **Lewatan di atas tiga berarti curigai kompilasi, bukan data.**

### Sesudah menjalankan spec yang menulis

Suite responsif tak menulis apa pun, tapi spec lain (pengisian survei, pengaduan) meninggalkan baris sungguhan yang aplikasinya sendiri tak dapat menghapus kembali:

```bash
node apps/web/e2e/support/bersihkan-data-uji.mjs --dry   # lihat dulu
node apps/web/e2e/support/bersihkan-data-uji.mjs         # hapus
```

Ia hanya menghapus baris berpenanda `[UJI `, menolak jalan bila sambungannya bukan `skm_db` lokal (diperiksa dua sisi: URL yang diminta *dan* alamat server yang menjawab), dan tak pernah menyentuh `audit_logs` — jejak itu wajib menurut rancangan. Tambahkan `--tanpa-induk` untuk ikut menyapu notifikasi yang surveinya sudah dimusnahkan.

## Perintah lain

| Perintah | Kegunaan |
|---|---|
| `pnpm lint` | Memeriksa gaya penulisan kode |
| `pnpm build` | Membangun versi produksi |

Jangan menjalankan `pnpm build` selagi `pnpm dev` hidup. Keduanya menulis ke `.next`, dan hasilnya server pengembangan membalas 404 untuk semua halaman sampai dijalankan ulang.
