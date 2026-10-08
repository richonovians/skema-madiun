# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Apa ini

SKEMA: Survei Kepuasan Masyarakat (SKM) dan pengaduan masyarakat untuk Kabupaten Madiun, pemilik produk Diskominfo. Monorepo pnpm. Bahasa kode, komentar, dan dokumen di repo ini adalah **bahasa Indonesia**; ikuti itu saat menulis komentar, pesan commit, maupun teks antarmuka.

Perhitungan IKM mengikuti PermenPANRB 14/2017: sembilan unsur baku U1 sampai U9, skala jawaban 1 sampai 4, dihitung di backend (`apps/api/src/modules/ikm`). Sejak 8 Oktober 2026 survei punya `jenis`: `skm_permenpanrb` memuat U1 sampai U9 sejak dibuat dan unsurnya **tidak dapat dihapus atau diganti kodenya** (satu pertanyaan per unsur), sedangkan OPD hanya mengubah _kalimat_ pertanyaannya; `custom` (dulu `umum`, diganti namanya 8 Oktober 2026) bebas dan tanpa nilai IKM, tetapi menghasilkan **Nilai Survei** menurut `tujuan` (`kepuasan` | `evaluasi` | `penilaian`) dan `metodeNilai` (`rata_rata` = "3,40 / 4" | `indeks_persen` = "85%") yang WAJIB dipilih saat membuatnya dan boleh diganti sampai survei ditutup (hanya tampilan; skala tetap 1-4). Aturannya satu tempat: `apps/api/src/modules/ikm/nilai-survei.util.ts` (`hitungNilaiSurvei`, batas kategori seperempat-seperempat dan sama untuk semua OPD); backend mengirim objek jadi `nilaiSurvei` (`{judul, nilai, tampilan, kategori}`) dan frontend hanya menampilkannya lewat `NilaiSurvei.jsx`. **Jenis dapat diganti SATU arah, SKM → Custom**, lewat `PATCH /surveys/:id/jenis` (`ganti-jenis.util.ts`), hanya selagi survei **draf dan belum dijawab**: sembilan unsur dihapus, pertanyaan tambahan dipertahankan dan diurut ulang, tujuan + metode wajib; `PATCH /surveys/:id` tetap menolak `jenis` (400) dan Custom tak pernah menjadi SKM. Tabel survei Admin Kabupaten berkolom Jenis Survei dan Nilai Survei (kosong untuk SKM), dan Statistik & Laporan punya penyaring jenis (Semua/SKM/Custom, di klien lewat `saringSurveiJenis`). `tujuan`/`metodeNilai` ditolak (400) pada survei SKM, dan CHECK `surveys_nilai_survei_ck` hanya menjaga SKM tak membawanya -- `NULL` pada custom dibaca bawaan `kepuasan` + `rata_rata`. Aturan kerangka ada di `apps/api/src/modules/surveys/kerangka-unsur.util.ts`, dan nama unsur di laporan IKM diambil dari `kodeUnsur` (`namaUnsur()`), bukan dari `questions.teks` yang kini berisi kalimat buatan OPD. Pertanyaan tambahan di luar unsur tetap boleh dan tidak masuk hitungan IKM. **Label skala 1-4 boleh diganti sampai survei ditutup**, juga sesudah jawaban masuk (aksi `teks` di `survey-scope.util.ts`: jawaban skala menyimpan skor, bukan penunjuk ke baris opsi); opsi **pilihan ganda** tetap terkunci begitu ada jawaban.

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

**Dari ponsel di Wi-Fi yang sama, `skema.local` harus tetap dipakai** -- bukan
alamat IP laptop (7 Oktober 2026, laporan pengguna: masuk lewat SSO berhasil
lalu tersangkut di URL callback). Mengetik IP laptop membuat tiga hal gagal
beruntun, dan ketiganya di luar jangkauan kode:

1. `HELPDESK_SSO_REDIRECT_URI` bernilai `http://skema.local/api/v1/auth/sso/callback`
   dan Helpdesk mencocokkannya PERSIS, jadi peramban ponsel dipantulkan ke nama
   yang tak dapat ia terjemahkan;
2. pengalihan akhir backend dibangun dari `WEB_APP_URL`, yang juga `skema.local`
   -- inilah yang terlihat sebagai "tersangkut di URL callback";
3. cookie sesinya host-only (`SESSION_COOKIE_DOMAIN` sengaja kosong di dev),
   sehingga cookie yang terbit untuk `skema.local` tak pernah terkirim kembali
   ke `192.168.x.x` walau dua langkah pertama lolos.

Jalan keluarnya membuat ponsel ikut menerjemahkan `skema.local` ke alamat IP
laptop, lewat DNS lokal: entri DNS di router bila ia mendukungnya, atau sebuah
DNS kecil di laptop yang lalu dipasang sebagai DNS statis pada Wi-Fi ponsel.
Tak ada berkas hosts di ponsel tanpa akses root, dan menyalin `127.0.0.1` ke
sana pun salah -- alamat itu menunjuk ke ponsel itu sendiri. Dengan cara ini
tak ada nilai `.env` maupun baris kode yang perlu berubah, dan `redirect_uri`
yang terdaftar tetap cocok.

Alternatif tanpa DNS: pakai jalur dev-login di ponsel, yang memang disediakan
untuk pengembangan dan mati sendiri di produksi. Jalur SSO-nya tak teruji dari
ponsel, dan itu konsekuensi yang disengaja.

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
pnpm --filter @skm-spm/web exec playwright test e2e/isi-survei-anonim.spec.ts
```

**Playwright butuh akun ber-tiga-peran yang tertaut ke OPD:** `E2E_IDENTIFIER=seed-superuser`. `seed-admin-kabupaten` di-_soft-delete_ sejak 15 September 2026, sehingga `dev-login`-nya dijawab 404 "pengguna tidak ditemukan" -- itu bukan server yang rusak. `e2e/kerangka-unsur-tata-letak.spec.ts` hanya membaca; `e2e/kerangka-unsur-alur.spec.ts` MENULIS survei berpenanda `[UJI ` (bersihkan sesudahnya, lihat di bawah).

**Satu berkas E2E dijalankan lewat `exec playwright test`, BUKAN `test:e2e --`.**
Baris `pnpm --filter @skm-spm/web test:e2e -- e2e/<berkas>` pernah tertulis di
sini dan **tidak menyaring apa pun**: `--` berhenti di pnpm dan argumennya tak
sampai ke Playwright, sehingga seluruh 93 uji ikut jalan. Gejalanya menyesatkan
karena uji yang dimaksud memang ikut jalan dan lulus; yang tak terlihat adalah
92 uji lain yang ikut menulis baris ke basis data. Diperbaiki 7 Oktober 2026
setelah dua kali tanpa sengaja menjalankan suite penuh.

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

#### Peran `opd`: siapa yang boleh memberinya, dan kapan ia hangus

Dua aturan lahir 6 Oktober 2026 dan keduanya mudah dilanggar tanpa sengaja.

**Gerbang ASN hanya hidup di produksi.** `users.jenis_pengguna` (enum `asn` / `masyarakat`) disalin dari klaim Helpdesk `identity.user_type` pada setiap login. `UsersService` menolak **pemberian** peran `opd` kepada akun yang bukan `asn` — tetapi hanya ketika `app.nodeEnv === 'production'`, kunci yang sama dengan `NonProductionGuard`. Itu syarat tersurat pemilik produk: akun `seed-*`/`pending:*` masuk lewat dev-login, tak pernah melewati SSO, sehingga `jenis_pengguna` mereka tak akan pernah terisi dan di pengembangan mereka harus tetap bisa memegang peran `opd`. Aturannya ada satu kali di `boleh-admin-opd.ts` dan disalurkan ke antarmuka sebagai `UserEntity.bolehJadiAdminOpd`; **jangan menghitungnya ulang di frontend** — ia tak dapat mengetahui `NODE_ENV` backend. `null` berarti belum diberitahu, bukan "bukan ASN", dan di produksi tetap ditolak.

**Login dapat MENCABUT peran `opd`, dan hanya itu.** `sinkron-peran-opd.ts` mencabutnya bila klaim **hadir dan bertentangan**: OPD dari klaim berbeda dari `opd_id` tersimpan, atau `user_type` berbunyi `masyarakat`. Sisa peran kosong menjadi `[responden]`, `opd_id` baru tetap ditulis, dan pencabutannya masuk `audit_logs` sebagai `sso_cabut_peran_opd`. Keputusan 27 Agustus 2026 yang menolak sinkronisasi peran saat login **tetap berlaku**: klaim yang hilang tidak pernah mencabut apa pun, dan SSO tetap tak pernah menaikkan peran akun lama. Melonggarkan syarat "hadir dan bertentangan" berarti satu perubahan di sisi Helpdesk melucuti seluruh Admin OPD tanpa suara.

**Kolom barunya ikut bocor sendiri.** `jenis_pengguna` muncul di `GET /auth/me` begitu kolomnya lahir — terukur, bukan dikira: uji kebocorannya memerah sebelum penahannya ada. Ia `@Exclude()` di `MeEntity` maupun `UserEntity`; yang keluar hanya boolean `bolehJadiAdminOpd`.

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

Itu kini terukur, bukan sekadar peringatan. Metadata yang hidup di `https://helpdesk.madiunkab.go.id/.well-known/openid-configuration`, dibaca 4 Oktober 2026, mendaftarkan `claims_supported` hanya sebagai `sub`, `email`, `name`, `preferred_username`, `nickname`, `groups`, `role`. **`nik`, `phone_number`, `alamat`, dan `jenis_kelamin` tidak ada di daftar itu** — padahal keempatnya dipetakan `sso-identitas.mapper.ts` dari payload sungguhan dan berjalan. Jangan pernah memutuskan apa pun berdasarkan daftar itu; baca payloadnya.

`scopes_supported` juga hanya `openid profile email`, tanpa scope yang menampung data demografis. Hari ini payloadnya tetap mengirim NIK dan alamat, jadi tak ada yang rusak — tetapi bila penyedia suatu saat menegakkan scope secara ketat, pemetaan identitas berhenti bekerja tanpa ada satu pun perubahan di sisi kita. Gejalanya akan terbaca seperti bug di `sso-identitas.mapper.ts`, padahal bukan.

Dua fakta lain dari metadata yang sama. Issuer-nya **`https://api.madiunkab.go.id/api/oauth`**, bukan host `helpdesk.` yang dipakai portalnya; SSO dan portal tinggal di host berbeda. JWKS-nya memuat satu kunci: `RSA 2048`, `RS256`, `use: sig`, `kid: sso-key-1`.

### apps/web (Next.js 16 App Router, React 19, Tailwind v4)

**Jangan memakai `max-w-xs|sm|md|lg|xl|2xl|3xl`.** Tema mendefinisikan `--spacing-xs` sampai `--spacing-3xl`, dan di sini Tailwind memakai token spasi itu untuk `max-w-*`: `max-w-3xl` bernilai **64px**, bukan 48rem (terukur di Chrome 8 Oktober 2026; layar pemilih jenis survei menyempit jadi kolom 64px). Pakai nilai eksplisit seperti `max-w-[48rem]`. jsdom tidak memuat CSS, jadi cacat semacam ini hanya tertangkap Playwright.

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

**Migrasi Prisma.** `prisma migrate dev` **tidak dipakai di repo ini**, meski skripnya ada di `package.json`. Tulis SQL migrasi dengan tangan di `apps/api/prisma/migrations/<timestamp>_<nama>/migration.sql`, lalu terapkan dengan `prisma:deploy`. Tiga puluh tiga migrasi yang ada semuanya bertanggal tangan.

**Jangan `pnpm build` atau `next build` selagi `pnpm dev` hidup.** Keduanya menulis ke `.next` yang sama, dan akibatnya server pengembangan membalas 404 untuk semua halaman.

**Data uji hanya boleh masuk `skm_db` lokal.** Sebelum menulis apa pun, pastikan host, port, nama basis data, **dan server yang benar-benar menjawab**. Jangan pernah menulis data uji ke basis data produksi, dan jangan menyentuh akun milik pengguna.

**Jangan menghapus baris `audit_logs`.** Jejak itu wajib menurut rancangan.

**`docs/superpowers/` tidak pernah di-commit.** Dipalang di `.gitignore` dan `.git/info/exclude`.

**`.env` tidak pernah di-commit**, dan isinya tidak pernah dikutip ke percakapan. Hanya `.env.example` yang tercatat.

**Akhiran baris LF.** Ditegakkan `.gitattributes` (`* text=auto eol=lf`) dan `.prettierrc.json` (`endOfLine: "lf"`). Skrip yang menulis berkas di Windows harus menyatakan `newline="\n"` secara eksplisit; tanpa itu CRLF masuk tanpa ada yang memerah.

**`pnpm.overrides` di `package.json` akar sudah beralasan.** Blok `//overrides` dan `//tidak-di-override` menjelaskan tiap keputusan, termasuk dua paket yang **sengaja** tidak dinaikkan (`uuid` di `exceljs`, `deepmerge-ts` di CLI Prisma) karena jalur rentannya tak pernah dilewati. Jangan "memperbaiki" keduanya tanpa membaca alasannya.

## Keadaan yang belum tuntas

Beberapa hal sudah ditulis lengkap tetapi belum bisa dinyalakan karena menunggu pihak lain, dan itu bukan bug:

- **SSO Helpdesk** tidak lagi menunggu kredensial: `HELPDESK_SSO_CLIENT_ID` dan `HELPDESK_SSO_CLIENT_SECRET` sudah ada di `apps/api/.env` sejak 4 Oktober 2026. Yang belum pernah diperiksa adalah apakah alur masuknya tuntas dari ujung ke ujung — keberadaan kredensial sudah dipastikan, keberhasilan masuknya belum. Lingkungan pengembangan tetap menyediakan jalur masuk sementara yang mati sendiri di produksi.
- **Captcha** (Cloudflare Turnstile) belum punya kunci produksi atas nama Diskominfo.
- **Docker** baru menjalankan basis data dan reverse proxy; backend dan frontend masih dijalankan langsung.
- **Daftar OPD** disinkronkan dari Helpdesk dan bersifat baca saja, tidak diketik manual.
- `/api/docs` (Swagger) **wajib dimatikan di produksi**.
