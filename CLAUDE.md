# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Apa ini

SKEMA: Survei Kepuasan Masyarakat (SKM) dan pengaduan masyarakat untuk Kabupaten Madiun, pemilik produk Diskominfo. Monorepo pnpm. Bahasa kode, komentar, dan dokumen di repo ini adalah **bahasa Indonesia**; ikuti itu saat menulis komentar, pesan commit, maupun teks antarmuka.

Perhitungan IKM mengikuti PermenPANRB 14/2017: sembilan unsur baku U1 sampai U9, skala jawaban 1 sampai 4, dihitung di backend (`apps/api/src/modules/ikm`). Sembilan unsur itu template, bukan skema mati, dan OPD boleh menambah pertanyaannya sendiri.

Latar belakang produk, peran pengguna, dan alur lengkap ada di `README.md` dan `docs/PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md`. **Peringatan membaca PRD:** dokumen itu masih menyebut peran `superuser`, padahal peran itu dilebur ke `kabupaten` pada 15 September 2026 dan nilai enumnya dibuang (migrasi `20260915140000_lebur_superuser_ke_kabupaten`). Sekarang hanya ada tiga peran.

## Perintah

Prasyarat: Node 22+, pnpm 9+, Docker Desktop, dan baris `127.0.0.1 skema.local` di berkas hosts.

```bash
docker compose up -d                              # Postgres + nginx (aplikasi belum dikontainerkan)
pnpm install
pnpm --filter @skm-spm/api prisma:deploy          # terapkan migrasi
pnpm --filter @skm-spm/api db:seed                # data contoh, aman diulang
pnpm dev                                          # api :3001 + web :3000 paralel
```

Buka **`http://skema.local`**, bukan `http://localhost:3000`. Hanya lewat origin tunggal itu cookie sesi terbaca frontend maupun backend, dan hanya alamat itu yang cocok dengan `redirect_uri` terdaftar di SSO Helpdesk.

### Uji

```bash
pnpm test                                         # seluruh workspace

# apps/api unit (*.spec.ts di dalam src/)
pnpm --filter @skm-spm/api test
pnpm --filter @skm-spm/api test -- src/modules/auth/sso-identitas.mapper.spec.ts
pnpm --filter @skm-spm/api test -- -t "menolak nilai yang bukan string"

# apps/api e2e (test/*.e2e-spec.ts, maxWorkers 1, timeout 30s, pakai DB sungguhan)
pnpm --filter @skm-spm/api test:e2e
pnpm --filter @skm-spm/api test:e2e -- complaints.e2e-spec.ts

# apps/web komponen (Jest + jsdom + MSW)
pnpm --filter @skm-spm/web test -- --forceExit
pnpm --filter @skm-spm/web test -- GerbangPengisianBersesi --forceExit

# apps/web E2E (Playwright, workers 1, channel 'chrome' terpasang di mesin)
pnpm --filter @skm-spm/web test:e2e
pnpm --filter @skm-spm/web test:e2e -- e2e/isi-survei-anonim.spec.ts
```

**`--forceExit` wajib untuk Jest `apps/web`.** Tanpa itu prosesnya menggantung sesudah uji selesai ("Jest did not exit one second after the test run has completed"), dan menyalurkannya ke `tail` menyembunyikan seluruh keluaran sampai proses berakhir. Uji biasanya tuntas di bawah 10 detik; jika terlihat menggantung lebih lama, itu gejalanya, bukan ujinya yang lambat.

**Sesudah menjalankan suite E2E apa pun, bersihkan data uji:**

```bash
node apps/web/e2e/support/bersihkan-data-uji.mjs --dry   # lihat dulu
node apps/web/e2e/support/bersihkan-data-uji.mjs
```

Suite E2E menulis baris sungguhan (pengaduan, respons, notifikasi, berkas unggahan) yang aplikasinya sendiri tidak bisa menghapus kembali. Skrip ini hanya menghapus baris berpenanda `[UJI `, dan **tidak pernah menyentuh `audit_logs`** karena jejak itu wajib menurut rancangan.

### Lint dan format

```bash
pnpm lint                 # eslint seluruh repo
pnpm format:check         # prettier
```

`.prettierignore` **mengecualikan `apps/web`**. Jadi "prettier bersih" untuk berkas frontend selalu hampa; gaya kode frontend dikelola `eslint-config-next`. Jangan laporkan prettier sebagai bukti untuk perubahan di `apps/web`.

`husky` + `lint-staged` menjalankan `eslint --fix` dan `prettier --write` saat commit. **Berkas bisa berubah setelah Anda commit**, jadi hasil uji yang dijalankan sebelum commit tidak otomatis berlaku untuk isi yang tercatat. Verifikasi ulang terhadap pohon kerja pascacommit.

## Arsitektur

### Satu origin lewat nginx

`infra/nginx/dev.conf` menyatukan web (:3000) dan api (:3001) di `http://skema.local`, bentuk yang sama dengan produksi. Ini bukan kemudahan, melainkan prasyarat: cookie sesi dan `redirect_uri` SSO bergantung padanya.

### apps/api (NestJS 11, Prisma 6, Postgres)

Rantai permintaan yang perlu dipahami sekaligus, karena tersebar di beberapa berkas:

1. **`src/app.setup.ts`** memegang `configureApp()` dan dipakai **`main.ts` maupun seluruh berkas e2e**. Prefiks `/api/v1`, `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), helmet, CORS, `trust proxy`, serta penjaga dan penyaji `/uploads/*` semuanya di sini. Perubahan perilaku keamanan harus masuk ke berkas ini, bukan ke `main.ts`; menaruhnya di `main.ts` membuat e2e berhenti mewakili produksi.
2. **`ClassSerializerInterceptor` global dengan strategi expose-all**, dipadu `BaseEntity` yang melakukan `Object.assign(this, partial)`. Konsekuensinya penting: **setiap kolom baru di Prisma otomatis bocor ke klien** bila entity tidak mendeklarasikan medannya dan query Prisma tidak memakai `select`. Ini pernah terjadi sungguhan, `GET /auth/me` mengirimkan NIK, nomor HP, dan alamat sebagai ciphertext `enc:v1:` mentah. Medan internal ditandai `@Exclude()` **dan** `@ApiHideProperty()`.
3. **`ResponseInterceptor`** membungkus setiap respons sukses menjadi `{ success, statusCode, message, data, meta }`. `PaginatedResult` diangkat: `items` menjadi `data`, `pagination` masuk `meta`.
4. **`/uploads/*` bukan rute controller**, jadi `setGlobalPrefix` tidak mengenainya. Aksesnya dijaga URL bertanda tangan (`?exp=&sig=`), lalu isinya didekripsi dari amplop AES-256-GCM di middleware. Batasnya tersurat: **URL itu sendiri adalah kredensialnya**, ia tidak tahu siapa yang membukanya.
5. **Gerbang boot.** `periksaPenyimpanan()` berjalan sebelum apa pun mendengarkan porta. Aplikasi menolak menyala tanpa `DATA_ENCRYPTION_KEY` atau dengan `SESSION_JWT_SECRET` yang terlalu pendek.

Modul ada di `src/modules/`: `audit`, `auth`, `complaints`, `dashboard`, `ikm`, `notifications`, `opd`, `questions`, `reference`, `responses`, `surveys`, `turnstile`, `users`.

### Peran jamak dan isolasi OPD

`User.roles` adalah **`Role[]`**, bukan satu nilai. Sesi membawa klaim `act`, dan `CurrentUser.actingRole` itulah yang dipakai untuk semua keputusan akses. **Jangan memeriksa `user.role`**; medan itu sudah tidak ada.

Tiga titik penegakan, semuanya di `src/common/auth/`:

- `hasFullAccess(role)` di `role.util.ts` adalah **satu-satunya** definisi "boleh menembus batas OPD". Tambah peran berhak penuh di `FULL_ACCESS_ROLES`, jangan sebar `=== Role.kabupaten` ke berkas lain. (Docblock berkas ini masih bercerita tentang `superuser`; isinya sudah hanya `kabupaten`.)
- `opdWhereFilter(user)` menghasilkan fragmen `where` Prisma untuk query berdaftar.
- `assertOpdAccess(...)` untuk akses by-id. `targetOpdId === null` berarti sumber daya **tanpa tujuan**, misalnya pengaduan yang pelapornya tak tahu harus ditujukan ke mana; hanya peran berhak penuh boleh menyentuhnya.

Dekorator pendukung ada di `src/common/decorators/`: `@Roles`, `@Public`, `@CurrentUser`, `@AllowUnselectedRole`, `@Audit`, `@BatasPerSurvei`.

### Enkripsi at-rest

`src/common/crypto/`: `envelope.ts` (AES-256-GCM untuk lampiran), `kolom.ts` (`enkripsiKolom`/`dekripsiKolom`, berawalan `enc:v1:`, idempoten, `''` tetap `''`, teks polos dilewatkan apa adanya saat dekripsi), `kunci.ts` (`kunciData(config)`).

| Terenkripsi                                   | Tetap polos                                   |
| --------------------------------------------- | --------------------------------------------- |
| Lampiran pengaduan                            | `users.nama` (pencarian log audit memakainya) |
| `complaints.uraian`                           | `users.email`, judul pengaduan                |
| `complaint_replies.pesan`                     | nama dan nomor HP responden survei            |
| `users.nik`, `users.nomor_hp`, `users.alamat` |                                               |

Cara menyebutnya yang benar: "isi pengaduan dan percakapannya terenkripsi, identitas pelapor tidak."

**Kehilangan `DATA_ENCRYPTION_KEY` berarti kehilangan lampiran dan isi pengaduan secara permanen.** Cadangan tidak menolong karena terenkripsi kunci yang sama. **Jangan pernah mencetak nilai kunci** ke layar, log, tiket, atau percakapan; yang boleh ditampilkan hanya sidik jari SHA-256 (16 hex pertama). Prosedur lengkap, rotasi, dan runbook pemulihan ada di `docs/keamanan/enkripsi-at-rest.md`.

NIK disamarkan oleh `src/common/identitas/nik.ts` (`samarkanNik`) untuk jalur pengaduan, karena NIK di sana milik orang lain. Ada implementasi kedua yang sengaja terpisah di `apps/web/src/features/profile/adapters/me.adapter.js` untuk profil milik sendiri.

### SSO Helpdesk

Klaim datang dalam **dua bentuk dari penyedia yang sama**, dan ini terukur dari payload sungguhan:

- `GET /api/oauth/userinfo` bersarang: `demographics.nik`, `identity.phone_number`, `location.alamat`
- `GET /api/me` rata: `nik`, `phone_number`, `alamat`

Karena itu `src/modules/auth/sso-identitas.mapper.ts` memakai rantai cadangan bersarang-dahulu-lalu-rata lewat `ambilJalurKlaim`. Pengkodean nilainya juga tidak seragam: `jenis_kelamin` berisi `"Laki-laki"` di satu endpoint dan `"L"` di endpoint lain, dinormalkan `sso-jenis-kelamin.mapper.ts`.

Satu payload nyata memakai **tiga bentuk kekosongan sekaligus**: `null`, `''`, dan medan yang tidak dikirim. Perlakukan ketiganya sebagai tidak ada, dan jangan memaksa nilai bukan-string menjadi string (NIK 16 digit yang dikirim sebagai angka JSON sudah kehilangan nol di depan sebelum kode melihatnya).

`claims_supported` pada metadata penyedia adalah **petunjuk, bukan jaminan tertutup**. Pernah ada keputusan desain yang salah karena daftar itu dianggap lengkap, padahal payload sungguhannya memuat medan yang tidak terdaftar.

### apps/web (Next.js 16 App Router, React 19, Tailwind v4)

**JavaScript saja.** 394 berkas `.jsx`, nol `.tsx`. Aturan frontend yang berlaku ada di `apps/web/AGENTS.md` (diimpor oleh `apps/web/CLAUDE.md`):

- jangan membuat definisi tipe TypeScript, jangan membuat folder `/types`
- jangan mengubah struktur folder tanpa izin
- **semua panggilan API lewat `services`; komponen tidak pernah menyentuh backend langsung**

Arsitektur berbasis fitur: `src/features/<domain>/{components,services,adapters}`. Pembagian tugasnya penting:

- `services/*.api.js` memanggil HTTP lewat `@/services/api`
- `adapters/*.adapter.js` menerjemahkan bentuk entity backend menjadi bentuk yang dipakai komponen, **di satu tempat saja**, supaya perubahan kontrak backend cukup disunting di sana
- adapter **tidak mengarang nilai** untuk medan yang backend-nya belum ada

`src/proxy.js` (dulu bernama "middleware") menjaga halaman berdasarkan peran, membaca cookie `token` (jalur dev-login) atau `session` (jalur SSO, HttpOnly). Ini **hanya pengarahan UX**; penegakan sesungguhnya tetap `RolesGuard` di backend.

Uji komponen memakai MSW (`src/mocks`). `jest.config.js` mengecualikan `e2e/` karena nama `*.spec.ts` Playwright juga cocok dengan `testMatch` baku Jest.

Catatan: `AGENTS.md` berisi blok `nextjs-agent-rules` yang **ditulis ulang `next dev` setiap kali jalan**. Pohon kerja bisa terlihat kotor tanpa ada yang menyuntingnya; ikutkan blok itu dalam commit agar bersih, menghapusnya dari diff hanya membuatnya kembali.

### Yang tidak seperti kelihatannya

- `packages/shared-types/` **kosong**, hanya `.gitkeep`. README menyebutnya berisi tipe bersama; belum.
- `frontend/` di akar hanya menyisakan `node_modules` dan tidak dilacak git. Frontend yang hidup ada di `apps/web`.

## Aturan tetap

**Migrasi Prisma.** `prisma migrate dev` **tidak dipakai di repo ini**, meski skripnya ada di `package.json`. Tulis SQL migrasi dengan tangan di `apps/api/prisma/migrations/<timestamp>_<nama>/migration.sql`, lalu terapkan dengan `prisma:deploy`. Dua puluh delapan migrasi yang ada semuanya bertanggal tangan.

**Jangan `pnpm build` atau `next build` selagi `pnpm dev` hidup.** Keduanya menulis ke `.next` yang sama, dan akibatnya server pengembangan membalas 404 untuk semua halaman.

**Data uji hanya boleh masuk `skm_db` lokal.** Sebelum menulis apa pun, pastikan host, port, nama basis data, **dan server yang benar-benar menjawab**. Jangan pernah menulis data uji ke basis data produksi, dan jangan menyentuh akun milik pengguna.

**Jangan menghapus baris `audit_logs`.** Jejak itu wajib menurut rancangan.

**`docs/superpowers/` tidak pernah di-commit.** Dipalang di `.gitignore` dan `.git/info/exclude`.

**`.env` tidak pernah di-commit**, dan isinya tidak pernah dikutip ke percakapan. Hanya `.env.example` yang tercatat.

**Akhiran baris LF.** Ditegakkan `.gitattributes` (`* text=auto eol=lf`) dan `.prettierrc.json` (`endOfLine: "lf"`). Skrip yang menulis berkas di Windows harus menyatakan `newline="\n"` secara eksplisit; tanpa itu CRLF masuk tanpa ada yang memerah.

**`pnpm.overrides` di `package.json` akar sudah beralasan.** Blok `//overrides` dan `//tidak-di-override` menjelaskan tiap keputusan, termasuk dua paket yang **sengaja** tidak dinaikkan (`uuid` di `exceljs`, `deepmerge-ts` di CLI Prisma) karena jalur rentannya tak pernah dilewati. Jangan "memperbaiki" keduanya tanpa membaca alasannya.

## Keadaan yang belum tuntas

Beberapa hal sudah ditulis lengkap tetapi belum bisa dinyalakan karena menunggu pihak lain, dan itu bukan bug:

- **SSO Helpdesk** menunggu `client_id` dan `client_secret` dari tim Helpdesk. Sementara itu lingkungan pengembangan memakai jalur masuk sementara yang mati sendiri di produksi.
- **Captcha** (Cloudflare Turnstile) belum punya kunci produksi atas nama Diskominfo.
- **Docker** baru menjalankan basis data dan reverse proxy; backend dan frontend masih dijalankan langsung.
- **Daftar OPD** disinkronkan dari Helpdesk dan bersifat baca saja, tidak diketik manual.
- `/api/docs` (Swagger) **wajib dimatikan di produksi**.
