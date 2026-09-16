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

Perlu diketahui: `playwright.config.ts` masih memakai `baseURL` `http://localhost:3000`, alamat yang justru tidak melayani API di proyek ini. Selama itu belum diselaraskan ke `http://skema.local`, uji e2e yang menyentuh API tidak dapat diandalkan lewat konfigurasi ini.

## Perintah lain

| Perintah | Kegunaan |
|---|---|
| `pnpm lint` | Memeriksa gaya penulisan kode |
| `pnpm build` | Membangun versi produksi |

Jangan menjalankan `pnpm build` selagi `pnpm dev` hidup. Keduanya menulis ke `.next`, dan hasilnya server pengembangan membalas 404 untuk semua halaman sampai dijalankan ulang.
