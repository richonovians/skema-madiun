# Matriks Skenario Uji (Test Cases)

> **PERAN `superuser` SUDAH TIDAK ADA — dan dokumen ini pernah dua kali salah
> tentangnya, dalam arah yang berlawanan.**
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
> Dokumen ini memuat DUA kotak koreksi yang saling bertentangan, dan keduanya
> ditulis dengan niat baik: satu di Modul A menyatakan peran itu dihapus
> 5 Agustus, satu di Lampiran menyatakan peran itu dikembalikan 26 Agustus dan
> karenanya kasus-kasus ujinya "kembali sahih tanpa perlu diubah sama sekali".
> Keduanya benar pada hari ditulisnya, dan keduanya tidak benar sekarang. Masing
> masing kini memuat catatan silang di tempatnya.
>
> Disisir 13 Oktober 2026. Kasus uji yang harapannya kini salah **ditandai
> tersurat, tidak disunting diam-diam** — menulis ulang kasus uji secara senyap
> akan menghapus fakta bahwa cakupan ujinya berubah, dan itu justru yang perlu
> terlihat oleh siapa pun yang memakai dokumen ini sebagai daftar kerja.
>
> **Cakupannya dipetakan 14 Oktober 2026**, dan hasilnya mengubah sifat
> pekerjaannya: kasus-kasus yang ditandai itu **sudah tercakup suite e2e**, dan
> beberapa lebih keras daripada baris TC-nya sendiri. Jadi yang dikerjakan bukan
> menjalankan probe baru, melainkan mencocokkan isi uji yang ADA dengan deskripsi
> TC lalu menetapkan statusnya — aturan yang memang berlaku di proyek ini:
> cocokkan isi test dengan deskripsi TC sebelum menandai lulus.
>
> | TC | Status | Uji yang menanggungnya |
> | --- | --- | --- |
> | TC-USR-005 | ⛔ tak berlaku | `peran-kabupaten-penuh.e2e-spec.ts:108` — enum tak memuat `superuser`, tak ada akun memegangnya |
> | TC-USR-006 | ⚠️ harapan terbalik, **201** | `users.e2e-spec.ts:97` |
> | TC-USR-007 | ✅ pelaku berganti ke `kabupaten` | `users.e2e-spec.ts:97` |
> | TC-USR-008 | ⛔ tak berlaku | `ASSIGNABLE_ROLES` + uji enum di atas |
> | TC-USR-012 | ⛔ tak berlaku | uji enum; `assertSuperuser` tak ada lagi |
> | TC-USR-013 | ✅ | `peran-kabupaten-penuh.e2e-spec.ts:75` — responden → 403 |
> | TC-USR-014 | ✅ | `users.e2e-spec.ts:228` dan `peran-kabupaten-penuh.e2e-spec.ts:66` |
> | TC-SVY-003 | ✅ pelaku `kabupaten` | `surveys.e2e-spec.ts:92` |
>
> Buktinya suite itu sendiri, bukan probe sekali jalan: 40 berkas / 426 uji e2e
> terhadap `skm_uji`, dijalankan 13 Oktober 2026 terhadap kode yang **masih**
> HEAD `main` hari ini — commit sesudahnya hanya menyentuh berkas Markdown. **`skm_db` tidak disentuh**, dan karena itu tak ada data uji
> yang perlu dibersihkan — probe lewat server dev akan menulis akun dan survei
> yang `bersihkan-data-uji.mjs` tak dapat hapus, sebab ia hanya menghapus baris
> berpenanda `[UJI `.
>
> **Dua uji di antaranya memeriksa PESAN penolakan, bukan hanya statusnya, dan
> alasannya terukur.** Docblock `peran-kabupaten-penuh.e2e-spec.ts` mencatat uji
> mutasi: melepas `@Roles` dari controller **tidak** memerahkan uji yang hanya
> memeriksa 403, karena lapis kedua (`assertKabupaten` di service) menangkapnya —
> lapis pertama hilang tanpa satu pun uji yang mengeluh. Pola itu yang pantas
> ditiru untuk baris TC-RBAC yang belum punya uji.
>
> **Satu cacat penamaan di kode uji, bukan di dokumen.** `users.e2e-spec.ts:83`
> ber-`describe` "Superuser mengelola akun" dan tiga `it`-nya berawalan
> "Superuser", padahal `asKab` membangun pelaku `Role.kabupaten`; docblock
> baris 53 juga masih menyebut "peran-yang-dipakai `superuser`". Lebih buruk di
> baris 226: `asKab` di dalam blok "Admin OPD BUKAN Admin Kabupaten" justru
> membangun pelaku `Role.opd`. Penyakit yang sama dengan dokumen ini, kali ini di
> kode.

## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

|                        |                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Dokumen Acuan**      | PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md · ERD.png · Routes-List-API-dan-Frontend.md |
| **Dokumen Pendamping** | TEST_PLAN.md                                                                           |
| **Versi**              | 3.3                                                                                    |
| **Tanggal**            | 15 September 2026 (v3.4 — §Y.8.1 baru: BUG-013 sudah diperbaiki di `main`, jadi pagar `test.fail()`-nya akan memerah pada merge berikutnya dan anotasinya harus dicabut, BUKAN specnya dihapus; dicatat juga bahwa pembuktian dua arah pagar itu menjamin lebih sedikit daripada kelihatannya — satu klausa sudah cukup menghijaukannya, padahal cacatnya tersebar di tujuh tempat; v3.3 — §Y.3.1: satu jalan lagi (RAM bebas 1,6 GB) gagal 2 dari 19, dan salah satunya menyamar jadi penyimpangan rute — lulus saat diulang per berkas; v3.2 — §Y.3.1 baru: kegoyahan E2E AKHIRNYA TERUKUR — 4 worker 5 gagal/4,0 mnt, 1 worker 0 gagal/2,3 mnt; muat halaman 1,6 dtk berbanding 12 dtk; `playwright.config.ts` kini 1 worker secara bawaan. Kata "yatim" diganti "tanpa induk" di seluruh dokumen pengujian atas permintaan pengguna; v3.1 — C-09 TIDAK LAGI terkunci (kredensial SSO sudah turun), dijalankan sebagian: BUG-019 + pagarnya; E2E 17 → 19 di 7 berkas; v3.0 — §Y.3 dapat sebab BARU untuk dua jalan (CAT-020, nginx menandai upstream API mati dan tak pulih sendiri) — sisanya tetap belum terjelaskan; v2.9 — lima pagar regresi berikutnya (BUG-014 s/d BUG-018) masuk §Y.8; Jest 663 → **673 di 92 berkas**, E2E 13 → **17 di 6 berkas**; v2.8 — §Y.3 dapat pembaruan: satu jalan E2E penuh 4 worker bersih (11 lulus, 2 dilewati, nol gagal), anjuran "per berkas" diturunkan tetapi tak dicabut; v2.7 — §Y.8 baru: pagar regresi `test.fail()` untuk BUG-013, peta E2E 11 → 13 pengujian di 5 berkas; v2.6 — peta otomatisasi §Y.1 dicocokkan ulang dengan `jest --json`: **delapan baris meleset**, termasuk satu berkas yang sudah tak ada; TC-FE-010 tak lagi menyebut sub-kategori; v2.5 — `main` ditarik ke `tester` (85 commit, 11 hari); suite Jest 195 → **663 di 89 berkas** karena tim dev kini ikut menulis uji; empat berkas uji penguji disesuaikan dengan kontrak baru dan satu dibuang; perkakas E2E diperbaiki untuk peran jamak, gerbang pengisian, dan taksonomi kategori baru; §Y.7 baru; v2.4 — sisa data uji dihapus paksa dari basis data dev (termasuk survei fixture E2E dan reproduksi BUG-005); §Y.3 ditambah sebab kedua: empat worker berebut satu `next dev`, dibuktikan dengan `--workers=1` yang lulus 9/9; v2.3 — dua belas kasus uji terakhir Modul Y ditutup (TC-FE-005/006/007/010/012/028/032/042/043/045/046/047); tiga premis usang dikoreksi; satu temuan mobile dibatalkan sendiri (§Y.5 butir 4); statistik Modul Y dihitung ulang 40 ✅ / 5 🟡 / 3 ❌ / 0 ⬜; v2.2 — formulir C-13 akhirnya dapat diuji (akun responden tanpa persetujuan tersedia), TC-FE-038 lulus; v2.1 — C-05/06/07/08 dijalankan, TC-FE-044 lulus, TC-FE-048 & 049 ditambahkan, statistik dihitung ulang 260 → 262; v2.0 — C-12 dijalankan, TC-FE-035/036/037 lulus; v1.9 — antarmuka pengaduan beruji (TC-FE-039/040/041), C-13 dijalankan sebagian; v1.8 — audit cakupan: TC-FE-034 s/d 047 ditambahkan, statistik dihitung ulang 246 → 260; v1.7 — lapisan E2E berdiri, TC-FE-009 lulus; v1.6 — hasil sesi C-02/C-03/C-10, tambah TC-FE-032 & 033; v1.5 — ringkasan statistik dihitung ulang: 227 → 246; v1.4 — BUG-005 terkonfirmasi Critical; v1.3 — penyesuaian setelah 81 commit; v1.2 — 11 Agu; v1.1 — 10 Agu; v1.0 — 29 Jul 2026) |

**Konvensi:**

- **ID:** `TC-[MODUL]-[NOMOR]`
- **Prioritas:** P0 (Kritis), P1 (Tinggi), P2 (Sedang), P3 (Rendah)
- **Tipe:** Unit, Integration (Integ), E2E, Manual
- **Status:** ⬜ Belum dikerjakan, 🟡 Dalam pengerjaan, ✅ Lulus, ❌ Gagal, ⏭️ Dilewati, ⛔ Tak berlaku (rute atau fitur yang diandaikannya tidak ada)

---

## Daftar Isi

1. [Modul A — Autentikasi & Manajemen Akun](#modul-a--autentikasi--manajemen-akun)
2. [Modul B — Manajemen OPD](#modul-b--manajemen-opd)
3. [Modul C — Manajemen Akun Admin](#modul-c--manajemen-akun-admin)
4. [Modul D — Survei SKM (CRUD & Template)](#modul-d--survei-skm-crud--template)
5. [Modul E — Pertanyaan Survei](#modul-e--pertanyaan-survei)
6. [Modul F — Pengisian Survei & Validasi Jawaban](#modul-f--pengisian-survei--validasi-jawaban)
7. [Modul G — Perhitungan IKM & Hasil](#modul-g--perhitungan-ikm--hasil)
8. [Modul H — Pengaduan Masyarakat](#modul-h--pengaduan-masyarakat)
9. [Modul I — Audit Log](#modul-i--audit-log)
10. [Modul J — Kontrak Parameter Boolean (Cross-Cutting)](#modul-j--kontrak-parameter-boolean-cross-cutting)
11. [Modul X — RBAC & Isolasi Data OPD (Cross-Cutting)](#modul-x--rbac--isolasi-data-opd-cross-cutting)

---

## Modul A — Autentikasi & Manajemen Akun

Referensi: PRD §8.1, Routes §A.1, kode `apps/api/src/modules/auth/**`

> **Revisi 2.0 (10 Agustus 2026) — modul ini ditulis ulang total.**
>
> Versi 1.0 menguji `POST /auth/register`, `/auth/verify` (OTP), `/auth/login`,
> `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, dan
> `/auth/change-password`. **Tidak satu pun endpoint itu ada di kode**, dan memang
> tidak akan pernah ada: sistem ini sengaja **tanpa autentikasi lokal**. Identitas
> berasal dari **SSO Helpdesk** (menunggu spesifikasi OAuth2), dan SKM hanya
> menerbitkan sesinya sendiri setelah identitas terverifikasi.
>
> Endpoint yang benar-benar tersedia hanya empat:
> `POST /auth/dev-login` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/profile`
>
> **Peran `superuser` sudah dihapus** (digabung ke `kabupaten`, 5 Agustus 2026). Enum
> `Role` kini hanya `kabupaten | opd | responden`; ~~`kabupaten` merangkap superuser dan
> mem-bypass `RolesGuard`~~.
>
> **Catatan silang, 13 Oktober 2026.** Kesimpulan kotak ini akhirnya benar, tetapi
> tanggal dan alasannya tidak: peran itu **dikembalikan** 20 Agustus 2026 dan baru
> dilebur untuk terakhir kali 15 September. Dan `kabupaten` **tidak lagi
> mem-bypass `RolesGuard`** — bypass itu dibongkar pada temuan audit T6,
> 7 September 2026. Lihat kotak di kepala dokumen.

### A.1 Dev-Login (`POST /api/v1/auth/dev-login`)

> Pengganti sementara SSO Helpdesk. `@Public` (tidak butuh Bearer — justru inilah yang
> menerbitkan Bearer), dipagari `NonProductionGuard`. Body hanya `{ identifier }` berisi
> **email atau `ssoSubject`** akun yang sudah ada — **tidak ada password sama sekali**.

| ID          | Skenario                                               | Langkah                                           | Data Input                                        | Expected Result                                                                                                                                               | Prioritas |  Tipe  | Status |
| ----------- | ------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :----: | :----: |
| TC-AUTH-001 | Login dengan email akun seed                           | POST `/auth/dev-login`                            | `{ identifier: "admin.kabupaten@example.go.id" }` | 200 OK; body `{ token, user }`; `user.role = kabupaten`; kolom `last_login_at` ter-update                                                                     |    P1     | Integ  |   ⬜   |
| TC-AUTH-002 | Login dengan `ssoSubject` (bukan email)                | POST `/auth/dev-login`                            | `{ identifier: "seed-admin-opd" }`                | 200 OK; user yang sama ditemukan — query memakai `OR` antara `email` dan `ssoSubject`                                                                         |    P2     | Integ  |   ⬜   |
| TC-AUTH-003 | Email tidak sensitif huruf besar/kecil                 | POST `/auth/dev-login`                            | `{ identifier: "ADMIN.OPD@EXAMPLE.GO.ID" }`       | 200 OK; identifier di-`toLowerCase()` sebelum dicocokkan ke kolom email                                                                                       |    P2     | Integ  |   ⬜   |
| TC-AUTH-004 | Spasi di awal/akhir identifier dipangkas               | POST `/auth/dev-login`                            | `{ identifier: "  warga@example.go.id  " }`       | 200 OK; `.trim()` diterapkan sebelum pencarian                                                                                                                |    P3     | Integ  |   ⬜   |
| TC-AUTH-005 | Identifier tidak terdaftar                             | POST `/auth/dev-login`                            | `{ identifier: "tidak-ada@mail.com" }`            | 404 Not Found; `Pengguna dengan email/ssoSubject "tidak-ada@mail.com" tidak ditemukan`                                                                        |    P1     | Integ  |   ⬜   |
| TC-AUTH-006 | Akun nonaktif ditolak                                  | POST `/auth/dev-login`                            | Akun dengan `is_active = false`                   | 403 Forbidden; "Akun tidak aktif"                                                                                                                             |    P0     | Integ  |   ⬜   |
| TC-AUTH-007 | Akun terhapus (soft delete) tidak bisa login           | POST `/auth/dev-login`                            | Akun dengan `deleted_at` terisi                   | 404 Not Found — pencarian difilter `deletedAt: null`, jadi akun terhapus tak pernah cocok                                                                     |    P0     | Integ  |   ⬜   |
| TC-AUTH-008 | Identifier kosong ditolak validator                    | POST `/auth/dev-login`                            | `{ identifier: "" }`                              | 400 Bad Request (`@IsString` + `@MinLength(1)` pada `DevLoginDto`)                                                                                            |    P2     | Integ  |   ⬜   |
| TC-AUTH-009 | **Dev-login tidak memverifikasi password sama sekali** | Telaah `AuthService.devLogin`                     | —                                                 | Tidak ada parameter/kolom password. Siapa pun yang tahu email sebuah akun bisa menerbitkan token penuh. Konsekuensi diterima — **wajib** dipagari TC-AUTH-010 |    P0     | Manual |   ⬜   |
| TC-AUTH-010 | **Dev-login harus mati di production**                 | Jalankan API dgn `NODE_ENV=production`, lalu POST | —                                                 | **404 Not Found (bukan 403)** — `NonProductionGuard` sengaja memakai 404 agar keberadaan rute dev tidak bocor                                                 |    P0     | Integ  |   ⬜   |

### A.2 Sesi & Token (JWT lokal)

> Token diterbitkan `SessionService`. **Payload sengaja minimal — hanya `sub` (userId).**
> `role`, `opdId`, dan `isActive` **tidak** disimpan di token; semuanya diambil ulang dari
> database pada setiap request oleh `SessionAuthProvider`. Konsekuensinya: perubahan peran
> dan penonaktifan akun berlaku **seketika**, bukan menunggu token kedaluwarsa.
>
> ⚠️ **Penting saat menulis test:** provider auth berganti mengikuti `NODE_ENV`
> (lihat `AuthModule`). Pada `NODE_ENV=test` yang aktif adalah `StubAuthProvider`
> (identitas lewat header `x-dev-*`), bukan `SessionAuthProvider`. Test di bagian A.2 ini
> menguji jalur token sungguhan, jadi **tidak boleh** dijalankan di lingkungan `test`.

| ID          | Skenario                                    | Langkah                                                                         | Expected Result                                                                                       | Prioritas | Tipe  | Status |
| ----------- | ------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-AUTH-020 | **Payload token minimal — hanya `sub`**     | Decode JWT hasil dev-login                                                      | Payload hanya berisi `sub` (userId) + klaim standar (`iat`, `exp`); **TIDAK** ada `role` atau `opdId` |    P0     | Unit  |   ⬜   |
| TC-AUTH-021 | Peran diambil ulang dari DB tiap request    | Login → ubah `role` user langsung di DB → panggil `GET /auth/me` dgn token LAMA | Peran baru langsung berlaku tanpa login ulang                                                         |    P0     | Integ |   ⬜   |
| TC-AUTH-022 | Penonaktifan akun berlaku seketika          | Login → set `is_active = false` → request dgn token lama                        | 401 Unauthorized, tanpa menunggu token kedaluwarsa                                                    |    P0     | Integ |   ⬜   |
| TC-AUTH-023 | Penghapusan akun berlaku seketika           | Login → isi `deleted_at` → request dgn token lama                               | 401 Unauthorized                                                                                      |    P0     | Integ |   ⬜   |
| TC-AUTH-024 | Token kedaluwarsa ditolak                   | Request dgn token yang melewati TTL sesi (`session.ttlHours`, default 24 jam)   | 401 Unauthorized                                                                                      |    P1     | Integ |   ⬜   |
| TC-AUTH-025 | Token dengan tanda tangan tidak sah ditolak | Ubah isi token / tandatangani dgn kunci lain                                    | 401 Unauthorized; `SessionService.verify` mengembalikan `null`                                        |    P0     | Integ |   ⬜   |
| TC-AUTH-026 | Header tanpa prefix `Bearer ` diabaikan     | Kirim `Authorization: <token>` tanpa kata "Bearer"                              | 401 Unauthorized                                                                                      |    P2     | Integ |   ⬜   |
| TC-AUTH-027 | Request tanpa header Authorization          | `GET /auth/me` tanpa header                                                     | 401 Unauthorized; "Autentikasi diperlukan"                                                            |    P0     | Integ |   ⬜   |

### A.3 Logout (`POST /api/v1/auth/logout`)

| ID          | Skenario                                        | Langkah                                                       | Expected Result                                                                                                                                                                      | Prioritas | Tipe  | Status |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------: | :---: | :----: |
| TC-AUTH-030 | Logout mengembalikan sukses                     | POST `/auth/logout` dengan Bearer valid                       | 200 OK; body `{ success: true }`                                                                                                                                                     |    P2     | Integ |   ⬜   |
| TC-AUTH-031 | **Logout stateless — token lama TETAP berlaku** | POST `/auth/logout` → pakai token yang sama ke `GET /auth/me` | Masih 200 OK. Pencabutan hanya terjadi di sisi klien (membuang token). **Risiko: token yang bocor tetap sah sampai kedaluwarsa.** Konfirmasi ke tim apakah diterima sampai SSO aktif |    P0     | Integ |   ⬜   |
| TC-AUTH-032 | Logout tanpa token                              | POST `/auth/logout` tanpa header Authorization                | 401 Unauthorized — rute ini tidak `@Public`                                                                                                                                          |    P1     | Integ |   ⬜   |

### A.4 Profil Pengguna (`GET /auth/me`, `PATCH /auth/profile`)

| ID          | Skenario                                                        | Langkah                                           | Data Input                                 | Expected Result                                                                                             | Prioritas | Tipe  | Status |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-AUTH-040 | Ambil profil pengguna aktif (semua peran)                       | GET `/auth/me` dengan Bearer                      | Token valid                                | 200 OK; berisi `id`, `nama`, `email`, `role`, `opdId`                                                       |    P1     | Integ |   ⬜   |
| TC-AUTH-041 | Profil responden menyertakan data demografis                    | GET `/auth/me` sebagai responden                  | —                                          | 200 OK; `respondentProfile` terisi (`jenisKelamin`, `kelompokUmur`, `pendidikan`, `pekerjaan`)              |    P1     | Integ |   ⬜   |
| TC-AUTH-042 | Profil admin tidak punya data demografis                        | GET `/auth/me` sebagai kabupaten / opd            | —                                          | 200 OK; `respondentProfile` bernilai `null`                                                                 |    P2     | Integ |   ⬜   |
| TC-AUTH-043 | Ubah nama (berlaku untuk semua peran)                           | PATCH `/auth/profile`                             | `{ nama: "Nama Baru" }`                    | 200 OK; nama ter-update; profil dikembalikan lewat `getMe`                                                  |    P1     | Integ |   ⬜   |
| TC-AUTH-044 | Buat profil demografis responden (upsert baru)                  | PATCH `/auth/profile` sbg responden tanpa profil  | 4 field demografis lengkap                 | 200 OK; record `respondent_profile` terbuat                                                                 |    P1     | Integ |   ⬜   |
| TC-AUTH-045 | Profil demografis baru wajib lengkap                            | PATCH `/auth/profile` sbg responden tanpa profil  | `{ jenisKelamin: "laki_laki" }` saja       | 400 Bad Request; "Profil demografis baru memerlukan jenisKelamin, kelompokUmur, pendidikan, dan pekerjaan"  |    P1     | Integ |   ⬜   |
| TC-AUTH-046 | Update parsial pada profil yang SUDAH ada diperbolehkan         | PATCH `/auth/profile` sbg responden berprofil     | `{ pekerjaan: "PNS" }` saja                | 200 OK; hanya `pekerjaan` berubah, field lain utuh (Prisma mengabaikan `undefined`)                         |    P2     | Integ |   ⬜   |
| TC-AUTH-047 | Field demografis dari non-responden diabaikan                   | PATCH `/auth/profile` sbg admin OPD               | `{ nama: "X", jenisKelamin: "perempuan" }` | 200 OK; nama berubah, **tidak ada** `respondent_profile` dibuat (dijaga cek `user.role === Role.responden`) |    P2     | Integ |   ⬜   |
| TC-AUTH-048 | Patch tanpa field apa pun bersifat idempotent                   | PATCH `/auth/profile`                             | `{}`                                       | 200 OK; tidak ada perubahan data                                                                            |    P3     | Integ |   ⬜   |
| TC-AUTH-049 | Data profil dipakai ulang otomatis saat isi survei (FR-AUTH-05) | Isi profil → isi survei → cek identitas responden | —                                          | Identitas pada respons survei terisi dari profil tersimpan, tanpa mengetik ulang                            |    P1     |  E2E  |   ⬜   |

### A.5 Frontend — Login & Proteksi Route

> Sisi klien: form dev-login ([SSOLoginButton.jsx](../apps/web/src/features/authentication/components/SSOLoginButton.jsx)),
> penyimpanan sesi ([authStorage.js](../apps/web/src/features/authentication/services/authStorage.js)),
> dan penjaga route ([proxy.js](../apps/web/src/proxy.js)).
> Tombol masih berlabel "Masuk via SSO Helpdesk" tetapi membuka **form dev-login**, bukan
> mengalihkan ke portal SSO eksternal — ini yang membuat TC-FE-002 versi 1.0 keliru.

| ID          | Skenario                                                  | Langkah                                                | Expected Result                                                                                                                                                                                  | Prioritas |   Tipe    | Status |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------: | :-------: | :----: |
| TC-AUTH-050 | Form login mencegah submit kosong                         | Buka form → klik "Masuk" tanpa mengisi identifier      | Input bertanda `required`; request API tidak terkirim                                                                                                                                            |    P2     | Component |   ⬜   |
| TC-AUTH-051 | Tombol terkunci selama proses login                       | Submit identifier valid                                | Tombol `disabled` dan berlabel "Memproses..."; klik beruntun tidak mengirim request ganda                                                                                                        |    P1     | Component |   ⬜   |
| TC-AUTH-052 | Login gagal menampilkan pesan, tanpa redirect             | Mock API mengembalikan 404                             | Pesan error tampil di sebelah tombol; tidak terjadi navigasi                                                                                                                                     |    P1     | Component |   ⬜   |
| TC-AUTH-053 | Redirect setelah login sesuai peran                       | Login sebagai tiap peran                               | `kabupaten` → `/admin-kab/dashboard`; `opd` → `/admin-opd/dashboard`; `responden` → `/dashboard` (sumber tunggal: `ROLE_HOME`)                                                                   |    P1     | Component |   ⬜   |
| TC-AUTH-054 | `saveSession` / `clearSession` menulis ke dua tempat      | Panggil kedua fungsi lalu periksa storage              | `saveSession`: `token` & `role` ada di localStorage **dan** cookie; `clearSession`: keduanya terhapus dan `sso_logged_in = "false"`                                                              |    P1     |   Unit    |   ⬜   |
| TC-AUTH-055 | **Matriks proteksi route `proxy.js`**                     | Akses tiap route pada tiap kondisi peran — lihat A.5.1 | Sesuai tabel A.5.1. **LULUS sejak 2 September 2026** — 32 kombinasi diperiksa di peramban dan dikunci otomatis di `e2e/proteksi-route.spec.js`; peran `superuser` diperiksa terpisah pada sesi C-10 karena kurungan areanya beraturan sendiri |    P0     |    E2E    |   ✅   |
| TC-AUTH-056 | **Token tersimpan di localStorage & cookie non-HttpOnly** | DevTools → Application → Storage setelah login         | Token terbaca oleh JavaScript → rentan XSS. Cookie non-HttpOnly **disengaja** (dibaca `proxy.js` di Edge Runtime yang tak bisa akses localStorage). Konfirmasi mitigasi ke tim — lihat TC-FE-015 |    P0     |  Manual   |   ⬜   |

#### A.5.1 Matriks Proteksi Route (`proxy.js`)

> `✅` = halaman tampil · `↪️` = dialihkan ke route tersebut

| Route                                               | Tanpa token |   `responden`   |           `opd`           |        `kabupaten`        |
| --------------------------------------------------- | :---------: | :-------------: | :-----------------------: | :-----------------------: |
| `/` (beranda publik)                                |     ✅      |       ✅        | ↪️ `/admin-opd/dashboard` | ↪️ `/admin-kab/dashboard` |
| `/dashboard`, `/complaints`, `/surveys`, `/profile` |   ↪️ `/`    |       ✅        | ↪️ `/admin-opd/dashboard` | ↪️ `/admin-kab/dashboard` |
| `/admin-kab/**`                                     |   ↪️ `/`    | ↪️ `/dashboard` | ↪️ `/admin-opd/dashboard` |            ✅             |
| `/admin-opd/dashboard`                              |   ↪️ `/`    | ↪️ `/dashboard` |            ✅             | ↪️ `/admin-kab/dashboard` |
| `/admin-opd/**` (selain `dashboard`)                |   ↪️ `/`    | ↪️ `/dashboard` |            ✅             | ↪️ `/admin-kab/dashboard` |

> **Kolom `kabupaten` pada baris terakhir BERUBAH 15 September 2026.** Sampai
> peran jamak (`62e9cdc`), tabel area di `proxy.js` bernama
> `SUPERUSER_AREA_PREFIXES` dan hanya berlaku bagi superuser yang sudah memilih
> area; peran `kabupaten` biasa boleh menengok `/admin-opd/*` kecuali
> dashboard-nya (keputusan 6 Agustus 2026). Tabel itu kini bernama
> `ROLE_PREFIXES`, berlaku bagi SETIAP peran, dan berisi
> `kabupaten: ['/admin-kab']` — seluruh area OPD tertutup baginya. Sejalan
> dengan rancangan peran jamak: yang butuh area OPD **berganti peran**, bukan
> menembus batas areanya.

> Dua perilaku yang mudah disalahpahami sebagai bug, padahal disengaja:
>
> 1. `kabupaten` **boleh** masuk `/admin-opd/**` (ia merangkap superuser dan berhak melihat
>    data per-OPD), **kecuali** `/admin-opd/dashboard` — endpoint di baliknya menuntut
>    `Role.opd` murni, jadi kabupaten diarahkan ke dashboard globalnya sendiri.
> 2. `responden` **tidak** diusir dari `/` — beranda tetap relevan baginya (mis. form
>    pengaduan cepat). Hanya admin yang diarahkan ke area kerjanya.

---

## Modul B — Manajemen OPD

Referensi: PRD §8.2 (FR-OPD-01 ~ FR-OPD-03), Routes §A.2

| ID         | Skenario                                            | Langkah                                                           | Data Input                                                                 | Expected Result                                                                                                                                                    | Prioritas |  Tipe | Status |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----- | ------ |
| TC-OPD-001 | Daftar OPD (Admin Kabupaten)                        | GET `/opd`                                                        | Query: `page=1, limit=10`                                                  | 200 OK; array OPD dengan pagination — `opd.e2e:77`, unit `opd.service.spec.ts:56`                                                                                  |     P1    | Integ |   ✅    |
| TC-OPD-002 | Daftar OPD dengan filter pencarian nama             | GET `/opd?search=kesehatan`                                       | `search=kesehatan`                                                         | 200 OK; hanya OPD yang NAMA ATAU KODE-nya mengandung frasa yang dicari (case-insensitive, `opd.service.ts:32-37`); baris yang tak cocok TERSINGKIR — `opd.e2e:121` |     P2    | Integ |   ✅    |
| TC-OPD-003 | Daftar OPD filter status aktif                      | GET `/opd?isActive=true`                                          | `isActive=true`                                                            | 200 OK; `isActive=true` hanya OPD aktif, `isActive=false` hanya OPD nonaktif — `opd.e2e:147`                                                                       |     P2    | Integ |   ✅    |
| TC-OPD-004 | Tambah OPD manual (Admin Kabupaten)                 | POST `/opd`                                                       | `{ nama: "Dinas Pendidikan", kode: "DISDIK", jenisLayanan: "Pendidikan" }` | **DIBATALKAN 14 Oktober 2026: rutenya tidak ada.** Lihat catatan di bawah tabel                                                                                    |     P1    | Integ |   ⛔    |
| TC-OPD-005 | Tambah OPD dengan kode duplikat                     | POST `/opd`                                                       | Kode yang sudah ada                                                        | **DIBATALKAN 14 Oktober 2026: rutenya tidak ada.** Lihat catatan di bawah tabel                                                                                    |     P1    | Integ |   ⛔    |
| TC-OPD-006 | Detail OPD (Admin Kabupaten melihat semua)          | GET `/opd/:id` sebagai kabupaten                                  | ID OPD valid                                                               | 200 OK; detail OPD — `opd.e2e:105`                                                                                                                                 |     P1    | Integ |   ✅    |
| TC-OPD-007 | Detail OPD — Admin OPD hanya melihat OPD sendiri    | GET `/opd/:id` sebagai OPD Dinkes                                 | ID OPD Disdukcapil (bukan miliknya)                                        | 403 Forbidden — `opd.e2e:122` (status saja, tanpa pesan)                                                                                                           |     P0    | Integ |   ✅    |
| TC-OPD-008 | Ubah data OPD (Admin Kabupaten)                     | PATCH `/opd/:id`                                                  | `{ nama: "Dinas Kesehatan Baru" }`                                         | **DIBATALKAN 14 Oktober 2026: rutenya tidak ada.** Lihat catatan di bawah tabel                                                                                    |     P1    | Integ |   ⛔    |
| TC-OPD-009 | Nonaktifkan OPD                                     | PATCH `/opd/:id/status`                                           | `{ isActive: false }`                                                      | **DIBATALKAN 14 Oktober 2026: rutenya tidak ada.** Penonaktifan terjadi lewat `POST /opd/sync` (TC-OPD-011), bukan lewat rute tersendiri                           |     P1    | Integ |   ⛔    |
| TC-OPD-010 | Sinkronisasi OPD dari Helpdesk                      | POST `/opd/sync`                                                  | — (fetch dari sumber eksternal)                                            | 200 OK; report: `created`, `updated`, `deactivated`, `skipped` — `opd.e2e:138`                                                                                     |     P2    | Integ |   ✅    |
| TC-OPD-011 | Sinkronisasi — OPD hilang dari source dinonaktifkan | POST `/opd/sync` dengan source yang tidak mengandung OPD tertentu | —                                                                          | OPD yang hilang: `is_active = false`; TIDAK dihapus (jaga FK) — `opd.e2e:180`, unit `opd.service.spec.ts:204`                                                      |     P1    | Integ |   ✅    |
| TC-OPD-012 | Responden JUGA dapat membuka daftar OPD             | GET `/opd` sebagai responden                                      | Token responden                                                            | 200 OK; daftar OPD sengaja terbuka bagi seluruh peran terautentikasi — `opd.e2e:97`                                                                                |     P0    | Integ |   ✅    |

> **(14 Oktober 2026) EMPAT BARIS DI ATAS DIBATALKAN, DAN SATU HARAPAN
> DIKOREKSI.** Ditemukan sambil memutuskan nasib TC-RBAC-002, yang juga
> mengandaikan `POST /opd`.
>
> `opd.controller.ts` hanya punya TIGA rute: `GET /opd` (tanpa `@Roles`),
> `POST /opd/sync` (`@Roles(Role.kabupaten)`), dan `GET /opd/:id`
> (`@Roles(Role.kabupaten, Role.opd)`). Tak ada POST, PATCH, PUT, atau DELETE
> atas OPD selain sinkronisasi.
>
> Itu bukan kekurangan yang menunggu dikerjakan, melainkan rancangan: daftar OPD
> disinkronkan dari Helpdesk dan bersifat BACA SAJA, sebagaimana tercatat di
> CLAUDE.md. Menambah atau menyunting OPD lewat API SKEMA akan membuat dua
> sumber kebenaran yang saling menimpa pada sinkronisasi berikutnya. Karena itu
> keempat baris ditandai ⛔ tak berlaku, bukan ⬜ belum dikerjakan: ia tak akan
> pernah dikerjakan, dan penguji berikutnya tak perlu menemukan jalan buntunya
> sendiri.
>
> **TC-OPD-012 cacat jenis LAIN: harapannya yang salah, bukan rutenya yang
> hilang.** Ia menuntut Responden ditolak 403 pada `GET /opd`; kenyataannya
> **200**, dan itu disengaja. Rutenya memang tanpa `@Roles`, dan dua uji menamai
> alasannya: `opd.e2e:89` ("INT-18: list terbuka semua peran terautentikasi")
> serta `opd.e2e:97` ("dibutuhkan dropdown OPD tujuan saat buat pengaduan").
> Selnya dikoreksi dan barisnya lulus. Cacat yang sama pernah ditemukan pada
> TC-RBAC-001, dari sumber yang sama.
>
> **(15 Oktober 2026) TUJUH BARIS SISANYA DIPETAKAN**, badan ujinya dibaca satu
> per satu, bukan judulnya. Lima terbukti dan sel pembuktinya kini tertulis di
> kolom Expected Result: TC-OPD-001, 006, 007, 010, 011.
>
> **Dua sisanya, TC-OPD-002 dan TC-OPD-003, awalnya tetap ⬜ dengan sebab yang
> berbeda.** Keduanya ditutup pada hari yang sama; catatan di bawah menyimpan
> apa yang ditemukan, sebab salah satunya ternyata cacat kode, bukan celah uji.
>
> TC-OPD-003 (`?isActive=`) tak punya uji sama sekali. Penyaringnya ADA di kode
> (`opd.service.ts:38`), tetapi tak satu pun uji mengirim parameter itu, jadi
> penyaring yang kelak terhapus tak akan memerahkan apa pun.
>
> TC-OPD-002 lebih halus, dan harapannya sendiri yang kurang tepat. Barisnya
> berbunyi "filter pencarian NAMA" dan menuntut "hanya OPD yang namanya
> mengandung 'kesehatan'". Kenyataannya `search` mencocokkan **nama ATAU kode**,
> case-insensitive (`opd.service.ts:32-37`; `ListOpdQueryDto` sendiri
> menuliskannya, "Cari pada nama atau kode OPD"). Selnya dikoreksi.
>
> Ia ⬜ karena uji yang ada tak membuktikannya dari dua arah: `opd.e2e:77`
> mengirim `?search=E2ETEST` -- itu sebuah KODE, bukan nama -- dan hanya
> memastikan OPD uji HADIR. Tak ada yang memastikan baris yang tak cocok
> TERSINGKIR, dan itulah separuh arti sebuah penyaring. Uji yang cuma
> memastikan kehadiran akan tetap hijau walau `where.OR` dibuang seluruhnya.
>
> **(15 Oktober 2026) KEDUANYA DITUTUP, dan yang kedua menemukan cacat kode.**
> Dua uji ditambahkan di `main`, keduanya dibuktikan merah lebih dulu.
>
> TC-OPD-002 kini `opd.e2e:121`. Frasa yang dicari sengaja "E2E Test" -- ada di
> NAMA (`OPD E2E Test`) dan TIDAK di kodenya (`E2ETEST`, tanpa spasi) -- lalu ia
> menuntut setiap baris yang kembali ikut cocok. Terbukti merah oleh mutasi
> `if (false && search)` di `opd.service.ts`: seluruh OPD ikut kembali dan
> tuntutan kedua gagal.
>
> TC-OPD-003 kini `opd.e2e:147`, dan ia memerah pada jalan PERTAMA tanpa mutasi
> apa pun. `?isActive=false` mengembalikan nol baris, `?isActive=true` juga nol,
> sementara kueri kontrol tanpa penyaring mengembalikan barisnya dengan
> `isActive: false`. Dua-duanya kosong hanya mungkin bila penyaringnya bernilai
> `true` pada kedua permintaan.
>
> Sebabnya `app.setup.ts:289` menyalakan `transformOptions.enableImplicitConversion`.
> class-transformer lalu mengubah nilai kueri memakai tipe hasil refleksi, dan
> untuk `boolean` ia menjalankan `Boolean(value)`; `Boolean('false')` bernilai
> `true`. Konversi itu berjalan SEBELUM `@Transform` milik DTO, sehingga
> `@Transform` tak pernah melihat string aslinya. Akibatnya tak ada cara
> menyaring OPD nonaktif lewat API, dan `?isActive=false` diam-diam
> mengembalikan yang aktif. Diperbaiki di `main` dengan `@Type(() => String)`
> pada medan itu.
>
> **Cacat yang sama terukur di tiga medan lain**: `tanpaOpd`
> (`list-complaint-query.dto.ts`), `unreadOnly`
> (`list-notification-query.dto.ts`), dan `isAnonim` (`create-complaint.dto.ts`,
> datang sebagai string dari multipart). Ketiganya **ikut diperbaiki dan beruji
> pada 15 Oktober 2026**, dan kasus ujinya ada di
> [Modul J](#modul-j--kontrak-parameter-boolean-cross-cutting) sebagai
> TC-BOOL-001 s.d. 003; temuannya [BUG-020](BUG_REPORTS.md#bug-020).
>
> Medan ketiga bernama `isAnonim`, bukan `anonim`; penyebutan pertamanya di sini
> salah dan dibetulkan pada hari yang sama.
>
> **TC-OPD-007 tercakup tetapi hanya pada STATUS**, tanpa memeriksa pesan
> penolakannya (`opd.e2e:122`). Bentuk itu terbukti beberapa kali minggu ini
> dapat tetap hijau walau gerbang perannya hilang, sebab lapis berikutnya ikut
> menjawab 403. Dihitung lulus, tetapi tidak sekuat baris yang memeriksa pesan.

---

## Modul C — Manajemen Akun Admin

Referensi: PRD §6, §8.1 (FR-AUTH-06, FR-AUTH-07), Routes §A.3

| ID         | Skenario                                       | Langkah                                     | Data Input                               | Expected Result                                                                      | Prioritas | Tipe  | Status |
| ---------- | ---------------------------------------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ | :-------: | :---: | :----: |
| TC-USR-001 | Daftar akun admin (Admin Kabupaten)            | GET `/users`                                | `page=1, limit=10`                       | 200 OK; daftar user non-deleted                                                      |    P1     | Integ |   ⬜   |
| TC-USR-002 | Daftar akun admin filter per role              | GET `/users?role=opd`                       | `role=opd`                               | 200 OK; hanya user ber-role OPD                                                      |    P2     | Integ |   ⬜   |
| TC-USR-003 | Buat akun Admin OPD (oleh Admin Kabupaten)     | POST `/users` sebagai kabupaten             | `{ nama, email, role: "opd", opdId: 1 }` | 201 Created; user tersimpan; terikat ke OPD                                          |    P1     | Integ |   ⬜   |
| TC-USR-004 | Buat akun Admin OPD tanpa `opdId` → ditolak    | POST `/users`                               | `{ role: "opd" }` tanpa `opdId`          | 400 Bad Request; "opdId wajib diisi untuk role opd"                                  |    P1     | Integ |   ⬜   |
| TC-USR-005 | ⛔ **TIDAK BERLAKU 13 Okt 2026** — Kabupaten TIDAK boleh assign role `superuser`  | POST `/users` sebagai kabupaten             | `{ role: "superuser" }`                  | Harapan lama 403. Peran itu tak ada lagi, jadi `@IsIn(ASSIGNABLE_ROLES)` menolaknya dengan **400**, bukan 403. Medannya pun `roles` (array), bukan `role` |    P0     | Integ |   ⛔   |
| TC-USR-006 | ⚠️ **HARAPANNYA TERBALIK 13 Okt 2026** — Kabupaten boleh assign role `kabupaten`  | POST `/users` sebagai kabupaten             | `{ roles: ["kabupaten"], nama, email }`  | Harapan lama 403. `UsersService.assertKabupaten` kini meloloskan `kabupaten` — ia peran tertinggi sejak peleburan — jadi yang benar **201 Created**. Perlu dijalankan ulang |    P0     | Integ |   ⚠️   |
| TC-USR-007 | 🔁 **PELAKUNYA BERGANTI 13 Okt 2026** — Kabupaten BOLEH assign role `kabupaten`  | POST `/users` sebagai kabupaten             | `{ roles: ["kabupaten"], nama, email }`  | 201 Created. Dahulu pelakunya Superuser; kuasanya pindah ke `kabupaten`. Kini kembar dengan TC-USR-006 sesudah harapan itu dibalik — salah satunya dapat dibuang saat dijalankan |    P0     | Integ |   ⚠️   |
| TC-USR-008 | ⛔ **TIDAK BERLAKU 13 Okt 2026** — Superuser BOLEH assign role `superuser`        | POST `/users` sebagai superuser             | `{ role: "superuser", nama, email }`     | Tak dapat diuji: `ASSIGNABLE_ROLES` berisi `kabupaten`, `opd`, `responden` saja, dan tak ada akun yang dapat berperan `superuser` |    P0     | Integ |   ⛔   |
| TC-USR-009 | Buat akun dengan email duplikat                | POST `/users`                               | Email yang sudah ada                     | 409 Conflict; "Email atau ssoSubject sudah digunakan"                                |    P1     | Integ |   ⬜   |
| TC-USR-010 | Ubah akun admin (nama, OPD tautan)             | PATCH `/users/:id`                          | `{ nama: "Budi Updated", opdId: 2 }`     | 200 OK; data ter-update                                                              |    P1     | Integ |   ⬜   |
| TC-USR-011 | Nonaktifkan akun Admin OPD                     | PATCH `/users/:id/status`                   | `{ isActive: false }`                    | 200 OK; `is_active = false`                                                          |    P1     | Integ |   ⬜   |
| TC-USR-012 | ⛔ **TIDAK BERLAKU 13 Okt 2026** — Kabupaten tidak boleh mengelola akun superuser | PATCH `/users/:id/status` sebagai kabupaten | Target: user ber-role superuser          | Tak ada akun ber-peran `superuser` yang dapat dijadikan target. `assertSuperuser` juga tak ada lagi; penggantinya `assertKabupaten`, dan pesannya "Manajemen pengguna hanya dapat diakses oleh Admin Kabupaten" |    P0     | Integ |   ⛔   |
| TC-USR-013 | Responden tidak bisa akses modul users         | GET `/users` sebagai responden              | Token responden                          | 403 Forbidden                                                                        |    P0     | Integ |   ⬜   |
| TC-USR-014 | Admin OPD tidak bisa akses modul users         | GET `/users` sebagai admin OPD              | Token admin OPD                          | 403 Forbidden                                                                        |    P0     | Integ |   ⬜   |

---

## Modul D — Survei SKM (CRUD & Template)

Referensi: PRD §8.3 (FR-SVY-01 ~ FR-SVY-07), Routes §A.4

### D.1 CRUD Survei

| ID         | Skenario                                                   | Langkah                                         | Data Input                                                                 | Expected Result                                             | Prioritas | Tipe  | Status |
| ---------- | ---------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | :-------: | :---: | :----: |
| TC-SVY-001 | Buat paket survei (Admin OPD)                              | POST `/surveys` sebagai OPD Dinkes              | `{ judul: "SKM Q3 2026", periode: "Q3-2026", allowMultipleSubmit: false }` | 201 Created; status default = `draft`; `opdId` = OPD Dinkes |    P1     | Integ |   ⬜   |
| TC-SVY-002 | Buat survei — `opdId` otomatis dari user (Admin OPD)       | POST `/surveys` tanpa `opdId`                   | Token OPD                                                                  | 201 Created; `opdId` diambil dari `user.opdId`              |    P1     | Unit  |   ⬜   |
| TC-SVY-003 | 🔁 **PELAKUNYA BERGANTI 13 Okt 2026** — Buat survei: Kabupaten wajib kirim `opdId` | POST `/surveys` sebagai kabupaten tanpa `opdId` | Token kabupaten                                                            | 400 Bad Request; "opdId wajib diisi". Masih sahih: `resolveOpdId` memakai `user.opdId` hanya bila `actingRole === opd`, dan menuntut `dto.opdId` untuk peran lainnya |    P1     | Integ |   ⬜   |
| TC-SVY-004 | Buat survei — Admin OPD yang tidak tertaut OPD             | POST `/surveys`                                 | Admin OPD tanpa `opdId`                                                    | 400 Bad Request; "Akun OPD tidak tertaut ke OPD mana pun"   |    P1     | Unit  |   ⬜   |
| TC-SVY-005 | Daftar survei — Admin OPD hanya lihat milik OPD-nya        | GET `/surveys` sebagai OPD Dinkes               | —                                                                          | 200 OK; hanya survei `opdId = Dinkes`                       |    P0     | Integ |   ⬜   |
| TC-SVY-006 | Daftar survei — Admin Kabupaten lihat semua OPD            | GET `/surveys` sebagai kabupaten                | —                                                                          | 200 OK; survei dari semua OPD                               |    P0     | Integ |   ⬜   |
| TC-SVY-007 | Daftar survei dengan filter status                         | GET `/surveys?status=aktif`                     | `status=aktif`                                                             | 200 OK; hanya survei berstatus `aktif`                      |    P2     | Integ |   ⬜   |
| TC-SVY-008 | Detail survei — Admin OPD akses survei OPD sendiri         | GET `/surveys/:id` sebagai OPD Dinkes           | ID survei milik Dinkes                                                     | 200 OK; detail survei                                       |    P1     | Integ |   ⬜   |
| TC-SVY-009 | Detail survei — Admin OPD TIDAK bisa akses survei OPD lain | GET `/surveys/:id` sebagai OPD Dinkes           | ID survei milik Disdukcapil                                                | 403 Forbidden                                               |    P0     | Integ |   ⬜   |
| TC-SVY-010 | Ubah survei — hanya saat draft                             | PATCH `/surveys/:id`                            | Survei status `draft`; `{ judul: "Updated" }`                              | 200 OK; data ter-update                                     |    P1     | Integ |   ⬜   |
| TC-SVY-011 | Ubah survei — ditolak saat status `aktif`                  | PATCH `/surveys/:id`                            | Survei status `aktif`                                                      | 400 Bad Request; "hanya dapat diubah saat berstatus draft"  |    P1     | Integ |   ⬜   |
| TC-SVY-012 | Hapus survei — hanya saat draft                            | DELETE `/surveys/:id`                           | Survei status `draft`                                                      | 200 OK; survei terhapus dari DB                             |    P1     | Integ |   ⬜   |
| TC-SVY-013 | Hapus survei — ditolak saat status `aktif`                 | DELETE `/surveys/:id`                           | Survei status `aktif`                                                      | 400 Bad Request                                             |    P1     | Integ |   ⬜   |

### D.2 Transisi Status Survei

| ID         | Skenario                                  | Langkah                                         | Data Input                              | Expected Result                                                    | Prioritas | Tipe  | Status |
| ---------- | ----------------------------------------- | ----------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ | :-------: | :---: | :----: |
| TC-SVY-020 | Publikasikan survei (draft → aktif)       | PATCH `/surveys/:id/status`                     | `{ status: "aktif" }`                   | 200 OK; status berubah ke `aktif`                                  |    P1     | Integ |   ⬜   |
| TC-SVY-021 | Tutup survei (aktif → ditutup)            | PATCH `/surveys/:id/status`                     | `{ status: "ditutup" }`                 | 200 OK; status `ditutup`; IKM snapshot otomatis tersimpan          |    P1     | Integ |   ⬜   |
| TC-SVY-022 | Tutup survei → snapshot IKM tersimpan     | PATCH status → ditutup; cek tabel `ikm_results` | —                                       | `ikm_results` record terbuat/ter-update untuk survei ini           |    P0     | Integ |   ⬜   |
| TC-SVY-023 | Transisi ilegal (ditutup → aktif) ditolak | PATCH `/surveys/:id/status`                     | Survei `ditutup`; `{ status: "aktif" }` | 400 Bad Request; "Transisi status ditutup → aktif tidak diizinkan" |    P1     | Unit  |   ⬜   |
| TC-SVY-024 | Transisi ilegal (ditutup → draft) ditolak | PATCH `/surveys/:id/status`                     | Survei `ditutup`; `{ status: "draft" }` | 400 Bad Request                                                    |    P1     | Unit  |   ⬜   |
| TC-SVY-025 | Transisi ke status yang sama → no-op      | PATCH `/surveys/:id/status`                     | Survei `aktif`; `{ status: "aktif" }`   | 200 OK; tidak berubah (idempotent)                                 |    P2     | Unit  |   ⬜   |
| TC-SVY-026 | Draft langsung ke ditutup (diizinkan)     | PATCH `/surveys/:id/status`                     | Survei `draft`; `{ status: "ditutup" }` | 200 OK; transisi diizinkan                                         |    P2     | Unit  |   ⬜   |

### D.3 Duplikasi Survei

| ID         | Skenario                                  | Langkah                                          | Data Input                    | Expected Result                                                                                                          | Prioritas | Tipe  | Status |
| ---------- | ----------------------------------------- | ------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | :-------: | :---: | :----: |
| TC-SVY-030 | Duplikasi survei beserta pertanyaannya    | POST `/surveys/:id/duplicate`                    | ID survei dengan 9 pertanyaan | 201 Created; survei baru berstatus `draft`; judul "(Salinan)"; semua pertanyaan terduplikasi; jawaban/respons TIDAK ikut |    P1     | Integ |   ⬜   |
| TC-SVY-031 | Duplikasi survei milik OPD lain → ditolak | POST `/surveys/:id/duplicate` sebagai OPD Dinkes | ID survei milik Disdukcapil   | 403 Forbidden                                                                                                            |    P0     | Integ |   ⬜   |

---

## Modul E — Pertanyaan Survei

Referensi: PRD §8.3 (FR-SVY-02 ~ FR-SVY-04), Routes §A.4

| ID         | Skenario                                       | Langkah                                         | Data Input                                                          | Expected Result                                                                 | Prioritas | Tipe  | Status |
| ---------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-QST-001 | Daftar pertanyaan survei (urut `urutan`)       | GET `/surveys/:id/questions`                    | ID survei                                                           | 200 OK; array pertanyaan terurut `urutan` ASC                                   |    P1     | Integ |   ⬜   |
| TC-QST-002 | Tambah pertanyaan kustom tipe skala            | POST `/surveys/:id/questions`                   | `{ teks: "Kecepatan layanan?", tipe: "skala", isIkmUnsur: false }`  | 201 Created; `urutan` = max+1; `kodeUnsur = null`                               |    P1     | Integ |   ⬜   |
| TC-QST-003 | Tambah pertanyaan kustom tipe teks             | POST `/surveys/:id/questions`                   | `{ teks: "Saran?", tipe: "teks" }`                                  | 201 Created                                                                     |    P1     | Integ |   ⬜   |
| TC-QST-004 | Tambah pertanyaan IKM unsur baku               | POST `/surveys/:id/questions`                   | `{ teks: "...", tipe: "skala", isIkmUnsur: true, kodeUnsur: "U1" }` | 201 Created; `isIkmUnsur = true`; `kodeUnsur = "U1"`                            |    P1     | Integ |   ⬜   |
| TC-QST-005 | Terapkan template 9 unsur SKM                  | POST `/surveys/:id/questions/template`          | Survei kosong (draft)                                               | 200 OK; 9 pertanyaan terbuat (U1–U9); semua `isIkmUnsur = true`, `tipe = skala` |    P0     | Integ |   ⬜   |
| TC-QST-006 | Template 9 unsur — skip kode yang sudah ada    | POST `/surveys/:id/questions/template`          | Survei yang sudah punya U1, U3                                      | 200 OK; hanya 7 pertanyaan baru ditambahkan (U2, U4–U9)                         |    P1     | Integ |   ⬜   |
| TC-QST-007 | Template 9 unsur — ditolak saat survei aktif   | POST `/surveys/:id/questions/template`          | Survei status `aktif`                                               | 400 Bad Request; "hanya saat berstatus draft"                                   |    P1     | Integ |   ⬜   |
| TC-QST-008 | Ubah pertanyaan (saat draft)                   | PATCH `/questions/:id`                          | `{ teks: "Updated text" }`                                          | 200 OK; teks ter-update                                                         |    P1     | Integ |   ⬜   |
| TC-QST-009 | Ubah pertanyaan — ditolak saat survei aktif    | PATCH `/questions/:id`                          | Survei `aktif`                                                      | 400 Bad Request                                                                 |    P1     | Integ |   ⬜   |
| TC-QST-010 | Hapus pertanyaan (saat draft)                  | DELETE `/questions/:id`                         | —                                                                   | 200 OK; pertanyaan terhapus                                                     |    P1     | Integ |   ⬜   |
| TC-QST-011 | Ubah urutan pertanyaan (reorder)               | PATCH `/surveys/:id/questions/reorder`          | `{ orderedIds: [3, 1, 2] }`                                         | 200 OK; urutan ter-update sesuai array                                          |    P2     | Integ |   ⬜   |
| TC-QST-012 | Reorder dengan ID tidak lengkap → ditolak      | PATCH `/surveys/:id/questions/reorder`          | `{ orderedIds: [1, 2] }` (ada 3 pertanyaan)                         | 400 Bad Request; "harus berisi tepat seluruh id"                                |    P2     | Integ |   ⬜   |
| TC-QST-013 | Pertanyaan survei OPD lain — Admin OPD ditolak | GET `/surveys/:id/questions` sebagai OPD Dinkes | ID survei milik Disdukcapil                                         | 403 Forbidden                                                                   |    P0     | Integ |   ⬜   |

---

## Modul F — Pengisian Survei & Validasi Jawaban

Referensi: PRD §8.4 (FR-FILL-01 ~ FR-FILL-04), Routes §A.5

### F.1 Daftar Survei Aktif & Form Pengisian

| ID          | Skenario                                                        | Langkah                                   | Data Input                                               | Expected Result                                                    | Prioritas | Tipe  | Status |
| ----------- | --------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | :-------: | :---: | :----: |
| TC-FILL-001 | Daftar survei aktif untuk responden                             | GET `/surveys/active` sebagai responden   | —                                                        | 200 OK; hanya survei `status = aktif` dari semua OPD               |    P1     | Integ |   ⬜   |
| TC-FILL-002 | Survei non-aktif (draft/ditutup) tidak muncul                   | GET `/surveys/active`                     | —                                                        | Response TIDAK mengandung survei draft/ditutup                     |    P1     | Integ |   ⬜   |
| TC-FILL-003 | Ambil form pengisian (GET fill)                                 | GET `/surveys/:id/fill` sebagai responden | ID survei aktif                                          | 200 OK; judul, periode, pertanyaan terurut, `sudahMengisi` boolean |    P1     | Integ |   ⬜   |
| TC-FILL-004 | GET fill — survei non-aktif → 404                               | GET `/surveys/:id/fill`                   | Survei status `draft`                                    | 404 Not Found (jangan bocorkan keberadaan survei draft)            |    P1     | Integ |   ⬜   |
| TC-FILL-005 | GET fill — `sudahMengisi = true` jika single-submit & sudah isi | GET `/surveys/:id/fill`                   | User sudah pernah submit & `allowMultipleSubmit = false` | 200 OK; `sudahMengisi = true`                                      |    P1     | Integ |   ⬜   |

### F.2 Submit Jawaban Survei — Validasi Nilai Skala 1–4

| ID          | Skenario                                              | Langkah                       | Data Input                                                           | Expected Result                                             | Prioritas | Tipe  | Status |
| ----------- | ----------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- | :-------: | :---: | :----: |
| TC-FILL-010 | Submit jawaban lengkap dan valid                      | POST `/surveys/:id/responses` | Semua pertanyaan skala dijawab (nilai 1–4), pertanyaan teks opsional | 201 Created; respons + answers tersimpan                    |    P0     | Integ |   ⬜   |
| TC-FILL-011 | **Validasi: nilai skala di bawah batas (0)**          | POST `/surveys/:id/responses` | `{ answers: [{ questionId: 1, nilai: 0 }] }`                         | 400 Bad Request; "nilai harus antara 1 dan 4"               |    P0     | Unit  |   ⬜   |
| TC-FILL-012 | **Validasi: nilai skala di atas batas (5)**           | POST `/surveys/:id/responses` | `{ answers: [{ questionId: 1, nilai: 5 }] }`                         | 400 Bad Request; "nilai harus antara 1 dan 4"               |    P0     | Unit  |   ⬜   |
| TC-FILL-013 | **Validasi: nilai skala negatif (-1)**                | POST `/surveys/:id/responses` | `{ answers: [{ questionId: 1, nilai: -1 }] }`                        | 400 Bad Request                                             |    P0     | Unit  |   ⬜   |
| TC-FILL-014 | **Validasi: nilai skala desimal (2.5)**               | POST `/surveys/:id/responses` | `{ answers: [{ questionId: 1, nilai: 2.5 }] }`                       | 400 Bad Request; nilai harus integer                        |    P0     | Unit  |   ⬜   |
| TC-FILL-015 | **Validasi: nilai skala null untuk pertanyaan wajib** | POST `/surveys/:id/responses` | Pertanyaan skala tanpa `nilai`                                       | 400 Bad Request; "pertanyaan (skala) wajib diisi nilai 1-4" |    P0     | Unit  |   ⬜   |
| TC-FILL-016 | Pertanyaan skala wajib dijawab semua                  | POST `/surveys/:id/responses` | Hanya 7 dari 9 pertanyaan skala dijawab                              | 400 Bad Request; "Pertanyaan X wajib dijawab"               |    P0     | Integ |   ⬜   |
| TC-FILL-017 | Pertanyaan teks bersifat opsional                     | POST `/surveys/:id/responses` | Pertanyaan teks tanpa jawaban                                        | 201 Created; `teks = null` tersimpan                        |    P1     | Integ |   ⬜   |
| TC-FILL-018 | Jawaban ganda untuk pertanyaan sama → ditolak         | POST `/surveys/:id/responses` | 2 jawaban untuk `questionId: 1`                                      | 400 Bad Request; "Jawaban ganda untuk pertanyaan 1"         |    P1     | Unit  |   ⬜   |
| TC-FILL-019 | Jawaban untuk pertanyaan bukan milik survei ini       | POST `/surveys/:id/responses` | `questionId` dari survei lain                                        | 400 Bad Request; "bukan bagian dari survei ini"             |    P1     | Unit  |   ⬜   |
| TC-FILL-020 | Submit ke survei non-aktif → ditolak                  | POST `/surveys/:id/responses` | Survei status `draft`                                                | 404 Not Found                                               |    P1     | Integ |   ⬜   |

### F.3 Anti-Duplikat Submit & Kontrol Multi-Submit

| ID          | Skenario                                                  | Langkah                                  | Data Input                               | Expected Result                                                                                   | Prioritas |  Tipe  | Status |
| ----------- | --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- | :-------: | :----: | :----: |
| TC-FILL-030 | **Single-submit: user tidak bisa submit dua kali**        | POST `/surveys/:id/responses` 2×         | `allowMultipleSubmit = false`; user sama | Submit #1: 201 Created; Submit #2: 409 Conflict; "Anda sudah mengisi survei ini"                  |    P0     | Integ  |   ⬜   |
| TC-FILL-031 | **Multi-submit: user boleh submit berulang**              | POST `/surveys/:id/responses` 2×         | `allowMultipleSubmit = true`; user sama  | Keduanya 201 Created; 2 record `survey_responses`                                                 |    P1     | Integ  |   ⬜   |
| TC-FILL-032 | **Race condition: 2 submit bersamaan (concurrent)**       | 2 POST paralel dengan user & survei sama | `allowMultipleSubmit = false`            | Tepat 1 berhasil (201), 1 gagal (409); constraint `@@unique([surveyId, dedupeUserId])` menegakkan |    P0     | Integ  |   ⬜   |
| TC-FILL-033 | `dedupeUserId` diisi saat single-submit, null saat multi  | Cek DB setelah submit                    | —                                        | Single: `dedupe_user_id = userId`; Multi: `dedupe_user_id = NULL`                                 |    P1     |  Unit  |   ⬜   |
| TC-FILL-034 | Rate limiting pada submit (anti-spam)                     | POST `/surveys/:id/responses` 11× cepat  | —                                        | 429 Too Many Requests setelah 10 kali dalam 60 detik                                              |    P1     | Integ  |   ⬜   |
| TC-FILL-035 | Data survei tidak bisa diubah setelah submit (FR-FILL-04) | Coba PATCH / edit setelah submit         | —                                        | Tidak ada endpoint edit respons; data immutable                                                   |    P1     | Manual |   ⬜   |

### F.4 Daftar Respons (Admin)

| ID          | Skenario                                           | Langkah                                         | Data Input         | Expected Result                  | Prioritas | Tipe  | Status |
| ----------- | -------------------------------------------------- | ----------------------------------------------- | ------------------ | -------------------------------- | :-------: | :---: | :----: |
| TC-FILL-040 | Admin OPD lihat respons survei miliknya            | GET `/surveys/:id/responses` sebagai OPD Dinkes | Survei Dinkes      | 200 OK; daftar respons + jawaban |    P1     | Integ |   ⬜   |
| TC-FILL-041 | Admin OPD TIDAK bisa lihat respons survei OPD lain | GET `/surveys/:id/responses` sebagai OPD Dinkes | Survei Disdukcapil | 403 Forbidden                    |    P0     | Integ |   ⬜   |
| TC-FILL-042 | Admin Kabupaten bisa lihat respons semua OPD       | GET `/surveys/:id/responses` sebagai kabupaten  | Survei mana pun    | 200 OK                           |    P1     | Integ |   ⬜   |

---

## Modul G — Perhitungan IKM & Hasil

Referensi: PRD §8.5, Lampiran A (PermenPANRB 14/2017), Routes §A.5

### G.1 Perhitungan IKM — Validasi Rumus

| ID         | Skenario                                                    | Langkah                                | Data Input                               | Expected Result                                                           | Prioritas | Tipe  | Status |
| ---------- | ----------------------------------------------------------- | -------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-IKM-001 | **NRR per unsur = Σnilai ÷ jumlah responden**               | Hitung manual vs output service        | 3 responden, U1 nilai [4, 3, 4]          | NRR U1 = (4+3+4)/3 = 3.67                                                 |    P0     | Unit  |   ⬜   |
| TC-IKM-002 | **Bobot = 1 ÷ jumlah unsur**                                | Cek bobot                              | 9 unsur                                  | Bobot = 1/9 ≈ 0.1111                                                      |    P0     | Unit  |   ⬜   |
| TC-IKM-003 | **NRR tertimbang = NRR × bobot**                            | Hitung manual vs output                | NRR = 3.67, bobot = 0.1111               | NRR tertimbang = 0.4078                                                   |    P0     | Unit  |   ⬜   |
| TC-IKM-004 | **Nilai IKM = (Σ NRR tertimbang) × 25**                     | Hitung end-to-end                      | 9 unsur, semua NRR = 3.0                 | Σ(3.0 × 1/9) = 3.0; IKM = 3.0 × 25 = 75.0                                 |    P0     | Unit  |   ⬜   |
| TC-IKM-005 | **Mutu D: IKM 25.00 – 64.99**                               | Hitung mutu                            | Semua unsur nilai = 1 → IKM = 25.0       | Mutu = D ("Tidak Baik")                                                   |    P0     | Unit  |   ⬜   |
| TC-IKM-006 | **Mutu C: IKM 65.00 – 76.60**                               | Hitung mutu                            | IKM = 75.0                               | Mutu = C ("Kurang Baik")                                                  |    P0     | Unit  |   ⬜   |
| TC-IKM-007 | **Mutu B: IKM 76.61 – 88.30**                               | Hitung mutu                            | Semua unsur nilai = 3.25 → IKM = 81.25   | Mutu = B ("Baik")                                                         |    P0     | Unit  |   ⬜   |
| TC-IKM-008 | **Mutu A: IKM 88.31 – 100.00**                              | Hitung mutu                            | Semua unsur nilai = 4 → IKM = 100.0      | Mutu = A ("Sangat Baik")                                                  |    P0     | Unit  |   ⬜   |
| TC-IKM-009 | **Batas bawah IKM — semua nilai 1**                         | Hitung IKM                             | 9 unsur, semua responden beri 1          | IKM = (1.0 × 1/9 × 9) × 25 = 25.0; Mutu = D                               |    P0     | Unit  |   ⬜   |
| TC-IKM-010 | **Batas atas IKM — semua nilai 4**                          | Hitung IKM                             | 9 unsur, semua responden beri 4          | IKM = (4.0 × 1/9 × 9) × 25 = 100.0; Mutu = A                              |    P0     | Unit  |   ⬜   |
| TC-IKM-011 | **Edge case: batas mutu C/B (76.60 vs 76.61)**              | Hitung mutu                            | IKM = 76.60 → C; IKM = 76.61 → B         | Tepat sesuai tabel konversi                                               |    P0     | Unit  |   ⬜   |
| TC-IKM-012 | **Edge case: batas mutu B/A (88.30 vs 88.31)**              | Hitung mutu                            | IKM = 88.30 → B; IKM = 88.31 → A         | Tepat sesuai tabel konversi                                               |    P0     | Unit  |   ⬜   |
| TC-IKM-013 | Tanpa responden → IKM null, mutu null                       | GET `/surveys/:id/results`             | Survei tanpa respons                     | 200 OK; `nilaiIkm: null`, `mutu: null`, `jumlahResponden: 0`              |    P1     | Integ |   ⬜   |
| TC-IKM-014 | Tanpa pertanyaan unsur → IKM null                           | GET `/surveys/:id/results`             | Survei hanya pertanyaan kustom (non-IKM) | 200 OK; `nilaiIkm: null`, `nrrPerUnsur: []`                               |    P1     | Unit  |   ⬜   |
| TC-IKM-015 | Perhitungan hanya melibatkan pertanyaan `isIkmUnsur = true` | Survei 9 unsur + 3 kustom; GET results | —                                        | `nrrPerUnsur` hanya 9 item; pertanyaan kustom diabaikan dalam perhitungan |    P0     | Unit  |   ⬜   |

### G.2 Snapshot IKM & Hasil

| ID         | Skenario                                            | Langkah                                                     | Data Input            | Expected Result                                                                                    | Prioritas | Tipe  | Status |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-IKM-020 | Snapshot tersimpan saat survei ditutup              | Tutup survei → cek `ikm_results`                            | Survei dengan respons | Record `ikm_results` terbuat; `nrr_per_unsur` JSON, `nilai_ikm`, `mutu`, `jumlah_responden` terisi |    P0     | Integ |   ⬜   |
| TC-IKM-021 | Snapshot di-upsert (update jika sudah ada)          | Tutup → buka kembali → tutup lagi (jika transisi diizinkan) | —                     | Record `ikm_results` ter-update (bukan duplikat); `dihitung_pada` diperbarui                       |    P1     | Integ |   ⬜   |
| TC-IKM-022 | Snapshot tidak tersimpan jika tanpa responden       | Tutup survei tanpa respons                                  | —                     | TIDAK ada record `ikm_results` baru                                                                |    P1     | Integ |   ⬜   |
| TC-IKM-023 | Live-compute vs snapshot menghasilkan nilai identik | Hitung IKM live → tutup → bandingkan snapshot               | —                     | Nilai `nilaiIkm`, `mutu`, `nrrPerUnsur` identik                                                    |    P1     | Integ |   ⬜   |

### G.3 Dashboard & Ekspor

| ID         | Skenario                                           | Langkah                                        | Data Input         | Expected Result                                     | Prioritas | Tipe  | Status |
| ---------- | -------------------------------------------------- | ---------------------------------------------- | ------------------ | --------------------------------------------------- | :-------: | :---: | :----: |
| TC-IKM-030 | Hasil survei — Admin OPD lihat OPD sendiri         | GET `/surveys/:id/results` sebagai OPD Dinkes  | Survei Dinkes      | 200 OK; NRR per unsur + IKM + mutu                  |    P1     | Integ |   ⬜   |
| TC-IKM-031 | Hasil survei — Admin OPD TIDAK bisa lihat OPD lain | GET `/surveys/:id/results` sebagai OPD Dinkes  | Survei Disdukcapil | 403 Forbidden                                       |    P0     | Integ |   ⬜   |
| TC-IKM-032 | Dashboard agregat IKM semua OPD (Admin Kabupaten)  | GET `/dashboard/ikm`                           | Filter periode     | 200 OK; peringkat/perbandingan IKM seluruh OPD      |    P1     | Integ |   ⬜   |
| TC-IKM-033 | Ekspor laporan PDF/Excel/CSV                       | GET `/surveys/:id/results/export?format=excel` | —                  | 200 OK; file binary dengan content-type yang sesuai |    P2     | Integ |   ⬜   |

---

## Modul H — Pengaduan Masyarakat

Referensi: PRD §8.6 (FR-CMP-01 ~ FR-CMP-08), Routes §A.6

### H.1 Ajukan Pengaduan & Nomor Tiket Unik

| ID         | Skenario                                        | Langkah                                           | Data Input                                                                                  | Expected Result                                                                                                                                                                                                                                                               | Prioritas | Tipe  | Status |
| ---------- | ----------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-CMP-001 | Ajukan pengaduan dengan data lengkap            | POST `/complaints` sebagai responden              | `{ opdId: 1, kategori: "Pelayanan", judul: "Layanan lambat", uraian: "Detail keluhan..." }` | 201 Created; status default = `diterima`; **`ticketNo` terisi (unik)**                                                                                                                                                                                                        |    P0     | Integ |   ⬜   |
| TC-CMP-002 | **Nomor tiket unik — format konsisten**         | POST `/complaints` 3×                             | 3 pengaduan berbeda                                                                         | Setiap pengaduan punya `ticketNo` unik dan berformat konsisten. **Format nyata (diverifikasi 10 Agu 2026): `PGD` + `YYYYMMDD` + 4 karakter acak — contoh `PGD20260806CDPH`.** Bukan `TKT-20260729-001` seperti dugaan versi 1.0; perhatikan akhirannya acak, bukan nomor urut |    P0     | Integ |   ⬜   |
| TC-CMP-003 | **Nomor tiket unik — tidak pernah duplikat**    | POST `/complaints` 100× (batch/concurrent)        | —                                                                                           | Semua 100 `ticketNo` unik; unique constraint di DB menegakkan                                                                                                                                                                                                                 |    P0     | Integ |   ⬜   |
| TC-CMP-004 | **Nomor tiket unik — constraint DB**            | Insert langsung ke DB dengan `ticket_no` duplikat | SQL manual                                                                                  | Error unique violation; DB menolak                                                                                                                                                                                                                                            |    P0     | Unit  |   ⬜   |
| TC-CMP-005 | Pengaduan tanpa field wajib (judul kosong)      | POST `/complaints`                                | `{ opdId: 1, uraian: "..." }` tanpa `judul`                                                 | 400 Bad Request; validasi field wajib                                                                                                                                                                                                                                         |    P1     | Integ |   ⬜   |
| TC-CMP-006 | Pengaduan dengan lampiran (file upload)         | POST `/complaints` multipart/form-data            | File gambar JPG + data pengaduan                                                            | 201 Created; `complaint_attachments` record terbuat; `file_url`, `mime_type`, `size_bytes` terisi                                                                                                                                                                             |    P1     | Integ |   ⬜   |
| TC-CMP-007 | Pengaduan multi-lampiran                        | POST `/complaints`                                | 3 file lampiran                                                                             | 201 Created; 3 record `complaint_attachments`                                                                                                                                                                                                                                 |    P2     | Integ |   ⬜   |
| TC-CMP-008 | Pengaduan ke OPD yang tidak ada                 | POST `/complaints`                                | `opdId` tidak valid                                                                         | 400 Bad Request; "OPD tidak ditemukan"                                                                                                                                                                                                                                        |    P1     | Integ |   ⬜   |
| TC-CMP-009 | Admin OPD/Kabupaten TIDAK bisa ajukan pengaduan | POST `/complaints` sebagai admin                  | Token admin                                                                                 | 403 Forbidden; hanya responden yang bisa mengajukan                                                                                                                                                                                                                           |    P1     | Integ |   ⬜   |

### H.2 Daftar & Detail Pengaduan (Isolasi Data)

| ID         | Skenario                                          | Langkah                                                                             | Data Input              | Expected Result                                                         | Prioritas | Tipe  | Status |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-CMP-010 | **Responden hanya lihat pengaduannya sendiri**    | GET `/complaints` sebagai responden A                                               | —                       | 200 OK; hanya pengaduan milik responden A (bukan responden B)           |    P0     | Integ |   ⬜   |
| TC-CMP-011 | **Admin OPD hanya lihat pengaduan OPD-nya**       | GET `/complaints` sebagai OPD Dinkes                                                | —                       | 200 OK; hanya pengaduan `opdId = Dinkes`                                |    P0     | Integ |   ⬜   |
| TC-CMP-012 | **Admin Kabupaten lihat seluruh pengaduan**       | GET `/complaints` sebagai kabupaten                                                 | —                       | 200 OK; pengaduan dari semua OPD                                        |    P0     | Integ |   ⬜   |
| TC-CMP-013 | Detail pengaduan by ticket number                 | GET `/complaints/:ticketNo`                                                         | `ticketNo` valid        | 200 OK; detail lengkap termasuk status dan lampiran                     |    P1     | Integ |   ⬜   |
| TC-CMP-014 | Detail pengaduan — responden hanya akses miliknya | GET `/complaints/:ticketNo` sebagai responden B                                     | Tiket milik responden A | 403 Forbidden (atau 404 untuk keamanan)                                 |    P0     | Integ |   ⬜   |
| TC-CMP-015 | Detail pengaduan — Admin OPD hanya akses OPD-nya  | GET `/complaints/:ticketNo` sebagai OPD Dinkes                                      | Tiket ke Disdukcapil    | 403 Forbidden                                                           |    P0     | Integ |   ⬜   |
| TC-CMP-016 | **Pengaduan bersifat privat (FR-CMP-08)**         | GET `/complaints` — cek bahwa pengaduan responden X tidak terlihat oleh responden Y | —                       | Masing-masing responden hanya melihat milik sendiri; bukan forum publik |    P0     | Integ |   ⬜   |

### H.3 Status Pengaduan — Transisi Bertahap

| ID         | Skenario                                                   | Langkah                                           | Data Input                                            | Expected Result                                    | Prioritas | Tipe  | Status |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- | :-------: | :---: | :----: |
| TC-CMP-020 | Ubah status: Diterima → Diproses                           | PATCH `/complaints/:id/status` sebagai Admin OPD  | `{ status: "diproses" }`                              | 200 OK; status berubah                             |    P1     | Integ |   ⬜   |
| TC-CMP-021 | Ubah status: Diproses → Selesai                            | PATCH `/complaints/:id/status`                    | `{ status: "selesai" }`                               | 200 OK; status berubah                             |    P1     | Integ |   ⬜   |
| TC-CMP-022 | Ubah status: Diterima → Ditolak (dengan alasan)            | PATCH `/complaints/:id/status`                    | `{ status: "ditolak", alasan: "Bukan wewenang OPD" }` | 200 OK; status `ditolak`; alasan tersimpan         |    P1     | Integ |   ⬜   |
| TC-CMP-023 | Transisi ilegal: Selesai → Diterima                        | PATCH `/complaints/:id/status`                    | Status saat ini `selesai`                             | 400 Bad Request; transisi tidak diizinkan          |    P1     | Unit  |   ⬜   |
| TC-CMP-024 | Transisi ilegal: Ditolak → Diproses                        | PATCH `/complaints/:id/status`                    | Status saat ini `ditolak`                             | 400 Bad Request                                    |    P1     | Unit  |   ⬜   |
| TC-CMP-025 | Admin OPD hanya bisa ubah status pengaduan OPD-nya         | PATCH `/complaints/:id/status` sebagai OPD Dinkes | Pengaduan ke Disdukcapil                              | 403 Forbidden                                      |    P0     | Integ |   ⬜   |
| TC-CMP-026 | Responden TIDAK bisa ubah status pengaduan                 | PATCH `/complaints/:id/status` sebagai responden  | —                                                     | 403 Forbidden                                      |    P1     | Integ |   ⬜   |
| TC-CMP-027 | Admin Kabupaten hanya bisa memantau (read-only, FR-CMP-07) | PATCH `/complaints/:id/status` sebagai kabupaten  | —                                                     | 403 Forbidden (kabupaten read-only pada pengaduan) |    P1     | Integ |   ⬜   |

### H.4 Tanggapan/Percakapan Pengaduan

| ID         | Skenario                                                  | Langkah                                                  | Data Input                                | Expected Result                                        | Prioritas | Tipe  | Status |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------ | :-------: | :---: | :----: |
| TC-CMP-030 | Admin OPD menambah tanggapan                              | POST `/complaints/:id/replies` sebagai Admin OPD         | `{ pesan: "Sedang kami tindak lanjuti" }` | 201 Created; `author_id` = admin; `complaint_id` benar |    P1     | Integ |   ⬜   |
| TC-CMP-031 | Responden membalas tanggapan                              | POST `/complaints/:id/replies` sebagai responden pemilik | `{ pesan: "Terima kasih, ditunggu" }`     | 201 Created; `author_id` = responden                   |    P1     | Integ |   ⬜   |
| TC-CMP-032 | Riwayat tanggapan terurut kronologis                      | GET `/complaints/:id/replies`                            | —                                         | 200 OK; array replies urut `created_at` ASC            |    P1     | Integ |   ⬜   |
| TC-CMP-033 | Responden lain TIDAK bisa baca/balas pengaduan orang lain | POST `/complaints/:id/replies` sebagai responden B       | Pengaduan milik responden A               | 403 Forbidden                                          |    P0     | Integ |   ⬜   |
| TC-CMP-034 | Admin OPD hanya bisa balas pengaduan OPD-nya              | POST `/complaints/:id/replies` sebagai OPD Dinkes        | Pengaduan ke Disdukcapil                  | 403 Forbidden                                          |    P0     | Integ |   ⬜   |

---

## Modul I — Audit Log

Referensi: PRD NFR (Auditabilitas), Routes §A.7

| ID         | Skenario                             | Langkah                               | Data Input | Expected Result                                                                     | Prioritas | Tipe  | Status |
| ---------- | ------------------------------------ | ------------------------------------- | ---------- | ----------------------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-AUD-001 | Aksi admin tercatat di audit log     | Buat survei → cek `audit_logs`        | —          | Record: `actor_id`, `aksi = CREATE`, `entitas = survey`, `detail` JSON, `timestamp` |    P2     | Integ |   ⬜   |
| TC-AUD-002 | Ubah status survei tercatat          | PATCH status survei → cek audit       | —          | Record: `aksi = UPDATE_STATUS`, detail berisi status lama & baru                    |    P2     | Integ |   ⬜   |
| TC-AUD-003 | Buat akun admin tercatat             | POST `/users` → cek audit             | —          | Record: `aksi = CREATE`, `entitas = user`                                           |    P2     | Integ |   ⬜   |
| TC-AUD-004 | Nonaktifkan akun tercatat            | PATCH `/users/:id/status` → cek audit | —          | Record tercatat                                                                     |    P2     | Integ |   ⬜   |
| TC-AUD-005 | Daftar audit log (Admin Kabupaten)   | GET `/audit-logs` sebagai kabupaten   | —          | 200 OK; daftar log dengan pagination                                                |    P2     | Integ |   ⬜   |
| TC-AUD-006 | Admin OPD TIDAK bisa akses audit log | GET `/audit-logs` sebagai admin OPD   | —          | 403 Forbidden                                                                       |    P2     | Integ |   ⬜   |
| TC-AUD-007 | Responden TIDAK bisa akses audit log | GET `/audit-logs` sebagai responden   | —          | 403 Forbidden                                                                       |    P2     | Integ |   ⬜   |

---

## Modul J — Kontrak Parameter Boolean (Cross-Cutting)

Referensi: temuan [BUG-020](BUG_REPORTS.md#bug-020), `apps/api/src/app.setup.ts:289`

**(15 Oktober 2026)** Modul ini lahir dari satu cacat, bukan dari satu fitur, dan
itu sebabnya ia cross-cutting: tiga endpoint di tiga modul berbeda menolak nilai
`false` pada parameter boolean-nya, dan ketiganya karena sebab yang sama.

`app.setup.ts:289` menyalakan `transformOptions.enableImplicitConversion`.
class-transformer lalu mengubah nilai masuk memakai tipe hasil refleksi, dan
untuk `boolean` ia menjalankan `Boolean(value)`; `Boolean('false')` bernilai
**`true`**. Konversi itu berjalan SEBELUM `@Transform` milik DTO, sehingga
`@Transform` tak pernah melihat string aslinya. Nilai `'true'` lolos benar
secara kebetulan, `'false'` tidak.

Terukur langsung atas class-transformer dengan konversi implisit menyala, bukan
disimpulkan dari membaca kode:

| Bentuk dekorator                     | `'false'` | `'true'` |
| ------------------------------------ | --------- | -------- |
| `@Transform` saja                    | `true`    | `true`   |
| `@Type(() => Boolean)`               | `true`    | `true`   |
| `@Type(() => String)` + `@Transform` | `false`   | `true`   |

Medan keempat, `isActive` pada `GET /opd`, cacat dengan cara yang sama; kasus
ujinya ada sebagai TC-OPD-003 di Modul B. **Keempat medan sudah diperbaiki
15 Oktober 2026** memakai bentuk baris ketiga tabel di atas, dan ketiganya di
bawah kini punya uji sendiri yang dibuktikan merah lebih dulu.

| ID          | Skenario                                             | Langkah                                                 | Data Input                   | Expected Result                                                                                                                              | Prioritas | Tipe  | Status |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----- | ------ |
| TC-BOOL-001 | `isAnonim=false` pada pengaduan tidak menjadi anonim | POST `/complaints` multipart sebagai responden          | medan `isAnonim` = `"false"` | 201 Created; `isAnonim` tersimpan **false** dan identitas pelapor tetap terekam pada jalur baca admin — `complaints.e2e:473`                  | P2        | Integ | ✅     |
| TC-BOOL-002 | `tanpaOpd=false` tidak menyaring daftar pengaduan    | GET `/complaints?tanpaOpd=false` sebagai kabupaten      | `tanpaOpd=false`             | 200 OK; daftar memuat pengaduan ber-OPD, dan `tanpaOpd=true` tetap menyaring — `complaints.e2e:509`                                           | P3        | Integ | ✅     |
| TC-BOOL-003 | `unreadOnly=false` tidak menyaring daftar notifikasi | GET `/notifications?unreadOnly=false` sebagai responden | `unreadOnly=false`           | 200 OK; daftar memuat yang sudah DAN belum dibaca, dan `unreadOnly=true` tetap menyaring — `notifications.e2e:291`                            | P3        | Integ | ✅     |

> **(15 Oktober 2026) KETIGANYA DIPERBAIKI pada hari yang sama**, satu dekorator
> per medan, dan ketiga ujinya dibuktikan merah lebih dulu oleh cacatnya sendiri
> -- bukan oleh mutasi, sebab perilaku yang diuji memang belum pernah benar.
> `isAnonim=false` menerima `true`; `tanpaOpd=false` hanya mengembalikan
> pengaduan tanpa tujuan; `unreadOnly=false` menghilangkan notifikasi yang sudah
> dibaca. Dua yang terakhir dituntut dari DUA ARAH, sehingga membuang
> penyaringnya pun tetap memerahkan ujinya. Rinciannya di
> [BUG-020](BUG_REPORTS.md#bug-020).
>
> Catatan di bawah ditulis SEBELUM perbaikannya dan disimpan apa adanya, karena
> ia menjelaskan mengapa cacat ini dapat bertahan tanpa ada yang memerah --
> keterangan yang hilang bila catatannya dihapus begitu cacatnya tertutup.
>
> **Ketiganya TAK TERJANGKAU dari antarmuka hari ini, dan itu sebabnya suite
> yang ada tidak memerah karenanya.** Diperiksa satu per satu, bukan diandaikan:
>
> - `complaints.api.js:35-37` hanya menyertakan medannya bila anonim —
>   `if (dto.isAnonim) { formData.append('isAnonim', 'true'); }`. Nilai `'false'`
>   tak pernah terkirim.
> - `tanpaOpd` tak punya satu pun pemanggil di `apps/web/src`.
> - `NotificationHistoryScreen.jsx:112` memakai
>   `...(unreadOnly ? { unreadOnly: true } : {})`, jadi medannya dihilangkan
>   alih-alih dikirim `false`.
>
> Yang terjangkau adalah **kontrak API-nya**: ketiga medan terdaftar
> `@ApiPropertyOptional` dan karena itu tampil di `/api/docs`, sehingga siapa pun
> yang memakainya dari Swagger, dari skrip, atau dari kode frontend baru akan
> mendapat kebalikan dari yang diminta tanpa satu pun galat. Itu pula yang
> terjadi pada `isActive`: cacatnya tersembunyi sampai sebuah uji benar-benar
> mengirim `false`.
>
> **TC-BOOL-001 pantas dinilai lebih berat daripada prioritasnya menyiratkan.**
> Bila jalur itu suatu saat terjangkau, akibatnya bukan daftar yang salah
> tersaring melainkan pengaduan yang dimaksudkan bernama tercatat anonim, dan
> `complaints.service.ts:731` lalu menyamarkan identitas pelapornya pada seluruh
> jalur baca. P2 dan bukan P1 hanya karena hari ini tak ada yang dapat
> memicunya.

---

## Modul X — RBAC & Isolasi Data OPD (Cross-Cutting)

Referensi: PRD §6 (Tabel Hak Akses), PRD §10 (NFR Keamanan)

### X.1 Matriks Akses per Peran — Endpoint Kunci

> Setiap baris menguji bahwa peran tertentu **mendapat response yang benar** pada endpoint tersebut.

> **KOLOM "Superuser" MENJELASKAN PERAN YANG SUDAH TIDAK ADA — dan kolom itu
> SENGAJA TIDAK DIBUANG, 13 Oktober 2026.**
>
> Kuasa peran itu pindah ke `kabupaten` pada 15 September 2026. Pada delapan dari
> empat belas baris, kedua kolom sudah sama, jadi tak ada yang berubah. Pada
> **enam** baris keduanya BERBEDA, dan di situlah pekerjaannya: kolom Kabupaten
> yang harus dijalankan ulang, sebab yang dahulu hanya boleh dilakukan Superuser
> kini boleh dilakukan Kabupaten.
>
> Keenam baris itu: TC-RBAC-005, 006, 008, 009, 011, 012.
>
> Membuang kolomnya akan menghapus justru informasi yang menunjukkan baris mana
> yang perlu diperiksa.
>
> **KEENAM BARIS ITU SUDAH DIPERIKSA TERHADAP KODE, 14 Oktober 2026.** Tiga
> kolom Kabupaten ternyata salah, tiga benar:
>
> | Baris | Endpoint | Kolom Kab | Kenyataan | Bukti |
> | --- | --- | --- | --- | --- |
> | TC-RBAC-005 | `POST /users` (role=kabupaten) | `❌ 403` | **201** | `users.e2e-spec.ts:97` |
> | TC-RBAC-006 | `POST /surveys` | `❌ 403` | **lolos gerbang**; 400 tanpa `opdId` | `surveys.e2e-spec.ts:92` |
> | TC-RBAC-008 | `GET /surveys/active` | `❌ 403` | benar, `@Roles(Role.responden)` | kini `peran-matriks-rbac.e2e-spec.ts:64` dan `:71` |
> | TC-RBAC-009 | `POST /surveys/:id/responses` | `❌ 403` | benar, `@Roles(Role.responden)` | kini `peran-matriks-rbac.e2e-spec.ts:86` dan `:96` |
> | TC-RBAC-011 | `POST /complaints` | `❌ 403` | benar, `@Roles(Role.responden)` | kini `peran-matriks-rbac.e2e-spec.ts:211` dan `:223` |
> | TC-RBAC-012 | `PATCH /complaints/:id/status` | `❌ 403` | **bukan 403 peran** | `complaints.e2e-spec.ts:815` |
>
> TC-RBAC-012 paling halus salahnya. Rutenya
> `@Roles(Role.kabupaten, Role.opd)`, jadi Kabupaten **lolos gerbang peran**; yang
> menolaknya aturan bisnis, bukan peran. Uji yang ada memakai `asKabupaten()` dan
> menuntut **400** "statusnya tidak dapat diubah sebelum diteruskan". Jalur
> SUKSES-nya — Kabupaten mengubah status pengaduan yang sudah diteruskan — tak
> pernah diuji sampai 14 Oktober 2026, dan kini ada di
> `complaints.e2e-spec.ts:880`.
>
> **UJINYA DITULIS HARI YANG SAMA, 14 Oktober 2026**, di
> `apps/api/test/peran-matriks-rbac.e2e-spec.ts` (enam uji) dan satu sisipan di
> `complaints.e2e-spec.ts:880`. Masing-masing memeriksa PESAN penolakannya,
> bukan cuma status 403, sebab penolakan di sini dapat datang dari dua lapis dan
> uji yang berhenti di status tetap hijau walau `@Roles` dicabut. Terbukti lewat
> mutasi, satu dekorator per jalan, semuanya dipulihkan: tanpa gerbangnya
> `GET /surveys/active` menjawab 200, `POST /surveys/:id/responses` menjawab 400
> dari lapis validasi, `POST /complaints` menjawab 201, dan
> `PATCH /complaints/:id/status` yang dipersempit ke `@Roles(Role.opd)` menjawab
> 403. Setiap kali hanya uji yang bersangkutan memerah.
>
> **Satu koreksi atas kotak ini sendiri.** Kolom Bukti di atas semula berbunyi
> "belum ada uji" untuk ketiga barisnya, dan itu terlalu mutlak. Yang benar:
> TC-RBAC-008 memang tak punya uji sama sekali untuk Kabupaten maupun Admin OPD,
> tetapi sel Admin OPD pada TC-RBAC-009 sudah diuji di
> `responses.e2e-spec.ts:277` dan pada TC-RBAC-011 di
> `complaints.e2e-spec.ts:458` — keduanya hanya memeriksa status, tanpa pesan,
> jadi keduanya tetap hijau bila gerbang perannya hilang. Yang betul-betul
> kosong adalah sel KABUPATEN pada ketiga baris itu.
>
> **Ketiga sel yang salah sudah DIPERBAIKI di tabel di bawah**, bukan cuma
> dicatat di sini: TC-RBAC-005 menjadi `✅ 201`, TC-RBAC-006 menjadi
> `✅ 201 (wajib kirim opdId)`, dan TC-RBAC-012 menjadi
> `✅ 200 (sesudah diteruskan)`. Keterangan dalam kurung itu bukan hiasan:
> Kabupaten tak punya `opd_id` tersirat seperti Admin OPD, jadi tanpa `opdId` ia
> dijawab 400 (`surveys.e2e-spec.ts:92`), dan status pengaduan tak dapat diubah
> sebelum diteruskan oleh peran apa pun (`complaints.e2e-spec.ts:817`). Tanpa
> kurung itu, `✅ 201` dan `✅ 200` menjadi harapan baru yang salah dengan cara
> yang lain.

| ID          | Endpoint                       | Superuser |          Kabupaten          |      Admin OPD      | Responden | Tipe  | Status |
| ----------- | ------------------------------ | :-------: | :-------------------------: | :-----------------: | :-------: | :---: | :----: |
| TC-RBAC-001 | `GET /opd`                     |   ✅ 200   |            ✅ 200            |        ✅ 200        |   ✅ 200   | Integ |   ✅    |
| TC-RBAC-002 | `POST /opd/sync`               |     —     |            ✅ 200            |        ❌ 403        |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-003 | `GET /users`                   |   ✅ 200   |            ✅ 200            |        ❌ 403        |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-004 | `POST /users` (role=opd)       |   ✅ 201   |            ✅ 201            |        ❌ 403        |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-005 | `POST /users` (role=kabupaten) |   ✅ 201   |            ✅ 201            |        ❌ 403        |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-006 | `POST /surveys`                |   ✅ 201   | ✅ 201 (wajib kirim `opdId`) |        ✅ 201        |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-007 | `GET /surveys`                 |   ✅ 200   |            ✅ 200            | ✅ 200 (OPD sendiri) |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-008 | `GET /surveys/active`          |   ✅ 200   |            ❌ 403            |        ❌ 403        |   ✅ 200   | Integ |   ✅    |
| TC-RBAC-009 | `POST /surveys/:id/responses`  |     —     |            ❌ 403            |        ❌ 403        |   ✅ 201   | Integ |   ✅    |
| TC-RBAC-010 | `GET /surveys/:id/results`     |   ✅ 200   |            ✅ 200            | ✅ 200 (OPD sendiri) |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-011 | `POST /complaints`             |     —     |            ❌ 403            |        ❌ 403        |   ✅ 201   | Integ |   ✅    |
| TC-RBAC-012 | `PATCH /complaints/:id/status` |   ✅ 200   | ✅ 200 (sesudah diteruskan)  | ✅ 200 (OPD sendiri) |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-013 | `GET /audit-logs`              |   ✅ 200   |            ✅ 200            |        ❌ 403        |   ❌ 403   | Integ |   ✅    |
| TC-RBAC-014 | `GET /dashboard/ikm`           |   ✅ 200   |            ✅ 200            |        ❌ 403        |   ❌ 403   | Integ |   ✅    |

> **(14 Oktober 2026) Tiga baris berstatus ✅, dan hanya tiga.** TC-RBAC-008,
> 009, dan 011 kini punya uji untuk setiap kolom yang masih hidup: Kabupaten dan
> Admin OPD di `peran-matriks-rbac.e2e-spec.ts`, Responden di
> `responses.e2e-spec.ts:159` dan `:222` serta `complaints.e2e-spec.ts:176`.
> Kolom Superuser pada ketiga baris itu tidak dihitung karena peran itu sudah
> dibatalkan di kotak kepala dokumen ini.
>
> **TC-RBAC-012 kini ✅**, sesudah selnya diperbaiki. Ketiga kolomnya punya uji
> bernama: Kabupaten di `complaints.e2e-spec.ts:880` dan `:817` untuk cabang
> 400-nya, Admin OPD di `:534`, Responden di `:568`.
>
> **TC-RBAC-005 dan 006 kini ✅ juga.** Sel RESPONDEN keduanya sempat kosong --
> disisir 14 Oktober 2026 atas seluruh `apps/api/test/`, tak satu pun berkas
> memukul `POST /users` atau `POST /surveys` sebagai responden -- dan ujinya
> ditulis hari itu di `peran-matriks-rbac.e2e-spec.ts:139` dan `:154`. Sel
> lainnya: Kabupaten di `users.e2e-spec.ts:97` dan `surveys.e2e-spec.ts:107`,
> Admin OPD di `users.e2e-spec.ts:242` dan `surveys.e2e-spec.ts:75`.
>
> **Satu temuan yang lahir dari mutasi uji TC-RBAC-005, dan ia tentang suite yang
> sudah ada.** Mencabut `@Roles(Role.kabupaten)` dari tingkat kelas
> `UsersController` TIDAK memerahkan satu pun dari 30 uji di
> `users.e2e-spec.ts`: seluruh suite manajemen pengguna buta terhadap hilangnya
> gerbang peran di controllernya, sebab `UsersService` menolak di lapis kedua
> dengan pesan yang berbeda dan statusnya tetap 403. Uji baru itulah yang
> menangkapnya, dan hanya karena ia memeriksa pesannya.
>
> **(14 Oktober 2026) DELAPAN BARIS SISANYA IKUT DIPETAKAN, dua puluh empat sel,
> badan ujinya dibaca satu per satu.** Hasilnya: empat baris lulus, dua baris
> ternyata SALAH, dan tiga sel tak pernah diuji.
>
> Lulus, dengan sel pembuktinya:
>
> | Baris | Kabupaten | Admin OPD | Responden |
> | --- | --- | --- | --- |
> | TC-RBAC-003 `GET /users` | `users.e2e:126`, `peran-kabupaten-penuh:46` | `users.e2e:229`, `peran-kabupaten-penuh:66` + pesan | `peran-kabupaten-penuh:75` |
> | TC-RBAC-004 `POST /users` (role=opd) | `users.e2e:84` | `users.e2e:242` | `peran-matriks-rbac:139` |
> | TC-RBAC-013 `GET /audit-logs` | `peran-kabupaten-penuh:84` | `audit.e2e:216`, `peran-kabupaten-penuh:91` + pesan | `audit.e2e:221` + pesan |
> | TC-RBAC-014 `GET /dashboard/ikm` | `ikm.e2e:318` | `ikm.e2e:306` | `ikm.e2e:312` |
>
> **Sel Responden pada TC-RBAC-004 bersandar pada PENALARAN, bukan uji khusus.**
> Uji yang disitir mengirim `roles: ['responden']`, bukan `['opd']` seperti bunyi
> barisnya. Sandaran itu sah karena gerbang peran menolak sebelum muatan
> permintaan dibaca sama sekali, jadi isi `roles` tak dapat mengubah hasilnya --
> tetapi itu tetap kesimpulan, dan ditulis begitu alih-alih berpura-pura ada uji
> tersendiri untuk baris 004.
>
> **Penolakan pada TC-RBAC-014 hanya memeriksa status, tanpa pesan.** Bentuk itu
> terbukti dua kali hari ini dapat tetap hijau walau `@Roles`-nya dicabut.
> Tercakup, tetapi tidak sekuat baris 003 dan 013.
>
> **DUA SEL PADA TC-RBAC-001 SALAH, DAN SUDAH DIPERBAIKI DI TABEL.** Barisnya
> menuntut Admin OPD dan Responden ditolak 403 pada `GET /opd`; kenyataannya
> **200 untuk keduanya**, dan itu disengaja. `opd.controller.ts:37` memang tanpa
> `@Roles`, dengan docblock yang menyebutnya terbuka bagi seluruh peran
> terautentikasi, dan dua uji menamai alasannya: `opd.e2e:89` ("INT-18: list
> terbuka semua peran terautentikasi") serta `opd.e2e:97` ("dibutuhkan dropdown
> OPD tujuan saat buat pengaduan"). Sel Kabupaten-nya terbukti di `opd.e2e:77`.
> Ketiga sel kini benar dan teruji, jadi barisnya lulus.
>
> **TC-RBAC-002 DITULIS ULANG MENJADI `POST /opd/sync` (14 Oktober 2026).**
> Tak ada `POST /opd` di aplikasi ini, dan tak akan ada: daftar OPD disinkronkan
> dari Helpdesk dan bersifat baca saja. Baris lamanya salah pada endpoint,
> metode, dan statusnya sekaligus.
>
> Barisnya tidak dibuang, dan itu keputusan: `POST /opd/sync` adalah satu-satunya
> jalur TULIS atas sumber daya OPD, persis yang pantas dijaga matriks RBAC.
> Membuangnya menghapus cakupan rute yang nyata.
>
> Statusnya **200, bukan 201**: pelarinya ber-`@HttpCode(HttpStatus.OK)` dan
> mengembalikan laporan sinkronisasi, bukan sumber daya baru. Sel pembuktinya:
> Kabupaten `opd.e2e:138`, Admin OPD `opd.e2e:172`, Responden
> `peran-matriks-rbac:259` -- yang terakhir ditulis hari ini, karena sel itu tak
> pernah diuji.
>
> **Kolom Superuser diisi `—`, bukan ditebak.** Peran itu sudah dibatalkan di
> kotak kepala dokumen ini, dan tak ada uji yang dapat menyentuhnya karena nilai
> enumnya dibuang 15 September 2026.
>
> **Mutasi pembuktinya sengaja dipersempit, dan itu perlu dicatat.**
> `@Roles(Role.kabupaten)` di `opd.controller.ts:48` diganti menjadi
> `@Roles(Role.opd)`: responden tetap ditolak 403, tetapi pesannya menjadi
> "Sumber daya ini hanya untuk peran: opd", sehingga ujinya memerah pada PESANnya
> sementara handler-nya tak pernah berjalan. Terukur: tepat satu uji merah,
> sepuluh lainnya tetap hijau.
>
> Mencabut `@Roles` sama sekali -- mutasi yang dipakai lima uji lain di berkas
> itu -- TIDAK dijalankan. Tanpa gerbang, permintaan responden akan benar-benar
> menjalankan `syncFromSource()`: satu panggilan keluar ke API Helpdesk
> produksi, lalu penulisan baris OPD sungguhan ke `skm_uji` berikut penonaktifan
> OPD yang tak ada di sumbernya. `peran-matriks-rbac.e2e-spec.ts` tidak memasang
> `StubOpdSource` seperti `opd.e2e-spec.ts`. Bukti yang lebih mahal daripada
> nilainya bukan bukti yang lebih baik, dan batas itu lebih baik tertulis
> daripada dilewati diam-diam.
>
> Sel Admin OPD-nya hanya memeriksa STATUS, tanpa pesan (`opd.e2e:172`).
> Tercakup, tetapi tidak sekuat sel Responden -- bentuk berstatus-saja terbukti
> dua kali hari ini dapat tetap hijau walau gerbangnya hilang.
>
> **TIGA SEL YANG KOSONG ITU DITULIS HARI YANG SAMA**, jadi TC-RBAC-007 dan 010
> ikut lulus. Responden pada `GET /surveys` di `peran-matriks-rbac:191`,
> Responden pada `GET /surveys/:id/results` di `:200`, dan Kabupaten pada rute
> hasil di `ikm.e2e:212` -- yang terakhir ditaruh di `ikm.e2e-spec.ts`, bukan di
> berkas matriks, sebab ia butuh survei sungguhan dan fixture-nya sudah ada di
> sana. Sel lain kedua baris itu terbukti di `public-surveys:579`,
> `surveys.e2e:125`, dan `ikm.e2e:176`.
>
> **Dua hal yang diukur saat membuktikan uji itu dapat memerah, dan keduanya
> membantah dugaan yang ditulis sebelumnya.** Mencabut `@Roles` dari
> `GET /surveys` TIDAK membuat warga dilayani: `opdWhereFilter` sendiri melempar
> `ForbiddenException` bagi peran selain `kabupaten` dan `opd`
> (`opd-scope.util.ts:27`), jadi statusnya tetap 403 dan hanya PESANnya berubah
> menjadi "Peran tidak memiliki akses ke sumber daya OPD". Uji berstatus-saja
> akan tetap hijau di sana. Dan pada rute hasil, mencabut `@Roles` menghasilkan
> 404, bukan 403, sebab surveinya dicari lebih dulu dan id yang dipakai uji itu
> memang tak ada -- pada id yang SUNGGUH ADA, `assertOpdAccess` yang menjawab
> 403, dan uji berstatus-saja kembali tak dapat membedakannya.
>
> EMPAT BELAS dari empat belas baris lulus sekarang, sesudah TC-RBAC-002
> ditulis ulang menjadi `POST /opd/sync` dan sel Respondennya diuji. Hitungan
> ini dihitung ulang dari kolom Status, bukan dikira.

### X.2 Isolasi Data OPD — Skenario Negatif Krusial

| ID         | Skenario                                                            | Langkah                                                                 | Expected Result                                             |                         Prioritas                          | Tipe  | Status |
| ---------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- | :--------------------------------------------------------: | :---: | :----: |
| TC-ISO-001 | **Admin OPD Dinkes TIDAK bisa lihat survei Disdukcapil**            | GET `/surveys/:id` (survei Disdukcapil) sebagai OPD Dinkes              | 403 Forbidden                                               |                             P0                             | Integ |   ⬜   |
| TC-ISO-002 | **Admin OPD Dinkes TIDAK bisa lihat pertanyaan survei Disdukcapil** | GET `/surveys/:id/questions` (survei Disdukcapil) sebagai OPD Dinkes    | 403 Forbidden                                               |                             P0                             | Integ |   ⬜   |
| TC-ISO-003 | **Admin OPD Dinkes TIDAK bisa lihat respons survei Disdukcapil**    | GET `/surveys/:id/responses` (survei Disdukcapil) sebagai OPD Dinkes    | 403 Forbidden                                               |                             P0                             | Integ |   ⬜   |
| TC-ISO-004 | **Admin OPD Dinkes TIDAK bisa lihat hasil IKM survei Disdukcapil**  | GET `/surveys/:id/results` (survei Disdukcapil) sebagai OPD Dinkes      | 403 Forbidden                                               |                             P0                             | Integ |   ⬜   |
| TC-ISO-005 | **Admin OPD Dinkes TIDAK bisa buat survei untuk Disdukcapil**       | POST `/surveys` sebagai OPD Dinkes (tidak bisa override `opdId`)        | `opdId` selalu diambil dari user.opdId; TIDAK bisa override |                             P0                             | Integ |   ⬜   |
| TC-ISO-006 | **Admin OPD Dinkes TIDAK bisa ubah status pengaduan Disdukcapil**   | PATCH `/complaints/:id/status` sebagai OPD Dinkes                       | Pengaduan Disdukcapil → 403 Forbidden                       |                             P0                             | Integ |   ⬜   |
| TC-ISO-007 | **Admin OPD Dinkes TIDAK bisa balas pengaduan Disdukcapil**         | POST `/complaints/:id/replies` sebagai OPD Dinkes                       | Pengaduan Disdukcapil → 403 Forbidden                       |                             P0                             | Integ |   ⬜   |
| TC-ISO-008 | **Admin OPD tanpa `opdId` (orphan) → Forbidden**                    | Akses endpoint apa pun yang butuh OPD                                   | Admin OPD dengan `opdId = null`                             |  403 Forbidden; "Akun OPD tidak tertaut ke OPD mana pun"   |  P0   | Integ  | ⬜  |
| TC-ISO-009 | 🔁 **PELAKUNYA BERGANTI 13 Okt 2026** — **Kabupaten bisa akses semua data cross-OPD** | GET survei/pertanyaan/respons/hasil dari OPD mana pun sebagai kabupaten | —                                                           |               200 OK; tidak ada batasan OPD. Masih sahih: `hasFullAccess` di `role.util.ts` adalah satu-satunya definisi "boleh menembus batas OPD", dan isinya kini hanya `kabupaten`                |  P0   | Integ  | ⬜  |
| TC-ISO-010 | **Admin Kabupaten bisa lihat (read) semua data cross-OPD**          | GET survei/pertanyaan/respons/hasil dari OPD mana pun sebagai kabupaten | —                                                           | 200 OK; kabupaten bersifat read-only terhadap hasil survei |  P0   | Integ  | ⬜  |
| TC-ISO-011 | **Admin Kabupaten TIDAK bisa membuat survei (read-only, PRD §6)**   | POST `/surveys` sebagai kabupaten                                       | —                                                           |    403 Forbidden; kabupaten tidak punya hak buat survei    |  P0   | Integ  | ⬜  |

### X.3 Keamanan Umum

| ID         | Skenario                                   | Langkah                                            | Expected Result                                                   | Prioritas |  Tipe  | Status |
| ---------- | ------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------- | :-------: | :----: | :----: |
| TC-SEC-001 | Request tanpa token → 401                  | GET `/auth/me` tanpa header Authorization          | 401 Unauthorized; "Autentikasi diperlukan"                        |    P0     | Integ  |   ⬜   |
| TC-SEC-002 | Request dengan token invalid/expired → 401 | GET `/auth/me` dengan token cacat                  | 401 Unauthorized                                                  |    P0     | Integ  |   ⬜   |
| TC-SEC-003 | Route @Public tidak butuh token            | GET `/` (health check)                             | 200 OK tanpa token                                                |    P1     | Integ  |   ⬜   |
| TC-SEC-004 | CORS dikonfigurasi sesuai                  | OPTIONS request dari origin yang diizinkan         | Header CORS benar; origin liar ditolak                            |    P2     | Manual |   ⬜   |
| TC-SEC-005 | SQL Injection pada parameter query         | GET `/opd?search=' OR 1=1 --`                      | 200 OK; tidak ada data bocor (parameterized query)                |    P1     | Integ  |   ⬜   |
| TC-SEC-006 | XSS pada input teks survei                 | POST pertanyaan dengan `<script>alert(1)</script>` | Teks tersimpan sebagai string biasa; tidak dieksekusi di frontend |    P1     |  E2E   |   ⬜   |

---

## Modul Y — UI/UX Frontend & Validasi Client-Side (Component & E2E)

> **Status diperbarui 11 Agustus 2026** berdasarkan eksekusi nyata `pnpm test` di
> `apps/web` (11 suite, 46 test, seluruhnya lulus, diverifikasi dua run berturut).
> Pemetaan kasus uji ke berkas uji ada di **Y.1**.
>
> `🟡` dipakai ketika otomatisasi baru menutup **sebagian** langkah/ekspektasi yang
> tertulis — bukan berarti test-nya merah. Alasannya dicatat di kolom Expected Result.

| ID        | Skenario                                                | Langkah                                                                                                                    | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                           | Prioritas |   Tipe    | Status |
| --------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :-------: | :----: |
| TC-FE-002 | **Proteksi Halaman (Routing)**                          | Buka `/dashboard` tanpa cookie `token` → lalu ulangi tiap route pada matriks A.5.1                                         | Dialihkan ke beranda `/` (**bukan** portal SSO eksternal — belum ada). **LULUS sejak 2 September 2026** — `e2e/proteksi-route.spec.js` menyapu 8 rute × 4 kondisi peran di peramban sungguhan. Sapuan itu memasang pengintai **429**: begitu batas laju backend tertembus, `GET /auth/me` ditolak, aplikasi menghapus sesinya, dan SELURUH rute memantul ke `/` — persis seperti penjagaan yang bekerja sempurna. Tanpa pengintai itu sapuan yang kena batas laju akan terbaca hijau untuk alasan yang sama sekali salah. Detail per peran: **TC-AUTH-055** |    P0     |    E2E    |   ✅   |
| TC-FE-003 | **Validasi Pengisian SKM (Nilai 1-4)**                  | Di form survei, coba masukkan nilai 5 atau -1 (jika berupa radio button, pastikan tidak bisa edit DOM untuk kirim nilai 5) | Input ditolak oleh antarmuka (menampilkan pesan error seketika). **Tercakup sebagian:** otomatisasi memastikan tepat 4 radio bernilai 1–4 dirender, sehingga nilai lain tak bisa dipilih lewat UI. Manipulasi DOM belum diuji — pertahanan sesungguhnya ada di TC-FILL-011 s/d TC-FILL-015 (backend). **Diperluas 2 Sep 2026:** kartu kini bercabang menurut tipe pertanyaan, jadi cakupannya bertambah — label skala tersuai tetap mengirim SKOR 1–4 (bukan id opsi), dan tipe tak dikenal memunculkan peringatan, bukan layar kosong                                                                                                                      |    P0     | Component |   🟡   |
| TC-FE-004 | **Validasi Field Wajib Unsur IKM**                      | Pada form pengisian survei, kosongi satu unsur IKM lalu klik Submit                                                        | Tombol Submit di-disable atau muncul peringatan "Pertanyaan wajib diisi", request API dicegah. **Lulus manual (sesi C-01, 11 Agu 2026):** tombol "Kirim Survei" nonaktif selama responden belum menjawab, jadi jalur cabang "tombol di-disable" yang terjadi. **Otomatisasi belum ada.** Test lama yang berlabel TC-FE-004 ternyata menguji formulir pemilihan OPD, bukan pengisian unsur IKM — dipindah ke **TC-FE-016** |    P0     | Component |   ✅   |
| TC-FE-005 | **Navigasi Berdasarkan Role**                           | Akses aplikasi dengan token SSO Responden                                                                                  | Menu sidebar "Manajemen OPD", "User", dan "Survei Admin" disembunyikan **Dijalankan 3 Sep 2026** (6 kasus). Premis disesuaikan dengan kenyataan: peran `responden` tak memuat kerangka admin sama sekali, jadi yang bermakna adalah **kabupaten biasa vs superuser** — "Manajemen User" & "Audit Logs" tersembunyi darinya, dan memalsukan cookie `role=superuser` tidak memunculkannya. |    P1     | Component |   ✅   |
| TC-FE-006 | **Notifikasi Toast**                                    | Lakukan aksi sukses (misal isi profil)                                                                                     | Muncul notifikasi toast hijau (Success) di layar **Premis usang — aplikasi ini tak punya sistem toast sama sekali.** Umpan baliknya berupa panel sebaris yang **menetap**, dan itu lebih tepat: pesan seperti "Hasil IKM final sudah disimpan sebagai snapshot" perlu sempat dibaca. Diuji apa yang benar-benar ada (3 kasus, 3 Sep 2026): panel sukses & galat muncul dengan pesan dari amplop galat backend, bukan teks karangan. |    P2     | Component |   ✅   |
| TC-FE-007 | **Tampilan Mobile Responsif**                           | Buka halaman isi survei via browser HP                                                                                     | Tabel/daftar pertanyaan tidak terpotong (scrollable atau stacking vertical) **Dijalankan 3 Sep 2026** pada 320/360/390/414 px: **keempatnya bersih**, tak ada guliran mendatar. Target sentuh footer (tautan 24 px, ikon 40×40) **memenuhi WCAG 2.2 AA 2.5.8 (24×24)**; yang tak terpenuhi hanya AAA 2.5.5 dan pedoman Apple yang sama-sama menuntut 44 px — dicatat sebagai observasi, bukan pelanggaran. |    P2     |  Manual   |   ✅   |
| TC-FE-008 | **Loading State (Anti Double Submit)**                  | Klik Submit pengaduan/survei                                                                                               | Tombol berubah menjadi loading spinner, form disable, klik ganda beruntun dicegah. **Tercakup sebagian:** baru sisi survei (`SurveyNavigation`); form pengaduan belum diotomatisasi                                                                                                                                                                                                                                       |    P1     | Component |   🟡   |
| TC-FE-009 | **E2E: Isi Survei dari Login sampai Selesai**           | Skrip Playwright: masuk lewat formulir "akun dev" di navbar, buka survei uji, jawab ketiga tipe pertanyaan, kirim          | Halaman "Terima Kasih!" tampil **dan** jawabannya benar-benar tersimpan di backend. **LULUS sejak 2 September 2026** — `e2e/isi-survei.spec.js`. Sesi TIDAK disuntikkan melainkan ditekan tombolnya, karena pemalsuan cookie saja pernah menyesatkan (token dibaca dari localStorage oleh `api.js`, cookie dibaca `proxy.js`). Selain layar, spec memeriksa data tersimpan: skala menyimpan **skor 1–4**, pilihan ganda menyimpan **id opsi** — pertukaran keduanya persis kesalahan yang dulu ditolak backend. Diverifikasi dengan tiga mutasi sengaja pada kode produksi, ketiganya memerahkan spec |    P0     |    E2E    |   ✅   |
| TC-FE-010 | **E2E: Pengajuan Pengaduan**                            | Skrip E2E: login sebagai responden, isi form pengaduan (unggah gambar dummy)                                               | Tiket baru muncul di daftar dengan nomor tiket dari API (format `PGD` + tanggal + 4 karakter) **Dijalankan 3 Sep 2026, disesuaikan 15 Sep 2026** — 3 pengujian E2E: nomor tiket cocok pola `PGD` + 8 digit + 4 karakter dan **benar-benar tersimpan** (dibaca ulang dari API, termasuk `uraian` & `opdId`), **centang anonim sampai ke basis data** (`isAnonim` true dan `userId` hilang seluruhnya), dan kegagalan kirim tak menghapus isian warga. Uji sub-kategori DIGANTI uji anonim: taksonomi sub-kategori dihapus dari produk 4 Sep 2026 (lihat §Y.7). |    P0     |    E2E    |   ✅   |
| TC-FE-011 | **Handling Jaringan (Timeout/Error 500)**               | Buat endpoint membalas 500, lalu buka halaman yang bergantung padanya dan tekan "Coba Lagi"                                | Frontend menampilkan komponen error dengan anggun (bukan layar putih) dan tombol Coba Lagi benar-benar memicu pengambilan ulang                                                                                                                                                                                                                                                                                           |    P1     | Component |   ✅   |
| TC-FE-012 | **UI Interaktif (Chart Dashboard IKM)**                 | Buka Dashboard IKM, arahkan kursor ke grafik batang/pie                                                                    | Tooltip berisi detail nilai NRR dan nama OPD muncul dan posisinya tidak terpotong layar **Premis usang — tak ada pustaka grafik maupun tooltip.** Kedua grafiknya SVG tulis tangan dengan **nilai selalu terlihat**, dan itu justru benar: hover mustahil di layar sentuh. Diuji apa yang ada (11 kasus, 3 Sep 2026): panjang busur donat, label periode, dan keadaan kosong. |    P1     | Component |   ✅   |
| TC-FE-013 | **Tabel & Paginasi (Manajemen OPD)**                    | Buka halaman Manajemen OPD dengan data > 10, klik halaman 2                                                                | Tabel memuat data halaman berikutnya, indikator halaman aktif ter-highlight. Catatan: paginasi dilakukan di sisi klien (`useMemo` + `slice`), dan test memakai `jest.mock` pada service sehingga tidak memverifikasi kontrak API                                                                                                                                                                                          |    P1     | Component |   ✅   |
| TC-FE-014 | **Tabel & Filter/Search UI**                            | Ketik "kesehatan" di input pencarian tabel OPD                                                                             | Hanya baris yang cocok dirender ulang. **Ketidakcocokan dokumen vs implementasi:** ekspektasi versi 1.0 menyebut _debounced request_ ke server, padahal penyaringan dilakukan sepenuhnya di klien tanpa request sama sekali. Perlu diputuskan mana yang benar sebelum ditutup                                                                                                                                             |    P1     | Component |   🟡   |
| TC-FE-015 | **Keamanan Penyimpanan Token JWT**                      | Login, buka DevTools (Application > Storage)                                                                               | To**DITULIS ULANG 2 Sep 2026 — SSO Helpdesk mengubah jawabannya.** Lewat SSO: TIDAK ADA token di sisi klien; sesi dipegang cookie `session` **HttpOnly** terbitan backend, dan yang tersimpan hanya `role` (cookie, dibaca `proxy.js`), `expiresAt` + penanda masuk (localStorage). Ekspektasi "HttpOnly" versi 1.0 kini **terpenuhi**. Lewat `dev-login` token masih di localStorage + cookie non-HttpOnly — wajar untuk pengembangan, dijaga `NonProductionGuard`. **Yang diperiksa sekarang:** login lewat SSO, pastikan tak ada token di Application > Storage, dan pastikan penjaga produksi benar-benar aktif. Rinci: **TC-AUTH-056**                                                                                                                                                  |    P0     |  Manual   |   🟡   |
| TC-FE-016 | **Validasi Wajib Pilih OPD (Form Pemilihan Survei)**    | Di beranda, klik "Lihat Survei Tersedia" tanpa memilih instansi                                                            | Muncul pesan "Silakan pilih Instansi / OPD ...", navigasi dicegah, dan pesan hilang begitu OPD dipilih. Daftar OPD dimuat asinkron dari `GET /opd`                                                                                                                                                                                                                                                                        |    P0     | Component |   ✅   |
| TC-FE-017 | **Notifikasi In-App — Lencana & Daftar**                | Buka navbar dengan notifikasi belum dibaca, klik ikon lonceng                                                              | Lencana tampil hanya bila ada yang belum dibaca; panel memuat judul, pesan, dan label waktu relatif dari API; keadaan kosong tampil bila tidak ada notifikasi                                                                                                                                                                                                                                                             |    P1     | Component |   ✅   |
| TC-FE-018 | **Notifikasi In-App — Tandai Dibaca**                   | Klik satu notifikasi belum dibaca, lalu klik "Tandai semua dibaca"                                                         | `PATCH /notifications/:id/read` dan `/read-all` terpanggil, daftar dimuat ulang, panel tertutup. Notifikasi yang sudah dibaca tidak memicu API. Kegagalan server tidak menghalangi navigasi                                                                                                                                                                                                                               |    P1     | Component |   ✅   |
| TC-FE-019 | **Aksesibilitas Lencana Notifikasi**                    | Periksa lencana belum dibaca memakai pembaca layar atau kueri berbasis peran/label                                         | Lencana seharusnya punya teks alternatif agar terbaca pembaca layar. **LULUS sejak 2 Sep 2026** (BUG-002 ditutup): tombol lonceng kini bernama `Notifikasi, N belum dibaca` saat ada yang belum dibaca, dan `Notifikasi` saat tidak. Terkunci otomatisasi — dua kasus di `NotificationDropdown.test.jsx` menegaskan nama itu, jadi menghapus `aria-label` langsung memerahkan suite                                                                                                                                                                                                                |    P2     | Component |   ✅   |
| TC-FE-020 | **Statistik Publik — Render Data**                      | Buka `/statistics`                                                                                                         | Narasi insight, kategori pengaduan terbanyak, dan peringkat OPD beserta medali tampil dari API; narasi cadangan dipakai bila backend mengirim `null`; keadaan kosong tampil bila belum ada data                                                                                                                                                                                                                           |    P1     | Component |   ✅   |
| TC-FE-021 | **Statistik Publik — Kegagalan API**                    | Buat `GET /statistics` membalas 500, lalu klik "Coba Lagi"                                                                 | ErrorState tampil alih-alih layar putih, dan tombol benar-benar memicu pengambilan ulang hingga data tampil                                                                                                                                                                                                                                                                                                               |    P1     | Component |   ✅   |
| TC-FE-022 | **Audit Log — Daftar & Penerjemahan**                   | Buka `/admin-kab/audit-logs`                                                                                               | Nama aktor diambil dari `actorNama`; kolom Modul dan Aktivitas diderivasi dari `entitas` + `aksi` (mis. `update_status` + `complaint` → "UPDATE STATUS Pengaduan"); tiap baris menaut ke halaman detailnya                                                                                                                                                                                                                |    P2     | Component |   ✅   |
| TC-FE-023 | **Audit Log — Filter Modul**                            | Pilih modul "Pengaduan" pada filter, lalu tekan "Reset Filter"                                                             | Parameter `entitas=complaint` dikirim ke API dan hanya baris yang cocok tampil; Reset mengembalikan tampilan ke seluruh modul                                                                                                                                                                                                                                                                                             |    P2     | Component |   ✅   |
| TC-FE-024 | **Audit Log — Kegagalan API**                           | Buat `GET /audit-logs` membalas 500, lalu klik "Coba Lagi"                                                                 | ErrorState tampil dan tombol memicu pengambilan ulang                                                                                                                                                                                                                                                                                                                                                                     |    P2     | Component |   ✅   |
| TC-FE-025 | **Builder Survei — Template & Pertanyaan Kustom**       | Buka builder survei berstatus draft, klik "Tambah 9 Unsur Baku", lalu "Skala Nilai 1-4"                                    | Template mengganti seluruh isi kanvas dengan 9 unsur (U1–U9); pertanyaan kustom bertambah dengan penomoran berurutan dan payload memakai `teks`/`tipe` sesuai `CreateQuestionDto`                                                                                                                                                                                                                                         |    P1     | Component |   ✅   |
| TC-FE-026 | **Manajemen Survei — Daftar, Duplikasi, Tutup Periode** | Buka daftar survei Admin OPD, klik "Duplikasi" lalu "Tutup Periode"                                                        | Daftar dirender dari API; kedua aksi memanggil endpoint yang benar dan memuat ulang data                                                                                                                                                                                                                                                                                                                                  |    P1     | Component |   ✅   |
| TC-FE-027 | **Komponen Button**                                     | Render Button dengan beberapa variant dan handler klik                                                                     | Teks dan kelas variant sesuai; `onClick` terpanggil saat diklik; variant tak dikenal jatuh ke `primary`                                                                                                                                                                                                                                                                                                                   |    P3     | Component |   ✅   |
| TC-FE-028 | **Identitas Navbar Admin dari API**                     | Render `AdminNavbar` & `AdminKabNavbar` dengan MSW membalas `GET /auth/me` bernama "Budi Santoso"                           | Nama itu muncul, dan tak satu pun nilai karangan lama ("Dr. Handoko", "Kepala Dinas", inisial "AK") ada di dokumen. **Mengunci BUG-001 yang sudah diperbaiki** (`efb7b9f`, `4e3e0c9`) — tanpa ini perbaikannya bisa diam-diam kembali **Dijalankan 3 Sep 2026** — 7 kasus untuk kedua navbar. |    P1     | Component |   ✅   |
| TC-FE-029 | **Pertanyaan Tipe Uraian**                              | Render `QuestionCard` untuk pertanyaan bertipe `text`                                                                      | Merender textarea (bukan skala), menyatakan jawabannya tidak wajib, membatasi 1000 karakter dan menghitung yang sudah diketik, serta meneruskan teks ke store                                                                                                                                                                                                                                                             |    P1     | Component |   ✅   |
| TC-FE-030 | **Pertanyaan Tipe Pilihan Ganda**                       | Render `QuestionCard` untuk pertanyaan bertipe `multiple_choice`, termasuk keadaan opsi kosong                              | Satu opsi per pilihan berlabel huruf A/B/C; nilai yang dikirim adalah **ID opsi**, bukan nomor urut (inilah yang dulu ditolak backend); bila opsinya kosong tampil peringatan jujur, bukan skala yang salah                                                                                                                                                                                                                |    P1     | Component |   ✅   |
| TC-FE-031 | **Salinan Survei Mempertahankan Opsi Jawaban**          | Duplikat survei berisi pertanyaan Pilihan Ganda dan Skala berlabel tersuai, lalu buka salinannya sebagai responden          | Opsi pilihan ganda tersalin lengkap dan label skala tersuai tidak berganti ke label baku. **Temuan: gagal — [BUG-005](BUG_REPORTS.md#bug-005) (Critical, TERKONFIRMASI 2 Sep 2026):** `duplicate()` tidak menyalin relasi opsi, dan jalur itu melewati `CreateQuestionDto` yang biasanya mewajibkan minimal 2 opsi. Dibuktikan dua lapis — di API (7 opsi pada asli → **0** pada salinan) dan di peramban. Akibatnya melampaui satu pertanyaan: karena pilihan ganda bersifat wajib sementara tak ada opsi untuk dipilih, tombol "Pertanyaan Selanjutnya" **nonaktif permanen** dan responden tersangkut di "Pertanyaan 1 dari 2" — **survei terbit yang tak dapat diselesaikan sama sekali**. Reproduksi hidupnya (survei 332 & 333) **dihapus 4 Sep 2026** atas permintaan penguji; bukti tertulisnya utuh di laporan temuan, dan dapat dibangun ulang ± 1 menit lewat empat langkah reproduksi di sana **DITUTUP 16 Oktober 2026** — `duplicate()` kini memuat relasi `options` dan menyalin `label`, `nilai`, serta `urutan`; dijaga uji e2e `apps/api/test/surveys.e2e-spec.ts` yang pada jalan pertamanya memerah `Expected: 7, Received: 0`, angka yang sama persis dengan bukti 2 September. Lihat [BUG-005](BUG_REPORTS.md#bug-005) untuk apa yang TIDAK disembuhkannya | P0 | Integ | ✅ |
| TC-FE-032 | **Cookie Sesi Bertahan Sesudah Peramban Ditutup**       | Login, tutup peramban, buka lagi halaman terlindung. Uji juga arah sebaliknya dengan token kedaluwarsa di localStorage | Cookie `token`/`role` memikul `max-age` sesuai klaim `exp` token, dan membuka ulang peramban tidak memantulkan halaman terlindung. Token kedaluwarsa harus dibuang, bukan dipulihkan jadi cookie. **Mengunci [BUG-006](BUG_REPORTS.md#bug-006) yang sudah diperbaiki** — belum ada otomatisasi **Dijalankan 3 Sep 2026** — 12 kasus. jsdom mengabaikan `max-age` pada `document.cookie`, jadi penulisnya yang diintai (bukan cookie hasilnya) supaya masa hidupnya benar-benar terbukti tertulis. |    P1     | Component |   ✅   |
| TC-FE-033 | **Validasi Lampiran di Sisi Klien**                     | Pilih berkas 6 MB dan berkas `.gif` pada form pengaduan maupun panel balasan                                          | Keduanya ditolak **tanpa** permintaan jaringan terkirim, dengan pesan menyebut batas yang dilanggar. **Temuan: gagal — [BUG-007](BUG_REPORTS.md#bug-007)** (Low): tak ada pemeriksaan sisi klien sama sekali; `FileDropzone` memakai `accept="image/*,.pdf"` yang menawarkan GIF/SVG/BMP, dan dua input berkas percakapan tanpa `accept` sama sekali. Ukuran hanya ditampilkan, tak pernah diperiksa terhadap batas 5 MB                                                     |    P2     | Component |   ❌   |
| TC-FE-034 | **Beranda Publik bagi Pengunjung Belum Masuk** | Buka `/` di jendela penyamaran, buka daftar pilihan Kategori dan Instansi/OPD | Pengunjung diberi tahu apa yang harus dilakukannya. **Temuan: gagal — [BUG-008](BUG_REPORTS.md#bug-008)** (Medium, TERKONFIRMASI 2 Sep 2026): `GET /opd` dan kedua endpoint `/ref/*` membalas 401, `useAsync` diambil `data`-nya saja sehingga galat ditelan, dan yang tersisa daftar pilihan kosong tanpa satu kalimat pun yang menerangkan sebabnya | P1 | Component | ❌ |
| TC-FE-035 | **Analisis SKM (`/admin-opd/analytics`)** | Buka tab analisis SKM, bandingkan nilai IKM-nya dengan `/admin-opd/dashboard` dan `/admin-kab/dashboard` untuk periode yang sama | Nilai IKM konsisten di ketiga layar; OPD tanpa respons menampilkan keadaan kosong yang jujur, bukan angka 0 yang menyesatkan. **Halaman ini tak pernah punya kasus uji sampai 2 Sep 2026** — lihat charter C-12 **LULUS 2 September 2026 (sesi C-12).** Nilai IKM **konsisten di tiga endpoint** yang mengaku menghitung hal sama: `/surveys/:id/results`, `/dashboard/opd`, dan `/dashboard/ikm` — untuk kedua survei ber-9-unsur, `nilaiIkm` dan `jumlahResponden` cocok persis. Survei tanpa unsur IKM benar-benar dikecualikan dari papan peringkat (bukan dihitung nol) dan di layar berbunyi **"Belum dapat dinilai"**, bukan angka 0 yang pada skala IKM justru berarti pelayanan terburuk. | P1 | Component |   ✅   |
| TC-FE-036 | **Analisis Pengaduan (`/admin-opd/analytics`)** | Buka tab analisis pengaduan, ganti periode | Sebaran kategori & status cocok dengan `/admin-opd/complaints`; mengganti periode benar-benar memuat ulang data, bukan menyisakan angka lama **LULUS 2 September 2026 (sesi C-12).** Jumlah dan sebaran kategori pada tab analisis cocok dengan `GET /complaints` untuk OPD yang sama. | P2 | Component |   ✅   |
| TC-FE-037 | **Ekspor Hasil Analisis** | Tekan tombol Ekspor pada halaman analisis | Berkas benar-benar terunduh, dapat dibuka, dan isinya cocok dengan yang tampil di layar **LULUS 2 September 2026 (sesi C-12).** Ketiga format diuji dari peramban sungguhan dan benar-benar terunduh: CSV (`text/csv`), Excel (**ZIP/XLSX asli**, bukan CSV berganti nama), PDF (**diawali `%PDF`**, bukan teks berganti nama). Nama berkas dari `Content-Disposition` memuat id survei dan periodenya. | P2 | Manual |   ✅   |
| TC-FE-038 | **Gerbang Persetujuan PDP (`/persetujuan`)** | Masuk sebagai responden ber-`consentAt` kosong; periksa isi gerbang, kunci tombol, penolakan backend, cookie palsu, kegagalan pencatatan, lalu setujui | Warga tanpa persetujuan dipantulkan ke `/persetujuan` dari seluruh halaman warga; yang sudah menyetujui dipantulkan balik ke berandanya. Persetujuan tidak boleh terbawa ke akun warga berikutnya di peramban yang sama. **LULUS 3 September 2026 (sesi C-13, dua bagian) — nol cacat dari 10 probe.** Bagian penjagaan (2 Sep): cookie `consent` yang dihapus memantulkan warga ke gerbang, gerbang memeriksa ulang lewat `GET /auth/me` lalu memulihkan cookie, cookie basi tak dapat membuka gerbang maupun mengurung pengguna, dan persetujuan tak terbawa ke akun berikutnya. Bagian **formulir** (3 Sep, akun `warga@gmail.com` id 21): keempat rincian UU PDP tampil beserta rujukan UU No. 27 Tahun 2022 dan hak menarik persetujuan; **nol** tautan pintas ke area warga (gerbang tak menawarkan jalan keluar); tombol "Setuju & Lanjutkan" terkunci sebelum dicentang, aktif sesudahnya, dan **terkunci lagi** saat centang dibatalkan; kotak centang tertaut label (target sentuh 80px lewat label, bukan 20px kotaknya) dan ber-`aria-describedby`. **Penegakan sesungguhnya terbukti ada di backend:** `POST /surveys/:id/responses` membalas **403** dengan pesan yang menyebut halaman Persetujuan, dan **tetap 403 walau cookie `consent` dipalsukan jadi `1`** — navigasinya memang bisa ditembus (begitu rancangannya), pengirimannya tidak. Pencatatan yang gagal (`POST /auth/consent` → 500) menampilkan pesan backend di `role="alert"`, memindahkan fokus ke sana, menahan pengguna di gerbang, membiarkan tombol ditekan lagi, dan **tidak** mencatat persetujuan. Sesudah menyetujui: diantar ke `/dashboard`, `consentRequired` menjadi false, cookie `consent=1` terpasang, `/persetujuan` memantulkan balik, dan kiriman yang tadinya 403 menjadi **201**. | P1 | Manual | ✅ |
| TC-FE-039 | **Formulir Pengaduan Warga (`/complaints/new`)** | Isi judul, uraian, OPD, kategori, subkategori; kosongi satu per satu lalu kirim | Field wajib divalidasi sebelum permintaan terkirim; subkategori menyesuaikan kategori terpilih; sukses mengarah ke halaman tiket. **Modul H punya 29 kasus uji, semuanya Integ/Unit — antarmukanya tak pernah diuji** **LULUS 2 September 2026** — `CreateComplaintForm.test.jsx`, 7 kasus. | P1 | Component |   ✅   |
| TC-FE-040 | **Percakapan Pengaduan (balasan warga & admin)** | Buka detail pengaduan, kirim balasan sebagai warga lalu sebagai admin | Gelembung pesan berpihak benar (pelapor vs admin), urutan waktunya betul, dan balasan baru muncul tanpa memuat ulang halaman. Lihat juga [CAT-005](BUG_REPORTS.md#cat-005--warga-tak-dapat-membedakan-admin-mana-yang-membalas) **LULUS 2 September 2026** — `ComplaintChat.test.jsx`, 10 kasus. | P1 | Component |   ✅   |
| TC-FE-041 | **Daftar & Filter Pengaduan (Admin)** | Buka daftar pengaduan Admin OPD dan Admin Kabupaten, saring menurut status dan kategori, lalu tekan Reset Filter | Hanya baris yang cocok tampil; Admin OPD hanya melihat pengaduan OPD-nya sendiri; Reset mengembalikan seluruh daftar **LULUS 2 September 2026** — `admin-opd/complaints/__tests__/page.test.jsx`, 6 kasus. | P2 | Component |   ✅   |
| TC-FE-042 | **Melihat Respons Survei (daftar & detail)** | Buka `/admin-{kab,opd}/surveys/[id]/responses` lalu satu barisnya | Daftar respons tampil beserta waktu kirim; detail menampilkan jawaban per pertanyaan sesuai tipenya (skor skala, label opsi, teks uraian) dan **tanpa identitas pengisi** — SKM bersifat anonim **Dijalankan 3 Sep 2026** — 10 kasus, berporos pada anonimitas: kolom Responden/Email/No. Telepon/Nama tak boleh muncul di tabel maupun detail. | P2 | Component | ✅ |
| TC-FE-043 | 🔁 **GERBANGNYA BERGANTI 13 Okt 2026** — **Pemilih Peran & Callback SSO** | Masuk dengan akun ber-peran lebih dari satu (memicu `/pilih-peran`); buka `/sso/callback` tanpa parameter | ~~Pemilih peran hanya terbuka bagi superuser~~ → terbuka bagi **siapa pun ber-peran lebih dari satu**; gerbangnya JUMLAH peran, bukan peran tertentu (digeneralisasi 5 September 2026, dan `pilih-peran/page.jsx` menyatakannya tersurat). Menutupnya tetap membatalkan login; halaman callback tetap tak boleh menampilkan layar putih walau parameternya tak lengkap. **Dijalankan 3 Sep 2026** — 13 kasus; hasil itu TETAP sahih, sebab akun yang dipakainya memang ber-peran lebih dari satu. **Batas yang dinyatakan:** jsdom 26 mengunci `window.location` (`configurable: false, writable: false`) dan ketiga cara pemalsuan yang lazim ditolak, jadi yang diuji adalah **keadaan yang ditulis sebelum navigasi** beserta konstanta `roleHome.js` — bukan tujuan navigasinya. Catatan: `localStorage.area` yang disebut di sana sudah **tak ada lagi**, cookie `area` dibuang bersama perannya. | P2 | Component | ✅ |
| TC-FE-044 | **Form Buat & Ubah Akun Admin** | Buka `/admin-kab/users` lalu formulirnya (**bukan** `/admin-kab/users/create` — rute itu tak ada; yang ada `users/[id]/edit`, diperiksa 13 Oktober 2026), kirim peran Admin OPD tanpa memilih OPD, lalu dengan surel yang sudah terpakai | Validasi sisi klien mencegah kirim kosong; galat backend (mis. email duplikat) ditampilkan di formulir, bukan ditelan. Lihat charter C-05 **LULUS 3 September 2026 (sesi C-05).** Peran Admin OPD tanpa OPD ditahan di formulir dengan pesan "Silakan pilih instansi / OPD."; surel duplikat ditolak dan pesan backend ditampilkan apa adanya, tidak ditelan. Sakelar "Aktif" yang dimatikan benar-benar tersimpan `isActive=false`. **Di luar cakupan baris ini ditemukan [BUG-009](BUG_REPORTS.md#bug-009)** (Medium): pembuatan akun nonaktif memakai DUA panggilan berurutan, dan bila yang kedua gagal, akunnya sudah terlanjur ada. | P2 | Manual | ✅ |
| TC-FE-045 | **Dasbor Kabupaten & OPD** | Buka `/admin-kab/dashboard` dan `/admin-opd/dashboard` | Kartu ringkasan, donat status pengaduan, papan peringkat IKM, dan tabel aktivitas terisi dari API; keadaan kosong dan keadaan galat tampil dengan anggun. 15 komponen, baru grafiknya yang tercakup (TC-FE-012) **Dijalankan 3 Sep 2026** — 14 kasus, termasuk "Mutu: -" yang tak boleh diderivasi sendiri di frontend. | P2 | Component | ✅ |
| TC-FE-046 | **Kit UI Bersama** | Render `Table`, `Pagination`, `Select`, `FileDropzone`, `ImageViewer`, `StarRating`, `Switch`, `Badge` dengan properti pokoknya | Tiap komponen merender isi & keadaan yang benar dan meneruskan interaksinya. **31 komponen di `components/ui/`, baru 3 yang beruji** (Button, ErrorState, NotificationDropdown) **Dijalankan 3 Sep 2026** — 23 kasus untuk 8 komponen. | P3 | Component | ✅ |
| TC-FE-047 | **Halaman Tentang Kami (`/about`)** | Buka `/about` sebagai pengunjung | Seluruh bagian terender tanpa galat konsol dan tanpa gambar rusak. 12 komponen, tak pernah punya kasus uji **Dijalankan 3 Sep 2026** — 16 kasus untuk 12 komponen. | P3 | Component | ✅ |
| TC-FE-048 | **Ketahanan Halaman Admin saat API Gagal** | Cegat seluruh `\**/api/v1/**` (kecuali `/auth/me`) dengan 503, buka enam halaman admin; lalu pulihkan dan tekan "Coba Lagi". Uji juga pengiriman survei yang gagal dan tombol kirim yang ditekan berkali-kali pada jaringan lambat | Setiap halaman menjelaskan kegagalannya dan menawarkan jalan pulih; jawaban survei yang sudah diisi tidak hilang; satu pengisian menghasilkan tepat satu respons. **LULUS 3 September 2026 (sesi C-08) — tanpa satu pun cacat.** Keenam halaman (Dashboard, OPD, Survei, Pengaduan, Log Aktivitas, Manajemen Pengguna) menampilkan pesan galat beserta tombol "Coba Lagi", dan tombol itu benar-benar memulihkan halaman setelah backend normal kembali. Pengiriman survei yang ditolak 503 menampilkan pesan dari backend, **mempertahankan seluruh jawaban**, dan membiarkan tombol kirim ditekan lagi. Empat klik beruntun pada jaringan yang ditahan 5 detik menghasilkan **tepat 1** `POST /responses` (jumlah respons 34 → 35). Backend sungguhan TIDAK dimatikan — kegagalannya dihasilkan lewat pencegatan rute di peramban. | P1 | Manual | ✅ |
| TC-FE-049 | **Daftar OPD pada Volume Nyata & Sinkronisasi** | Telusuri seluruh halaman daftar 62 OPD, cari dengan huruf besar/kecil dan dengan spasi berlebih, saring jenis layanan, lalu jalankan sinkronisasi yang berhasil dan yang gagal (jawaban dipalsukan) | Seluruh baris terjangkau; pencarian mengabaikan kapitalisasi dan spasi berlebih; laporan sinkron lengkap; kegagalan sinkron tak membuang data lama. **SEBAGIAN, 3 September 2026 (sesi C-06).** Yang benar: 62 dari 62 OPD terjangkau dalam 7 halaman, indikator paginasi cocok dengan backend, pencarian nama & kode tak peka huruf besar-kecil, menyaring mengembalikan paginasi ke halaman 1, kegagalan sinkron 503 diberitahukan tanpa mengosongkan tabel dan tombolnya tetap bisa ditekan lagi. Yang gagal: [BUG-011](BUG_REPORTS.md#bug-011) (pencarian tak memangkas spasi — "&nbsp;&nbsp;DINAS" memberi 0 dari 18 hasil), [BUG-012](BUG_REPORTS.md#bug-012) (angka `skipped` laporan sinkron tak pernah ditampilkan), dan [BUG-010](BUG_REPORTS.md#bug-010) (tombol paginasi tanpa nama aksesibel). | P2 | Manual | 🟡 |
| TC-FE-050 | **Kendali paginasi daftar pengaduan warga** | Buka `/complaints` sebagai warga dengan lebih dari tiga pengaduan, baca baris di bawah tabel | Baris itu menyebut jumlah yang BENAR-BENAR ditampilkan. Sebelum 15 Oktober 2026 ia berbunyi "Menampilkan 1-3 dari 12 pengaduan" di bawah tabel berisi dua belas baris dengan kedua panah mati — `Pagination` dipatok mati `1/1/3`, lihat [BUG-021](BUG_REPORTS.md#bug-021) — `ComplaintTable.test.jsx` | P1 | Component | ✅ |
| TC-FE-051 | **Catatan pemotongan pada daftar yang terpotong** | Buat total baris melebihi batas ambil (100 di lima halaman admin, 50 di daftar warga, 10 di Riwayat Aktivitas), lalu baca halamannya | Halaman MENGATAKAN daftarnya terpotong: jumlah yang dimuat, totalnya dari `meta.pagination.total`, dan pada layar yang menyaring di klien juga bahwa pencarian hanya bekerja atas irisan itu. Tak ada peringatan ketika total belum diketahui — `CatatanPemotongan.test.jsx`, `ActivityHistoryTable.test.jsx`, dan lima uji halaman admin | P2 | Component | ✅ |

> **(15 Oktober 2026) DUA BARIS DI ATAS LAHIR DARI SATU PENYISIRAN**, bukan dari
> dua laporan terpisah. Empat tempat memotong daftarnya tanpa mengatakannya dan
> satu di antaranya menampilkan angka yang jelas salah kepada warga; rinciannya
> di [BUG-021](BUG_REPORTS.md#bug-021).
>
> **Yang diperbaiki kejujurannya, BUKAN pemotongannya.** Lima halaman admin
> tetap berhenti di 100 baris, dan pencarian di sana tetap hanya mencari di dalam
> seratus baris itu — jadi baris yang cocok tetapi tak terambil tetap tak akan
> muncul. Batasan itu dicatat tersendiri sebagai
> [CAT-022](BUG_REPORTS.md#cat-022) karena ia pertukaran yang disengaja, bukan
> cacat: backend belum menerima `search` pada DTO daftarnya.
>
> **DUA PEMASANGAN YANG TADINYA TAK TERCAKUP, KINI TERCAKUP** — ditulis dan
> ditutup pada hari yang sama, 15 Oktober 2026. Ketika TC-FE-051 di atas ditandai
> ✅, `admin-kab/complaints` dan `admin-opd/complaints` belum punya uji halaman di
> `main` sama sekali, jadi catatan pemotongan di kedua halaman itu — tiga baris,
> identik dengan tiga halaman yang teruji — tak dibuktikan oleh uji apa pun, dan
> batas itu dinyatakan tersurat di sini supaya ✅-nya tidak dibaca lebih luas
> daripada yang dibuktikannya. Sore hari itu keduanya mendapat uji halaman: enam
> kasus untuk halaman Kabupaten dan tujuh untuk halaman OPD, commit `06a7da7` di
> `main`. Sebutan "tiga uji halaman admin" pada TC-FE-051 karena itu sudah
> dikoreksi menjadi lima.
>
> **Uji yang ditulis untuk kode yang sudah ada lulus pada jalan pertama, dan itu
> tidak membuktikan apa pun.** Ketiga belas uji karena itu dibuktikan lewat
> MUTASI, bukan lewat merah alami: sebelas mutasi dipasang satu per satu ke kedua
> halaman, masing-masing dijalankan sendiri lalu dipulihkan, dan setiap satu dari
> tiga belas uji terbunuh oleh setidaknya satu di antaranya. Yang paling berguna
> membuat catatannya SELALU muncul — dua uji kendali "TIDAK memasang catatan"
> itulah yang menangkapnya. Rinciannya, termasuk satu benturan merge yang
> ditinggalkannya, ada di [BUG-021](BUG_REPORTS.md#bug-021).
>
> **(15 Oktober 2026) Label "Beranda" kini "Layanan"** di seluruh antarmuka, atas
> permintaan pengguna. Tak satu pun baris TC di dokumen ini menyebut kata itu,
> jadi tak ada sel yang perlu dikoreksi; disebut di sini karena sesi
> eksploratori di `BUG_REPORTS.md` masih menyebutnya, dan sebutan di sana
> rekaman bertanggal yang sengaja dibiarkan utuh.

> **(15 Oktober 2026) LIMA BARIS TC DI MODUL INI TIDAK LAGI MENGGAMBARKAN KODE
> HARI INI, dan ✅-nya perlu dibaca sebagai hasil bertanggal.** Ketiga belas
> berkas uji yang hidup hanya di cabang `tester` DIJALANKAN terhadap kode `main`
> hari ini — 113 uji, enam berkas hijau seluruhnya, tujuh berkas dengan 14 uji
> merah. Rinciannya beserta sebab tiap kemerahan ada di
> [CAT-023](BUG_REPORTS.md#cat-023); yang ditandai di sini hanya baris TC yang
> ikut terkena, sesuai aturan kotak kepala `BUG_REPORTS.md` bahwa kasus uji yang
> harapannya kini salah ditandai tersurat alih-alih disunting diam-diam.
>
> | Baris | Yang sudah tak berlaku |
> | --- | --- |
> | **TC-FE-005** | Seluruh premisnya "kabupaten biasa vs superuser", dan peran `superuser` dilebur ke `kabupaten` 15 September 2026. Empat dari enam kasusnya merah. |
> | **TC-FE-006** | Mencari tombol "Publikasikan" sebagai `role="button"`; aksi itu kini butir di dalam `RowActionsMenu` dan harus dibuka lebih dulu. Ketiga kasusnya merah. |
> | **TC-FE-028** | Satu kasusnya membedakan superuser dari admin kabupaten biasa. Sebab yang sama dengan TC-FE-005. |
> | **TC-FE-042** | Harapan "tanpa identitas pengisi" kini terlalu luas: tabel respons MEMANG punya kolom **Pengisi**, ditambahkan dengan sengaja untuk responden bukan-anonim. Permukaan yang wajib anonim — detail jawaban — tetap anonim, dan ujinya tetap hijau. |
> | **TC-FE-046** | Tiga kasus `FileDropzone`-nya tak dapat dijalankan di `main` sama sekali: `jest.setup.js` di sana melumpuhkan `File`. Itu cacat setelan, bukan uji basi, dan perbaikannya sudah ada di `tester` ([CAT-009](BUG_REPORTS.md#cat-009)). |
>
> **Yang TIDAK berubah:** keenam berkas yang hijau seluruhnya, 44 uji, berjalan
> apa adanya terhadap kode `main`. Angka ✅ pada baris-baris lain di modul ini
> tidak disentuh, sebab tak ada pengukuran hari ini yang menyentuhnya.

### Y.1 Peta Otomatisasi (angka diperbarui 15 September 2026)

> **(15 Oktober 2026) ANGKA DI TABEL INI BACAAN 15 SEPTEMBER 2026 DAN SUDAH JAUH
> TERTINGGAL — tetapi dua pernyataan pada catatan pertama hari ini SALAH, dan
> dikoreksi di sini alih-alih dihapus.**
>
> Yang tetap berlaku: tabel ini rekaman satu pembacaan, dan ia TIDAK ditulis
> ulang, sebab menambal beberapa baris ke dalamnya akan membuatnya tampak
> mutakhir padahal bukan. Memperbaruinya seluruhnya menuntut satu pembacaan
> `jest --json` baru dan pantas diputuskan terpisah.
>
> **Salah pertama: angka pembandingnya diambil dari cabang yang lain.** Catatan
> pertama menyebut "200 berkas / 1.640 uji" sebagai bacaan hari ini. Angka itu
> dibaca di `main`, sedangkan tabel ini bacaan di `tester` — cabang tempat
> dokumen ini hidup, dan tempat tiga belas berkas uji dari September berada yang
> TIDAK pernah ikut ke `main` (`e3c5a0b` bukan leluhur `main`). Keduanya karena
> itu tak dapat dibandingkan sama sekali. Bacaan `tester` hari ini belum pernah
> diambil, jadi angkanya tidak disebut di sini; bacaan `main` hari ini
> **202 berkas / 1.653 uji**.
>
> **Salah kedua: berkas yang disebut "tak ada lagi" itu ADA.**
> `app/admin-opd/complaints/__tests__/page.test.jsx` hidup di `tester` — enam
> kasus, ditambahkan `e3c5a0b`, suite TC-FE-041 — dan hanya tak ada di `main`,
> yang kebetulan pohon kerja yang sedang terpasang ketika catatan pertama
> ditulis. Barisnya di tabel bawah karena itu tidak menunjuk ke ruang kosong.
>
> **Akibatnya satu benturan merge yang nyata, dan perlu diputuskan sadar.** Sore
> 15 Oktober 2026 sebuah berkas BARU ditulis di `main` pada jalur yang sama
> persis, dengan isi yang sama sekali berbeda (tujuh kasus: catatan pemotongan,
> angka paginasi, dan `?opdId=` yang tak boleh dikirim dari klien). Kedua berkas
> lahir sendiri-sendiri, jadi tarikan `main` ke `tester` berikutnya akan
> berbenturan di jalur itu — dan memilih salah satunya akan MEMBUANG cakupan:
> versi `tester` menguji dropdown status, keadaan kosong, Reset Filter, serta
> pencarian menurut nomor tiket dan nama pelapor; versi `main` menguji ketiga hal
> di atas. Penyelesaiannya gabungan, bukan pilihan — dan **gabungan itu kini
> sudah ada**, commit `9a9ce6d` di `main`, satu berkas bertiga belas kasus
> dengan enam kasus September dipertahankan apa adanya. Benturan git-nya TIDAK
> hilang, sebab kedua sisi tetap tercatat menambahkan berkas pada jalur yang
> sama; yang berubah akibatnya, dan penyelesaiannya sekarang cukup mengambil
> versi `main`. Lihat [BUG-021](BUG_REPORTS.md#bug-021).
>
> **Kolom "Jumlah test" dibaca dari keluaran `jest --json`, bukan dihitung
> tangan.** Delapan baris berubah pada pembacaan 15 September: enam karena tim
> dev memperluas berkasnya sendiri, satu karena blok adapter dibuang, satu
> karena berkasnya tak ada lagi. Menghitung `it(` dengan mata akan meleset —
> `it.each` mekar menjadi banyak kasus (663 sesungguhnya vs 640 bila dihitung
> statis).

| Berkas uji                                                              | Jumlah test | Kasus uji                                   |
| ----------------------------------------------------------------------- | :---------: | ------------------------------------------- |
| `components/ui/__tests__/Button.test.jsx`                               |      4      | TC-FE-027                                   |
| `components/ui/__tests__/ErrorState.test.jsx`                           |      5      | TC-FE-011                                   |
| `components/ui/__tests__/NotificationDropdown.test.jsx`                 |     13      | TC-FE-017, TC-FE-018, **TC-FE-019**         |
| `features/statistics/components/__tests__/StatisticsDashboard.test.jsx` |      7      | TC-FE-020, TC-FE-021                        |
| `features/surveys/components/__tests__/QuestionCard.test.jsx`           |     12      | TC-FE-003, **TC-FE-029**, **TC-FE-030**     |
| `features/surveys/components/__tests__/SurveyForm.test.jsx`             |     10      | TC-FE-016                                   |
| `features/surveys/components/__tests__/SurveyNavigation.test.jsx`       |      8      | TC-FE-008 (sebagian)                        |
| `features/surveys/builder/.../SurveyBuilder.integration.test.jsx`       |      3      | TC-FE-025                                   |
| `features/surveys/components/.../SurveyManagement.integration.test.jsx` |      3      | TC-FE-026                                   |
| `app/admin-kab/opd/__tests__/page.test.jsx`                             |      2      | TC-FE-013, TC-FE-014 (sebagian)             |
| `app/admin-kab/audit-logs/__tests__/page.test.jsx`                      |      7      | TC-FE-022, TC-FE-023, TC-FE-024             |
| `features/complaints/components/__tests__/CreateComplaintForm.test.jsx` |   **26**    | **TC-FE-039** — versi `main` menggantikan versi penguji (7) |
| `features/complaints/components/__tests__/ComplaintChat.test.jsx`       |    **6**    | **TC-FE-040** — blok adapter dibuang (10 → 6) |
| `app/admin-opd/complaints/__tests__/page.test.jsx`                      |      6      | **TC-FE-041**                               |
| `components/layouts/__tests__/AdminNavbarIdentitas.test.jsx`           |      7      | **TC-FE-028**                              |
| `components/layouts/__tests__/NavigasiPeran.test.jsx`                  |      6      | **TC-FE-005**                              |
| `components/ui/__tests__/KitUiBersama.test.jsx`                        |     23      | **TC-FE-046**                              |
| `app/admin-kab/surveys/__tests__/UmpanBalikAksi.test.jsx`              |      3      | **TC-FE-006**                              |
| `features/about/components/__tests__/HalamanTentang.test.jsx`          |     16      | **TC-FE-047**                              |
| `features/authentication/components/__tests__/AuthCallbackLoader.test.jsx` |  **7**   | **TC-FE-043** — menggantikan `PemilihPeranDanCallback` (13) yang dibuang |
| `features/authentication/services/__tests__/authStorage.test.js`       |   **11**    | **TC-FE-032** — versi `main` (uji "sesi hantu" SSO) |
| `features/dashboard/components/__tests__/GrafikDashboard.test.jsx`     |     11      | **TC-FE-012**                              |
| `features/dashboard/components/__tests__/RingkasanDashboard.test.jsx`  |     14      | **TC-FE-045**                              |
| `features/surveys/components/__tests__/SurveyResponses.test.jsx`       |     10      | **TC-FE-042**                              |
| `components/ui/__tests__/pagar-bug-015-dialog-konfirmasi.test.jsx`     |   **4**     | pagar regresi **BUG-015** (lihat §Y.8)     |
| `components/ui/__tests__/pagar-bug-017-dropdown.test.jsx`              |   **4**     | pagar regresi **BUG-017** (lihat §Y.8)     |
| `features/surveys/components/__tests__/pagar-bug-016-captcha-gagal.test.jsx` | **2** | pagar regresi **BUG-016** (lihat §Y.8) |
| **Total (Jest — `pnpm test`)**                                         |   **673**   | 92 berkas                                  |

> Sepuluh berkas terbawah ditambahkan 3 September 2026 (**+115 test**, 80 → 195;
> 14 → 24 berkas). Angkanya dibaca dari keluaran `--json` Jest, bukan dijumlah
> dengan tangan. **Tiap berkas dibuktikan bisa merah** lewat mutasi sengaja pada
> kode produksi yang kemudian dikembalikan — dua belas siklus mutasi, dan
> `git diff apps/web/src` bersih dari perubahan non-uji sesudahnya.
>
> **15 September 2026 — tabel di atas tak lagi menggambarkan seluruh suite.**
> Menarik `main` ke `tester` membawa 65 berkas uji baru: **tim pengembang kini
> ikut menulis uji sendiri**, dan totalnya menjadi **663 test di 89 berkas**.
> Tabel ini sengaja TIDAK dipanjangkan menjadi 89 baris — ia dibuat untuk
> menjawab "kasus uji mana yang sudah terotomatisasi", dan pertanyaan itu
> sekarang dijawab oleh berkasnya sendiri. Yang masih berguna dicatat di sini
> adalah **berkas milik penguji** yang berubah pada tarikan itu:
>
> | Berkas | Yang terjadi |
> | ------ | ------------ |
> | `AdminNavbarIdentitas`, `NavigasiPeran` | fixture `/auth/me` disesuaikan: `role` tunggal DIGANTI `roles` + `actingRole` |
> | `ComplaintChat` | blok adapter dibuang — `complaint.adapter.test.js` milik tim dev mengujinya lebih dalam |
> | `PemilihPeranDanCallback` | **dibuang**, diganti `AuthCallbackLoader.test.jsx`; pemilih AREA superuser tak ada lagi |
> | `CreateComplaintForm`, `authStorage` | konflik merge diselesaikan dengan **versi `main`** — versi penguji menguji fitur yang sudah dihapus |

Sejak 2 September 2026 ada lapisan kedua yang berjalan di peramban sungguhan
(`pnpm test:e2e`, terpisah dari Jest):

| Berkas uji                    | Jumlah test | Kasus uji                                  |
| ----------------------------- | :---------: | ------------------------------------------ |
| `e2e/isi-survei.spec.js`      |      2      | **TC-FE-009**, TC-FE-029 (E2E)             |
| `e2e/proteksi-route.spec.js`  |      4      | **TC-FE-002**, **TC-AUTH-055**             |
| `e2e/ajukan-pengaduan.spec.js` |   **3**     | **TC-FE-010**                              |
| `e2e/isi-survei-anonim.spec.ts` | **2**     | milik tim dev (rute publik `/isi/:id`)     |
| `e2e/statistik-sampah.spec.js` | **2**     | pagar regresi **BUG-013** (bukan TC — lihat §Y.8) |
| `e2e/notifikasi-siklus.spec.js` | **4**    | pagar regresi **BUG-014** & **BUG-018** (§Y.8) |
| `e2e/sso-galat.spec.js`       | **2**       | pagar regresi **BUG-019** (§Y.8)           |
| **Total**                     |   **19**    |                                            |

**Perubahan 2 September 2026 (setelah 81 commit):** dua suite pecah dan sudah
diperbaiki, keduanya karena produknya membaik — bukan karena produknya rusak.

| Suite                     | Yang terjadi                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NotificationDropdown`    | 9 kasus gagal serentak begitu BUG-002 diperbaiki. Semuanya bergantung pada helper `getByRole('button', { name: '' })` — kueri yang dulu berbunyi begitu justru karena tombolnya tak bernama |
| `QuestionCard`            | 1 kasus gagal karena kartu kini bercabang menurut `question.type`; fixture lama tanpa `type` jatuh ke cabang "tipe belum dapat ditampilkan" sehingga tak ada radio yang dirender      |

`QuestionCard.test.jsx` ditulis ulang dari 1 menjadi 12 kasus, mencakup ketiga
tipe pertanyaan beserta dua cabang penjagaannya.

> **Cara memverifikasi ulang** sebelum sesi pengujian berikutnya:
> `cd apps/web && npx jest --ci --forceExit`
> Jalankan **dua kali** — run pertama setelah cache dingin bisa melebihi batas waktu
> dan memberi hasil merah palsu. `--forceExit` diperlukan karena Jest belum keluar
> sendiri (kebocoran handle, lihat catatan di TEST_PLAN §7).

### Y.2 Lapisan E2E (Playwright) — dibangun 2 September 2026

Sebelumnya `apps/web/e2e/` kosong dan `playwright.config.ts` masih menunjuk
`http://localhost:3000` — alamat yang membalas 404 pada praktis semua rute di
lingkungan ini. Setiap spec E2E akan gagal tanpa sebab yang jelas, jadi tak ada
gunanya menulis spec sebelum alasnya dibetulkan.

**Menjalankan:** `cd apps/web && pnpm test:e2e`

**Jangan menjalankannya dua kali beruntun.** Backend membatasi **100 permintaan
per 60 detik per IP** (`ThrottlerModule`, `app.module.ts`), dan satu kali jalan
sudah memakai sebagian besar jatah itu. Jalan kedua dalam menit yang sama pasti
kena 429. Helper `masuk.js` dan sapuan rute masing-masing memasang pengintai 429
supaya kegagalannya berbunyi jelas — sebelum ada pengintai itu, gejalanya hanya
`expect(locator).toBeVisible() failed`, pesan yang tak menyebut sebabnya sama
sekali. Beri jeda satu menit antar-jalan.

**Prasyarat:** lingkungan pengembangan (reverse proxy + API + Next.js) sudah
hidup di `http://skema.local`. Playwright **tidak** menyalakannya sendiri —
blok `webServer` bawaan dihapus, karena yang bisa dinyalakannya hanyalah
`next dev`, sementara yang harus hidup adalah seluruh tumpukan di balik proxy.
Menyalakan `next dev` kedua dari sini juga menimpa `.next` milik server yang
sedang berjalan dan membuat semua rute 404. Alamatnya dapat diarahkan ke
lingkungan lain lewat `E2E_BASE_URL`.

**Data uji:** spec memakai satu survei tetap berjudul
`[UJI E2E] Survei Otomatis — jangan hapus`, dibuat otomatis pada jalan pertama
lalu dipakai ulang seterusnya. Pemakaian ulang ini bukan pilihan gaya melainkan
keharusan: backend hanya mengenal transisi draft→aktif, draft→ditutup, dan
aktif→ditutup, sedangkan survei hanya boleh dihapus saat berstatus draft —
**survei yang sudah diaktifkan tidak dapat dihapus lagi lewat aplikasi.** Kalau
tiap jalannya suite membuat survei baru, basis data pengembangan akan menumpuk
survei mati yang tak seorang pun bisa bersihkan. Bendera
`allowMultipleSubmit: true` pada survei itulah yang membuat akun warga yang sama
boleh mengisinya berulang kali. Yang tetap bertambah tiap jalan hanyalah baris
respons di dalam survei uji itu sendiri.

> **4 September 2026.** Survei fixture ini **dihapus dari basis data dev** atas
> permintaan penguji, bersama sisa data uji lainnya. Suite tidak rusak karenanya:
> `pastikanSurveiUji()` membuatnya kembali pada jalan berikutnya, dengan id baru.
> Konsekuensinya jalan pertama sesudah pembersihan **sedikit lebih lambat**
> (penyiapan survei + 3 pertanyaan), dan id survei yang tercatat di laporan lama
> tak lagi cocok. Menghapusnya berkala memang lebih baik daripada membiarkannya
> menumpuk: responsnya ikut terbaca sebagai angka di `/statistics` publik.

**Jebakan yang sudah ditemui & diperbaiki:** dengan `fullyParallel`, penyiapan
data di `beforeAll` berjalan **sekali per worker**. Dua worker sempat sama-sama
melihat basis data tanpa survei uji lalu sama-sama membuatnya; tiap worker
memakai survei yang berbeda, dan spec mencari responsnya di survei yang keliru —
gejalanya menyesatkan (jawaban "tidak ditemukan" padahal pengiriman berhasil).
Penyiapan data karena itu dipindahkan ke `globalSetup`, yang berjalan tepat sekali
sebelum worker mana pun menyala.

**Cakupan mutasi.** Sepuluh mutasi berikut sengaja ditanam pada kode produksi,
dijalankan, lalu dikembalikan — tanpa langkah ini sebuah spec hijau tak
membuktikan apa pun selain bahwa ia tidak melempar galat:

| Mutasi pada kode produksi                                     | Akibat yang tertangkap                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `toSubmitAnswers` selalu mengirim `nilai: 1` untuk skala      | Layar tetap "Terima Kasih!", **hanya** pemeriksaan data yang merah — inilah alasan spec tak berhenti di layar |
| `adaptFillQuestion` membuang opsi tipe `pilihan` (bentuk BUG-005) | Opsi jawaban tak dirender; spec merah di pertanyaan kedua       |
| `SurveyNavigation` mengunci tombol untuk semua tipe            | Tombol "Kirim Survei" nonaktif pada pertanyaan uraian; spec kedua merah |
| `proxy.js` — pemeriksaan `forbidden` dimatikan                 | Spec proteksi route merah dan **menyebutkan ketiga rute yang bocor**: `/admin-kab/dashboard`, `/admin-opd/dashboard`, `/admin-opd/complaints` semuanya terbuka bagi responden |
| `CreateComplaintForm` — pengosongan sub-kategori dimatikan | `subKategori: "jalan_rusak"` terkirim bersama kategori `keamanan_ketertiban` — pasangan yang tak sah |
| `complaints.api.js` — field `judul` diganti `title` | Payload multipart merah, menyebut field yang tertukar |
| `ChatMessageList` — `senderRole` berhenti diteruskan | Balasan admin kehilangan label pengirimnya dan tampil sebagai pesan warga sendiri |
| `ChatReplyForm` — syarat lampiran dihapus dari `disabled` | Balasan berlampiran tanpa teks terkunci lagi (cacat 6 Agustus 2026 kembali) |
| Daftar pengaduan — Reset Filter menyetel status ke `''` | Tabel kosong sesudah "reset": 1 baris, seharusnya 5 |
| Daftar pengaduan — pencarian dipersempit ke judul saja | Pencarian nomor tiket dan nama pelapor sama-sama merah |

### Y.3 Kompilasi dingin — sebab kegagalan yang tampak seperti flaky

Sebelum pemanasan dipasang, spec proteksi route gagal **berpindah-pindah**: sekali
di uji "responden", jalan berikutnya di uji "admin OPD". Mudah salah dibaca sebagai
proteksi route yang goyah.

Penyebabnya bukan proteksinya. `next dev` mengompilasi rute saat pertama diminta,
dan kunjungan pertama ke halaman berat melewati batas 60 detik. Begitu satu rute
selesai dikompilasi ia tak pernah lambat lagi — lalu giliran rute berikutnya yang
belum pernah dibuka, sehingga yang merah seolah berpindah sendiri. Pengukuran per
navigasi sesudah pemanasan: **220–1058 ms**, tak satu pun mendekati batas.

Perbaikannya di `e2e/support/global-setup.js`: setiap rute diminta sekali sebelum
worker mana pun menyala.

**Sebab kedua yang bergejala sama — empat worker berebut satu `next dev`
(4 September 2026).** Sesudah basis data dibersihkan, tiga jalan penuh berturut-turut
gagal 1–2 kasus, dan **kasus yang merah berpindah-pindah** persis seperti gejala
kompilasi dingin: sekali `isi-survei`, berikutnya `ajukan-pengaduan`. Semua
kegagalannya berbentuk sama — `page.goto` menunggu `load` sampai lewat 60 detik.

Godaannya adalah menyalahkan pembersihan data, sebab waktunya berdekatan. Yang
membantahnya satu percobaan yang membedakan:

| Cara menjalankan | Hasil |
| ---------------- | ----- |
| `pnpm exec playwright test` (4 worker, bawaan) | 8/9, lalu 8/9, lalu 7/9 — kasus merahnya berganti tiap jalan |
| spec yang sama sendirian | **2/2 lulus, 11 detik** |
| `pnpm exec playwright test --workers=1` | **9/9 lulus, 3,3 menit** |

Jadi sebabnya **perebutan, bukan data dan bukan cacat produk**: server dev satu
proses, empat worker meminta rute berbeda serentak, dan salah satu navigasi
tersendat melewati batas 60 detik. Server itu sendiri sehat — diukur langsung,
tiap rute menjawab dalam **21–105 ms**.

Yang perlu diketahui penguji berikutnya: **kegagalan E2E yang berpindah-pindah
hampir tak pernah berarti produknya rusak.** Jalankan ulang dengan `--workers=1`
sebelum menulis temuan apa pun — serial memang tiga kali lebih lambat, tetapi ia
menjawab pertanyaan "produk atau perkakas?" dalam satu jalan.

> **Diperbarui 15 September 2026: serial pun kini tak cukup.** Sesudah `main`
> ditarik, suite E2E tumbuh menjadi 11 pengujian dan kegagalan berpindah-pindah
> itu muncul **walau `--workers=1`** — tiga jalan penuh berturut-turut
> menghasilkan 3, lalu 1, lalu 1 kegagalan, dengan kasus yang berbeda tiap kali,
> sementara tiap berkas lulus penuh bila dijalankan sendirian.
>
> Dua dugaan yang paling masuk akal sudah **dipatahkan dengan bukti**, dan itu
> sebabnya bagian ini tak menyimpulkan lebih jauh:
>
> | Dugaan | Bukti yang mematahkannya |
> | ------ | ------------------------ |
> | Batas laju backend (100/60 dtk) | log API: **nol** balasan 429 sepanjang jalan penuh |
> | Server dev kewalahan | navigasi paling lambat di log Next.js: **1,8 detik**, jauh dari batas 60 detik |
>
> Seluruh kegagalannya berbentuk `page.goto`/`waitForURL` menunggu `load` sampai
> lewat batas — yaitu **di sisi peramban**, bukan di server. Sebabnya belum
> ditemukan, dan mengarang kesimpulan di sini lebih berbahaya daripada
> mengakuinya. Sampai itu terjawab: **jalankan per berkas** bila hasilnya hendak
> dipakai untuk menilai produk. Cookie yang dipakai pemanasan sengaja **palsu** — `proxy.js`
hanya memeriksa ada-tidaknya cookie sesi, jadi itu cukup untuk melewati penjaga
navigasi agar halamannya benar-benar dirender dan terkompilasi. Tak satu pun
pernyataan uji bergantung padanya.

> **Pembaruan 15 September 2026 (sore) — satu jalan penuh yang bersih.** Sesudah
> pagar regresi BUG-013 ditambahkan, suite dijalankan **penuh dengan 4 worker**
> (13 pengujian, bukan `--workers=1`): **11 lulus, 2 dilewati, nol gagal**, 2,0
> menit. Kegagalan berpindah-pindah itu **tidak muncul sama sekali**.
>
> Yang berubah di lingkungan sejak tiga jalan bermasalah itu: basis data
> dikembalikan ke garis dasar (7.986 notifikasi tanpa induk disapu, lalu sisa data uji
> tiap jalan ikut dibersihkan), dan `next dev` sudah lama menyala sehingga
> seluruh rute terkompilasi. Keduanya **dugaan, bukan sebab yang terbukti** —
> satu jalan bersih tak membatalkan tiga jalan bermasalah.
>
> Karena itu anjurannya diturunkan, bukan dicabut: **jalankan per berkas bila
> hasilnya hendak dipakai menilai produk**, tetapi jalan penuh tak lagi otomatis
> dianggap tak berarti. Kalau tiga jalan penuh berikutnya juga bersih, catatan
> di atas boleh ditutup.
>
> **Pembaruan kedua — satu sebab BARU ditemukan, dan ia hanya menjelaskan
> sebagian.** Dua jalan sore itu mati di `globalSetup` dengan pesan yang tak
> pernah terlihat sebelumnya, **`POST /auth/dev-login → HTTP 502`**. Penelusurannya
> berakhir pada **[CAT-020](BUG_REPORTS.md#cat-020)**: nginx menandai upstream
> `skm_api` mati saat API sedang restart, lalu **tidak memulihkannya sendiri**.
> `http://skema.local/` tetap 200 sementara `…/api/v1/*` membalas **502**
> berjam-jam. Halaman tetap sampai (`domcontentloaded` menyala), tetapi setiap
> panggilan API di dalamnya gagal, sehingga `load` tak pernah tuntas — bentuk
> kegagalan yang **persis sama** dengan yang dicatat belum terjelaskan di atas.
>
> **Karena itu, sebelum satu pun kegagalan E2E ditulis sebagai temuan:**
>
> ```
> curl -o /dev/null -w "api=%{http_code} " http://skema.local/api/v1/statistics
> curl -o /dev/null -w "web=%{http_code}\n" http://skema.local/
> ```
>
> `api=502` dengan `web=200` berarti proxy-nya, bukan produknya. Sembuhkan
> dengan `docker exec skm-proxy nginx -s reload`, lalu ulangi jalannya.
>
> **Batas kejujurannya perlu ditulis terang.** CAT-020 menjelaskan **dua** jalan
> yang mati di `globalSetup` dengan 502 — tak lebih. Jalan penuh sesudah nginx
> dimuat ulang, dengan `api=200` dan `web=200` terverifikasi sebelum dan
> sesudahnya, **tetap gagal 5 dari 17**, seluruhnya berupa `page.goto` /
> `waitForURL` yang kehabisan waktu, tanpa satu pun 502 maupun 429 di lognya.
> Kegoyahan yang asli karena itu **masih belum terjelaskan**.
>
> Satu pola yang bertahan di seluruh jalan hari itu dan pantas dicatat sebagai
> arah, bukan kesimpulan: **empat pengujian E2E yang murni lewat API** (pagar
> BUG-013, BUG-014, BUG-018) **selalu lulus, dalam hitungan ratusan milidetik**,
> pada jalan yang sama tempat pengujian berperamban kehabisan waktu 60 detik.
> Yang goyah tampaknya sisi peramban di bawah beban, bukan backend-nya.

#### Y.3.1 Sebabnya akhirnya terukur — empat peramban berebut satu mesin (15 September 2026, malam)

Dugaan di atas ("sisi peramban di bawah beban") **diuji, bukan dibiarkan sebagai
dugaan.** Tiga pengukuran, di mesin yang sama, dalam rentang setengah jam.

**1. Jalan penuh pada tiga setelan worker.**

| Worker | Hasil | Waktu |
| -----: | ----- | ----: |
| **4** (bawaan Playwright) | **5 dari 19 GAGAL** | 4,0 menit |
| **2** | 0 gagal, lalu 1 gagal pada ulangan | 2,2 / 1,9 menit |
| **1** | **0 gagal** | 2,3 menit |

Perhatikan kolom waktunya, dan ini yang mengubah keputusan: **satu worker tidak
lebih lambat daripada empat.** Paralelisme di mesin ini tak memberi apa pun untuk
ditukar — ia hanya menukar kestabilan dengan ketiadaan keuntungan.

**2. Waktu muat halaman, satu konteks berbanding empat konteks serentak.**

| Rute | 1 konteks | 4 konteks serentak |
| ---- | --------: | -----------------: |
| `/` | 1.600 ms | **11.748 ms** |
| `/surveys` | 1.405 ms | **12.866 ms** |
| `/complaints/new` | 1.669 ms | **12.749 ms** |
| `/` | 1.618 ms | **12.038 ms** |

Delapan kali lipat, rute yang sama, menit yang sama.

**3. Kendali yang menunjuk tersangkanya.** Empat permintaan HTTP serentak ke rute
yang sama, **tanpa peramban**, dilayani dalam **0,09–0,47 detik**. Jadi yang
kehabisan napas bukan `next dev`, bukan nginx, bukan basis data — melainkan
**empat Chrome yang berebut satu mesin** sambil mengurai bundel Next.js mode dev.
Mesinnya: 4 inti fisik, 8 prosesor logis, RAM bebas ~2,7 GB.

**Kenapa bukti lama menyimpulkan sebaliknya.** §Y.3 pernah mematahkan dugaan
"server dev kewalahan" dengan "navigasi paling lambat di log Next.js: 1,8 detik".
Angka itu benar — dan **mengukur hal yang salah**: ia waktu kerja server, yang
memang tetap sehat. Yang meledak waktu muat ujung-ke-ujung di peramban. Dua besaran
berbeda yang mudah tertukar, dan tertukarnya membuat tersangka yang tepat bebas
selama dua minggu.

**Yang diubah.** `playwright.config.ts` kini memakai
`workers: Number(process.env.E2E_WORKERS ?? 1)` — satu worker secara bawaan,
dengan seluruh angka di atas tertulis sebagai komentar di sana supaya tak ada
yang menaikkannya kembali tanpa mengukur ulang. Mesin yang lebih lapang boleh
memakai `E2E_WORKERS=4 pnpm test:e2e`.

**Satu jalan lagi yang menegaskannya, beserta jebakannya (15 September 2026, 03.30).**
Jalan penuh pada satu worker gagal **2 dari 19** ketika RAM bebas mesin tinggal
**1,6 GB** (saat jalan hijau sebelumnya: 2,7 GB). Salah satu kegagalannya tampak
seperti temuan produk:

```
Rute yang menyimpang dari matriks A.5.1:
  /surveys → /surveys (seharusnya /admin-opd/dashboard)
```

Dijalankan **sendirian**, berkas itu **lulus keempat-empatnya** — penyimpangan itu
tak terulang. Ia artefak URL yang tersampel sebelum pengalihannya tuntas pada
navigasi yang melambat, bukan proxy yang jebol. Melaporkannya langsung akan
menjadi tuduhan palsu terhadap penjaga yang justru bekerja — pelajaran §Y.5,
terulang persis.

**Aturannya, karena itu:** kegagalan E2E yang berbentuk penyimpangan rute atau
kehabisan waktu **wajib diulang per berkas** sebelum ditulis sebagai temuan, dan
RAM bebas mesin pantas ikut dicatat bersama hasilnya.

**Batasnya, supaya tak diklaim lebih dari yang terbukti.** Satu jalan dengan dua
worker tetap gagal satu; jadi beban bukan satu-satunya bumbu, hanya yang paling
menentukan. Dan tiga jalan bermasalah 15 September **pagi** berjalan sebelum
seluruh pengukuran ini — sebagiannya sudah dijelaskan
[CAT-020](BUG_REPORTS.md#cat-020), sisanya tak pernah diperiksa dengan alat ini.
Yang dapat dikatakan dengan yakin: **pada setelan bawaan, suite ini tidak dapat
dipercaya di mesin sekelas ini, dan sebabnya bukan produknya.**

### Y.4 Cache peramban — kegagalan yang mustahil berasal dari proxy

Sapuan matriks pernah merah dengan pola yang tak masuk akal: **kedelapan rute
tinggal di tempat**, termasuk kombinasi yang tak dapat dihasilkan keadaan cookie
mana pun. `/dashboard` bertahan menuntut `role=responden`, sementara di sapuan
yang sama `/admin-opd/dashboard` juga bertahan — dan itu menuntut `role=opd`.
Tidak ada satu nilai cookie pun yang menghasilkan keduanya sekaligus, jadi
keputusan itu mustahil datang dari `proxy.js`.

Sisi server dikesampingkan dengan dua bukti: `curl` pada kelima rute dengan
cookie `kabupaten` membalas 307 yang benar, dan 125 permintaan serentak
(sampai 30 paralel) **seluruhnya** dialihkan dengan benar — server tak pernah
sekali pun melewatkan proxy.

Yang tersisa adalah **cache peramban**: halaman yang dilayani dari cache tak
pernah melewati proxy, sehingga tampak "tidak dialihkan" — tak terbedakan dari
penjagaan akses yang jebol. Sapuan kini menyetel `Cache-Control: no-cache,
no-store, max-age=0` pada konteksnya sehingga setiap navigasi dipaksa sampai ke
server.

> **Kejujuran soal bukti:** akar penyebabnya **dipersempit, bukan dibuktikan**.
> Kegagalannya hanya muncul saat mesin sedang terbebani (± 2 dari 10 kali jalan),
> dan tidak pernah berhasil direproduksi ulang saat instrumentasi terpasang.
> Yang sudah pasti: aplikasinya tidak bersalah — proxy bekerja benar pada setiap
> pengujian langsung. Sesudah cache dimatikan, tiga kali jalan berturut-turut
> hijau seluruhnya (2,1 mnt · 1,3 mnt · 51,6 dtk). Bila pola "seluruh rute
> tinggal di tempat" muncul lagi, **jangan** langsung membaca itu sebagai proteksi
> route yang jebol — periksa dulu apakah navigasinya benar-benar sampai ke server.

### Y.5 Probe yang tak sah — kegagalan pengujian yang menyamar jadi cacat produk

Y.3 dan Y.4 membahas pengujian yang **merah tanpa sebab**. Bagian ini kebalikannya,
dan lebih berbahaya: pengujian yang **memberi jawaban** padahal tak pernah benar-benar
menguji apa pun. Empat terjadi pada 3 September 2026, semuanya tertangkap sebelum
masuk laporan — tetapi hanya karena hasilnya sempat diragukan, bukan karena ada
yang otomatis mencegahnya.

**1. Baris keadaan-kosong ikut terhitung sebagai data.** Probe pencarian OPD
menghitung `tbody tr`. `OPDTable` merender keadaan kosongnya **juga sebagai `<tr>`**
("Tidak ada data OPD yang ditemukan."), jadi setiap kasus mengembalikan angka 1 —
baik ketika menemukan satu OPD maupun ketika tak menemukan apa pun. Ketujuh kasus
tampak seragam dan laporannya terbaca bersih. Kata kunci yang dipakai kebetulan
hanya cocok dengan **satu** OPD, sehingga angka yang benar dan angka yang palsu
kebetulan sama. Pengulangannya memakai kata kunci yang cocok dengan **18** OPD,
mengecualikan baris keadaan-kosong, dan membandingkan dengan hitungan backend —
lalu dua cacat spasi langsung muncul.

**2. Formulir diisi dengan cara yang tak mungkin bekerja.** Probe ketahanan menekan
keempat `<input type="radio">` sekaligus di layar pertama, lalu mencari tombol
"Kirim". Pengisian survei berupa **wizard satu pertanyaan per layar**, dan opsinya
`<input class="hidden peer">` di dalam `<label>` yang tak dapat diklik langsung
(`RadioCard.jsx`). Nol permintaan terkirim — tetapi laporannya berbunyi "pengiriman
gagal tanpa pemberitahuan" dan "jawaban hilang": **dua tuduhan berat terhadap kode
yang tak pernah dijalankan.** Sesudah alurnya menyalin `e2e/isi-survei.spec.js`,
keduanya terbukti justru bekerja dengan benar.

**3. Kompilasi dingin, untuk ketiga kalinya.** Lihat Y.3.

**4. Elemen diukur sebelum gambarnya dimuat.** Probe TC-FE-007 melaporkan halaman
isi survei bergulir mendatar **809 px** pada lebar 360 px — temuan yang, kalau
benar, berarti tombol "Pertanyaan Selanjutnya" terdorong keluar layar dan warga tak
dapat menyelesaikan survei sama sekali. Satu hal pada hasilnya janggal: **layar 320
px justru bersih**, padahal layar yang lebih sempit mustahil lebih baik. Penyebabnya
gambar `w-auto` yang belum punya dimensi intrinsik pada saat diukur; peramban
sementara memberinya lebar penuh. Pengulangan pada 320/360/390/414 px dengan

```js
await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete));
```

menunjukkan **keempatnya bersih**. Temuannya dibatalkan sendiri sebelum dilaporkan.
Pelajarannya sejajar dengan tiga di atas: pengukuran tata letak baru sah **sesudah**
segala yang memengaruhi tata letak selesai dimuat.

**Penjaga yang dipasang sesudahnya.** Setiap probe kini **menghitung permintaan yang
benar-benar terkirim** dan menolak menyimpulkan apa pun bila angkanya nol:

```js
console.log(`   POST terkirim: ${jumlahPost} (harus 1 — kalau 0 pengujiannya yang salah)`);
if (jumlahPost === 0) {
  console.log('   !! POST tak pernah terjadi — probe ini tak sah, tak ada kesimpulan diambil');
} else { /* baru di sini boleh menilai */ }
```

Aturannya satu kalimat: **sebelum melaporkan sesuatu tidak terjadi, buktikan dulu
bahwa pemicunya benar-benar terjadi.** Probe yang diam bisa berarti aplikasinya
rusak — atau berarti probenya sendiri yang tak pernah menyentuh aplikasi, dan
keduanya terlihat persis sama di layar.

### Y.6 `.next` tercemar build produksi — seluruh rute 404, dan bukan salah aplikasi

Terjadi **3 September 2026**, kali kedua. Perlu ditulis di sini karena gejalanya
terbaca persis seperti bencana produk: sapuan 37 rute melaporkan **37 dari 37
adalah 404**, termasuk beranda warga dan seluruh area admin.

**Bukan cacat aplikasi.** Direktori `apps/web/.next` berisi artefak build
**produksi** — `BUILD_ID`, `prerender-manifest.json`, `export-marker.json`,
`routes-manifest.json` — bertanggal 2 September 11:15, sementara `next dev`
memakai direktori yang sama. `pnpm build` di root (`pnpm -r build`) dan
`pnpm dev` (`pnpm -r --parallel dev`) sama-sama menulis ke `apps/web/.next`.

**Cara mengenalinya, tanpa menuduh kode lebih dulu:**

| Yang diamati                                   | Artinya                                              |
| ---------------------------------------------- | ---------------------------------------------------- |
| `/` tetap 200, hampir semua rute lain 404      | bukan kode yang rusak — kode rusak tak memilih rute   |
| 404 juga muncul di `localhost:3000` langsung   | nginx & cache peramban **bukan** penyebabnya          |
| `X-Powered-By: Next.js` + badan `_not-found`   | Next sendiri yang menolak, bukan proxy di depannya    |
| log dev **tak mencatat** "○ Compiling /about"  | rutenya tak pernah dicoba dikompilasi                 |
| `.next/BUILD_ID` & `export-marker.json` ada    | **bukti** `next build` pernah menimpa direktori dev   |

> ⚠️ **Rute berpenjaga membalas 307, dan itu menipu.** `proxy.js` menjawab lebih
> dulu, jadi `/admin-kab/dashboard` tetap "307" seolah sehat padahal halamannya
> 404 begitu penjaga dilewati. Memeriksa status HTTP saja **tidak cukup** —
> harus masuk dengan sesi yang sah, atau memeriksa rute publik yang tak
> tersentuh matcher (`/about`, `/statistics`, `/sso/callback`).

**Pemulihan** (terbukti — sesudahnya 37/37 rute 200):

```powershell
# 1. matikan SELURUH proses dev (pnpm dev, next dev, nest start --watch)
# 2. buang direktorinya
Remove-Item "apps\web\.next" -Recurse -Force     # waktu itu 2,1 GB
# 3. nyalakan lagi, terlepas dari sesi
# 4. verifikasi rute publik dulu, baru yang berpenjaga
```

Kunjungan pertama tiap rute setelah itu memakan 1–40 detik (kompilasi dingin —
lihat §Y.3, bukan kerusakan), lalu cepat.

**Pencegahannya ada di sisi perkakas, bukan di sisi penguji.** Selama
`next build` dan `next dev` berbagi satu `apps/web/.next`, kejadian ini akan
berulang. Usul untuk tim pengembang: tolak `next build` selagi dev hidup, lewat
`prebuild` yang memeriksa port 3000 —

```json
"scripts": {
  "prebuild": "node scripts/cek-dev-tidak-jalan.mjs",
  "build": "next build"
}
```

```js
// apps/web/scripts/cek-dev-tidak-jalan.mjs
// Menolak build selagi dev server hidup: keduanya menulis ke .next yang sama,
// dan yang kalah adalah dev server — seluruh rutenya berubah 404 tanpa satu
// pesan galat pun. Di CI & Docker tak ada yang mendengarkan port 3000, jadi
// penjaga ini tak pernah menghalangi build sungguhan.
import net from 'node:net';

const port = Number(process.env.PORT ?? 3000);
const soket = net.connect({ port, host: '127.0.0.1' });
soket.on('connect', () => {
  soket.destroy();
  console.error(
    `\n  Ada yang melayani port ${port} — kemungkinan besar \`next dev\`.\n` +
      `  \`next build\` akan menimpa .next miliknya dan membuat SELURUH rute 404.\n` +
      `  Matikan dev server dulu, lalu ulangi.\n`,
  );
  process.exit(1);
});
soket.on('error', () => process.exit(0));
```

Perubahan itu **belum diterapkan** — ia menyentuh perkakas build milik tim
pengembang, di luar cakupan penguji.

---

### Y.7 Kontrak yang berubah di bawah kaki pengujian (tarikan `main`, 15 September 2026)

Menarik 85 commit `main` ke `tester` membuat **16 kasus uji merah di 4 berkas**.
Tak satu pun ternyata cacat produk. Semuanya satu jenis kegagalan yang sama:
**pengujian masih berbicara dengan kontrak yang sudah tidak ada.**

Bagian ini mencatat kontrak-kontrak itu, karena ia akan menagih lagi pada tarikan
berikutnya — dan karena tanpa catatan ini, kegagalan serupa mudah sekali dibaca
sebagai "produknya rusak".

| Kontrak lama | Kontrak sekarang | Yang patah karenanya |
| ------------ | ---------------- | -------------------- |
| `GET /auth/me` → `role` tunggal | `roles` (kepemilikan) + `actingRole` (yang sedang dipakai) | navbar & sidebar merender `-`; menu superuser hilang |
| Callback SSO membaca `/auth/me` | membaca **`/auth/roles`** | tiruan `/auth/me` tak berpengaruh; handler bawaan yang menjawab |
| Pemilih AREA superuser (`roleHome.js`) | pemilih **PERAN** untuk siapa pun ber-peran > 1 | `SUPERUSER_AREA_HOME` & `SUPERUSER_OPD_ENTRY` `undefined` |
| Balasan pengaduan dikenali dari `authorId` | `reply.dariPelapor` (kolom `dari_pelapor`) | balasan pelapor tampil sebagai balasan admin |
| Kategori pengaduan bertopik + sub-kategori | tiga kategori umum: `aduan`, `lapor`, `lainnya` | dropdown `Infrastruktur` tak pernah muncul |
| `dev-login` langsung menghasilkan sesi siap pakai | akun ber-peran banyak pulang `actingRole: null` | **401 "Peran yang ingin dipakai belum dipilih"** pada setiap endpoint terlindung |
| `/surveys/:id` langsung menampilkan soal 1 | ada gerbang "Sebelum Anda Mulai Mengisi" | `Pertanyaan 1 dari 3` tak pernah dirender |
| `kabupaten` boleh menengok `/admin-opd/*` | `ROLE_PREFIXES` mengurungnya di `/admin-kab` | satu sel matriks A.5.1 menyimpang |

**Aturan yang dipakai memutuskan tiap kasus.** Untuk setiap kegagalan ditanyakan
satu hal lebih dulu: *apakah perilaku barunya masuk akal bagi penggunanya?* Bila
ya — pengujiannya yang disesuaikan, dan alasannya ditulis di berkas itu. Bila
tidak — barulah ia menjadi temuan. Tak ada satu pun yang jatuh ke kelompok kedua
kali ini, dan itu perlu dikatakan terus terang: pengujian yang "diperbaiki" tanpa
pertanyaan itu hanya akan mengesahkan apa pun yang kebetulan sedang berlaku.

**Dua berkas uji penguji DIBUANG, bukan diperbaiki.** Menambal uji yang menguji
antarmuka yang tak pernah lagi dirender menghasilkan sesuatu yang lebih buruk
daripada tak ada uji: merah palsu hari ini, dan hijau palsu begitu tambalannya
"diperbaiki" sampai lulus.
- blok adapter di `ComplaintChat.test.jsx` — `complaint.adapter.test.js` milik
  tim dev mengujinya lebih dalam, termasuk kasus yang tak terpikir sebelumnya
  (akun pelapor yang menjawab **sebagai petugas** tetap dikenali admin);
- `PemilihPeranDanCallback.test.jsx` — pemilih AREA sudah tak ada. Bagian
  callback-nya yang masih hidup dipindah ke `AuthCallbackLoader.test.jsx`.

**Dua konflik merge diselesaikan dengan memakai versi `main`.**
`CreateComplaintForm.test.jsx` (7 kasus milik penguji vs **30** milik tim dev
yang sudah menguji ketiadaan sub-kategori) dan `authStorage.test.js` (12 vs 15,
milik tim dev menguji "sesi hantu" jalur SSO). Dalam kedua kasus versi penguji
menguji fitur yang sudah dihapus.

**Perkakas E2E yang ikut diperbaiki** — ketiganya tak terlihat dari uji komponen
mana pun:
1. `support/api.js` — `masukApi()` kini memanggil `POST /auth/acting-role` bila
   akunnya ber-peran banyak. Tanpa ini `globalSetup` meledak jauh dari spec mana
   pun, dengan pesan yang terbaca seolah akunnya tak berhak.
2. `support/masuk.js` — menekan tombol peran bila pemilihnya muncul. Dua jebakan
   sekaligus di sini, dan keduanya sempat menipu:
   - `isVisible()` menjawab **seketika** dan tak menerima batas waktu, jadi ia
     selalu `false` sebelum pemilihnya sempat dirender → dipakai `waitFor`;
   - `getByRole('button', { name })` mencocokkan **substring**, dan beranda
     publik memuat tombol "Survei Kepuasan **Masyarakat**" → tombol itu tertekan
     dan sapuan matriks melaporkan area admin "terbuka" bagi responden, seolah
     proxy jebol. Diperiksa terpisah dengan cookie sungguhan, proxy-nya justru
     benar. Diperbaiki dengan pola berjangkar (`/^Masyarakat\b/`).
3. `isi-survei.spec.js` — `bukaSurvei()` melewati gerbang pengisian.

Jebakan kedua pada butir 2 pantas diingat melebihi perbaikannya: **sebuah
pengujian yang salah tekan dapat menuduh penjaga keamanan yang sebenarnya
bekerja.** Lihat juga §Y.5.

### Y.8 Pagar regresi untuk temuan yang belum diperbaiki (15 September 2026)

Enam temuan sesi C-14…C-19 terdokumentasi rapi, tetapi **tak satu pun terkunci
uji otomatis**. Itu persis nasib CAT-004: tiga minggu menganggur sebagai
catatan, lalu menjelma jadi [BUG-005](BUG_REPORTS.md#bug-005) tanpa ada yang
menangkapnya. `e2e/statistik-sampah.spec.js` menutup yang paling mahal di antara
keenamnya, [BUG-013](BUG_REPORTS.md#bug-013).

**Masalahnya: bagaimana mengunci cacat yang belum diperbaiki.** Menuliskannya
sebagai harapan biasa berarti suite merah setiap hari karena hal yang sudah
diketahui — dan merah yang permanen berhenti dibaca orang. Jawabannya
`test.fail()`: selama cacatnya ada suite hijau; begitu seseorang
memperbaikinya, uji itu **merah** dengan pesan `Expected to fail, but passed`
dan menuntut anotasinya dicabut. Sejak saat itu ia menjadi pagar regresi
sungguhan. Yang dikunci bukan perbaikannya, melainkan **momen perbaikannya**.

**Dua uji, bukan satu, dan itu bukan kelebihan.** `test.fail()` menelan
kegagalan apa pun — termasuk lingkungan yang mati. Ditulis sebagai satu uji, ia
akan hijau ketika backend tak menyala sama sekali. Karena itu langkah
penyiapannya berdiri sebagai uji tersendiri yang **wajib lulus**: ia membuat
survei, mengaktifkannya, mengirim satu jawaban bernilai 1, lalu menegaskan titik
tren `2027-Q4` benar-benar muncul pada angka 25. Barulah uji kedua membaca
akibat pembuangannya. Tanpa uji pertama, uji kedua bisa hijau semata karena tak
pernah ada yang tercatat.

**Kenapa titik tren, bukan IKM kabupaten.** `fullyParallel: true`, dan spec lain
mengirim jawaban ke survei uji bersama pada saat yang sama. IKM rata-rata dan
total responden ikut bergerak karenanya, jadi membandingkannya sebelum/sesudah
akan merah karena tetangganya. Periode `2027-Q4` dipilih jauh di depan supaya
tak ada data lain yang pernah menyentuhnya — titik tren di sana hanya dapat
digerakkan oleh survei yang dibuat spec itu sendiri.

**Dibuktikan dua arah, bukan hanya satu.** Penyaring `survey: { deletedAt: null }`
dipasang sementara pada `DashboardService.getStatistics`, dan uji kedua langsung
melaporkan `Expected to fail, but passed`; mutasinya lalu dikembalikan dan
statusnya kembali ke gagal-yang-diharapkan. Tanpa langkah itu, `test.fail()`
hanyalah uji yang gagal karena sebab apa pun.

#### Y.8.1 BUG-013 sudah diperbaiki di `main`, dan pagarnya akan memerah (19 Oktober 2026)

Perbaikan [BUG-013](BUG_REPORTS.md#bug-013) mendarat di `main` (`f1c132e`).
Cabang `tester` belum memuatnya, jadi hari ini `e2e/statistik-sampah.spec.js`
masih hijau sebagai gagal-yang-diharapkan. **Pada merge `main` berikutnya ia
melapor `Expected to fail, but passed`.** Itu bukan kerusakan, itu justru
pekerjaan yang dijanjikan paragraf-paragraf di atas. Yang harus dikerjakan saat
itu: **cabut `test.fail()`-nya, jangan hapus specnya.** Sejak saat itu ia pagar
regresi sungguhan, dan satu-satunya pagar yang menembus nginx serta server dev
seperti pengunjung sungguhan.

**Pembuktian dua arah di atas ternyata menjamin lebih sedikit daripada
kelihatannya, dan ini kekeliruan penguji yang pantas dicatat.** Penyaring yang
dipasang sementara itu hanya SATU klausa pada satu query, dan itu sudah cukup
membuat uji kedua melapor `Expected to fail, but passed`. Terukur 19 Oktober:
cacatnya sebenarnya tersebar di **tujuh** tempat. Jadi pagar ini akan menyatakan
"sudah diperbaiki" sesudah satu dari tujuh tempat ditutup, sementara enam
lainnya masih membocorkan jumlah responden, sebaran nilai, dan tiga angka dasbor
Admin OPD.

Sebabnya pilihan sinyalnya sendiri: pagar ini membandingkan **titik tren
`2027-Q4`** dan tidak lebih. Periode jauh di depan itu dipilih dengan alasan yang
tetap benar — `fullyParallel: true` membuat IKM rata-rata dan total responden
bergerak karena spec tetangga, sehingga membandingkannya akan merah karena
tetangganya, bukan karena cacatnya. Tetapi satu titik tren hanya menyentuh satu
dari tujuh tempat. Pagar yang kebal tetangga dan pagar yang menjaga seluruh
keluaran ternyata dua hal berbeda, dan yang dibangun di sini yang pertama.

Yang menutup enam tempat sisanya ada di lapisan lain: sembilan uji di
`apps/api/test/dashboard.e2e-spec.ts` pada `main`, yang membuang singgahan
sebelum tiap pembacaan sehingga boleh membandingkan angka mana pun tanpa takut
tetangga. Tujuh di antaranya dibuktikan lewat tujuh mutasi, satu per penyaring.
Rinciannya di [BUG_REPORTS.md §BUG-013](BUG_REPORTS.md#bug-013).

Pelajaran yang dapat dipakai pagar berikutnya: **`test.fail()` membuktikan kapan
seseorang menyentuh cacatnya, bukan bahwa cacatnya habis.** Keduanya mudah
tertukar, dan di sini memang tertukar.

**Satu efek samping yang menyingkap gigi BUG-014.** Spec ini memusnahkan
surveinya sendiri di `afterAll`, dan `bersihkan-data-uji.mjs` **tak dapat
menemukan notifikasi yang ditinggalkannya** — penyaringnya bertolak dari survei
yang masih ada. Tiga kali jalan meninggalkan 15 baris mati. Skrip pembersih
karena itu mendapat bendera opt-in `--tanpa-induk`, yang menyapu notifikasi bertaut
`/surveys/<id>` yang id-nya sudah tiada. Opt-in dan bukan bawaan: yang tersapu
bukan hanya milik data uji.


#### Lima pagar berikutnya — BUG-014 s/d BUG-018, lalu BUG-019 (15 September 2026, sore)

Keenam temuan C-14…C-19 kini berpagar, dan **BUG-019 dari C-09 menyusul pada sore yang sama** — tujuh pagar seluruhnya. Tiga di lapisan E2E, tiga di Jest, dan
**pemilihan lapisannya bukan selera**: yang dapat dibuktikan hanya oleh tumpukan
sungguhan tinggal di E2E — di Jest, MSW menjawab apa pun yang fixture-nya
katakan, jadi cacat backend mustahil tertangkap di sana.

| Temuan | Pagar | Lapisan | Yang dikunci |
| ------ | ----- | ------- | ------------ |
| BUG-014 | `e2e/notifikasi-siklus.spec.js` | E2E (API) | sesudah `purge`, tak ada notifikasi yang masih menaut surveinya |
| BUG-018 | `e2e/notifikasi-siklus.spec.js` | E2E (API) | meneruskan pengaduan tidak menambah kabar "Pengaduan Baru Masuk" kedua |
| BUG-015 | `pagar-bug-015-dialog-konfirmasi.test.jsx` | Jest + RTL | `role="dialog"`, nama aksesibel, nama tombol tutup |
| BUG-017 | `pagar-bug-017-dropdown.test.jsx` | Jest + RTL | nama terbaca memuat nilai; `aria-haspopup`; `aria-expanded` |
| BUG-016 | `pagar-bug-016-captcha-gagal.test.jsx` | Jest + RTL | kegagalan widget dilaporkan lewat jalur tersendiri |
| BUG-019 | `e2e/sso-galat.spec.js` | E2E (API) | kalimat galat dari Helpdesk tak ikut apa adanya ke layar warga |

**Jest punya anotasinya sendiri: `test.failing()`** (Jest ≥ 29.6), yang
berperilaku sama persis dengan `test.fail()` milik Playwright — lulus selama
badannya gagal, dan **gagal dengan pesan `Failing test passed even though it was
supposed to fail`** begitu cacatnya diperbaiki.

**Tiap pagar dibuktikan dua arah, seluruhnya enam siklus mutasi.** Cacatnya
diperbaiki sementara di kode produksi, pagarnya diamati memerah, lalu mutasinya
dikembalikan dengan `git checkout` dan `git status` diperiksa bersih. Yang
dimutasikan: penyaring `deletedAt` pada `getStatistics`, `notification.deleteMany`
pada transaksi `purge`, panggilan `notifyComplaintCreated` di `forward`, tiga
atribut ARIA pada `ConfirmActionModal`, tiga pada `Dropdown`, dan prop `onError`
pada `TurnstileWidget`. **Tak satu pun perbaikan itu ditinggalkan** — peran di
sini penguji, bukan pengembang.

**Satu pagar sengaja TIDAK ditulis di tempat yang paling menggoda.** Untuk
BUG-016, godaannya memasangnya di `ModalKirimSurvei`: render dengan
`captchaToken: null`, lalu tuntut sebuah pesan. Itu pagar yang bohong — keadaan
"token null" juga keadaan dua detik pertama setiap pengisian yang normal, jadi
uji itu menuntut peringatan muncul saat tak ada yang salah, dan perbaikan yang
benar (pesan hanya sesudah galat atau sesudah tenggat) tetap membuatnya merah.
**Pagar yang tak pernah bisa hijau bukan pagar.** Yang dikunci karena itu satu
tingkat di bawah: jalur pelaporan `TurnstileWidget`, tempat kegagalan hari ini
menjelma jadi `null` yang tak dapat dibedakan dari "belum".

**Satu jebakan struktur yang baru terlihat saat pagarnya memerah.**
`test.describe.configure({ mode: 'serial' })` semula dipasang di tingkat berkas
`notifikasi-siklus.spec.js`. Saat mutasi BUG-014 membuat pagar pertama memerah,
kedua uji BUG-018 **tidak dijalankan sama sekali** — terbaca di laporan sebagai
`did not run`, bukan hijau maupun merah. Serial lalu dipindahkan ke dalam
masing-masing `describe`. Jebakan ini hanya muncul pada keadaan yang justru
paling penting: saat cacatnya diperbaiki.

**Peringatan yang berlaku bagi keenamnya.** Anotasi gagal-yang-diharapkan yang
ditinggalkan pada kontrak yang sudah berubah adalah **pagar yang diam-diam
mati**. Bila perbaikan memilih jalur berbeda dari yang diandaikan pagar —
misalnya BUG-016 dilaporkan lewat keadaan store alih-alih prop `onError` —
pagarnya wajib disesuaikan, bukan dibiarkan hijau.

**Satu uji yang lama diam-diam bersandar pada cacat.** `Dropdown.test.jsx` milik
tim dev mencari pemicunya dengan `screen.getByLabelText('Instansi')`, dan itu
berhasil justru karena BUG-017. Ia tetap lulus sesudah diperbaiki, jadi bukan
penghalang — tetapi pantas diketahui sebelum seseorang menyimpulkan nama
aksesibelnya sudah teruji.
## Ringkasan Statistik Test Cases

> **DIHITUNG ULANG 2 September 2026 dari baris tabelnya sendiri, bukan disalin dari
> versi sebelumnya.** Angka lama meleset 17 kasus uji (tertulis 227, sebenarnya 244; kini 246 setelah TC-FE-032 & 033 ditambahkan):
> modul D, F, G, H, dan X bertambah isinya tanpa ringkasan ini ikut disesuaikan.
> Sebaran prioritasnya pun berbeda — yang paling berdampak, jumlah P0 ternyata **88**,
> bukan 81. Angka di bawah dihasilkan dengan menghitung tiap baris ber-ID `TC-*`
> dan kolom prioritasnya; hasilnya berimbang (88+106+35+3+14 = 246).

| Modul                    | Jumlah TC |   P0   |   P1    |   P2   |   P3  |
| ------------------------ | :-------: | :----: | :-----: | :----: | :---: |
| A — Auth & Akun          |    38     |   13   |   14    |   9    |   2   |
| B — Manajemen OPD        |    12     |   2    |   7     |   3    |   0   |
| C — Manajemen Akun Admin |    14     |   7    |   6     |   1    |   0   |
| D — Survei SKM           |    22     |   5    |   14    |   3    |   0   |
| E — Pertanyaan Survei    |    13     |   2    |   9     |   2    |   0   |
| F — Pengisian Survei     |    25     |   10   |   15    |   0    |   0   |
| G — IKM & Hasil          |    23     |   15   |   7     |   1    |   0   |
| H — Pengaduan            |    29     |   13   |   15    |   1    |   0   |
| I — Audit Log            |     7     |   0    |   0     |   7    |   0   |
| J — Parameter Boolean    |     3     |   0    |   0     |   1    |   2   |
| X — RBAC & Isolasi       |    31     |   13   |   3     |   1    |   0   |
| Y — Frontend & E2E       |  **50**   |   8    |   23    |   16   |   3   |
| **TOTAL**                |  **267**  | **88** | **113** | **45** | **7** |

> **14 baris Modul X (TC-RBAC-001 s/d 014) tidak berkolom prioritas** — tabelnya
> berbentuk matriks peran (Superuser · Kabupaten · Admin OPD · Responden), bukan
> tabel skenario biasa. Jumlahnya tetap dihitung pada kolom "Jumlah TC", sehingga
> 88+113+45+7 = 253, ditambah 14 = 267.
>
> **Dihitung ulang DUA KALI pada 15 Oktober 2026**, dengan cara yang sama seperti
> 2 September: menghitung tiap baris ber-ID `TC-*` dari tabelnya sendiri. Pertama
> sesudah Modul J lahir, lalu sesudah TC-FE-050 dan 051 ditambahkan. Pada kedua
> pembacaan, modul-modul lain kembali pada angka yang sudah tertulis di sini,
> jadi yang berubah hanya baris yang memang disunting beserta totalnya.

> **Sebaran menurut tipe:** `Integ` 174 · `Component` 43 · `Unit` 33 · `Manual` 11 · `E2E` 6.
>
> Yang berada di **lingkup pengujian frontend** hanyalah tipe `Component`, `E2E`,
> dan `Manual` — kini **60 kasus**, naik dari 34. (`Manual` berarti dijalankan di
> peramban oleh penguji tanpa berkas uji otomatis; ia tetap lingkup frontend.) Seluruh 33 kasus bertipe `Unit` justru **ranah
> backend** — pengujian service NestJS, terbanyak pada rumus IKM (14) dan validasi
> pengisian (8).

> **88 test cases (P0)** harus lulus 100% sebelum rilis. Fokus utama: isolasi data OPD (11 TC API), keamanan sisi klien & nilai IKM 1–4, E2E alur kritis responden, nomor tiket unik, dan RBAC.
>
> **Status eksekusi per 3 September 2026** — baru Modul Y yang dieksekusi (frontend,
> lingkup tester). Dari **48** kasus uji Modul Y: **40 ✅ lulus**, **5 🟡 tercakup sebagian**,
> **3 ❌ gagal** — TC-FE-031 (salinan survei kehilangan opsi jawaban, [BUG-005](BUG_REPORTS.md#bug-005),
> satu-satunya temuan **Critical** yang terbuka: survei terbit menjadi buntu total bagi warga),
> TC-FE-033 ([BUG-007](BUG_REPORTS.md#bug-007), Low), dan TC-FE-034
> ([BUG-008](BUG_REPORTS.md#bug-008), Medium) — dan **tak ada lagi yang ⬜ belum dikerjakan**.
>
> **(16 Oktober 2026) SATU DARI TIGA ❌ DI ATAS KINI ✅.** TC-FE-031 ditutup
> bersama [BUG-005](BUG_REPORTS.md#bug-005), dan dengan itu tak ada lagi temuan
> Critical yang terbuka. Blok bertanggal di atas sengaja TIDAK ditulis ulang —
> ia rekaman 3 September 2026 — jadi kalimat "satu-satunya temuan Critical yang
> terbuka" di dalamnya harus dibaca sebagai keadaan hari itu, bukan hari ini.
> Yang masih ❌ tinggal TC-FE-033 ([BUG-007](BUG_REPORTS.md#bug-007), Low) dan
> TC-FE-034 ([BUG-008](BUG_REPORTS.md#bug-008), Medium).
>
> Dua belas kasus terakhir (TC-FE-005/006/007/010/012/028/032/042/043/045/046/047)
> ditutup pada 3 September 2026. **Tiga di antaranya premisnya ternyata usang**, dan
> yang diuji adalah perilaku yang benar-benar ada, bukan yang diandaikan dokumen:
> TC-FE-006 menuntut toast padahal aplikasi ini tak punya sistem toast sama sekali,
> TC-FE-012 menuntut tooltip padahal grafiknya SVG tulis tangan dengan nilai yang
> selalu terlihat, dan satu temuan TC-FE-007 (guliran mendatar 809 px) **dibatalkan
> sendiri** setelah terbukti berasal dari gambar `w-auto` yang diukur sebelum dimuat
> — lihat §Y.5.
>
> Angka di atas **dihitung ulang dari baris tabelnya sendiri** (40+5+3 = 48), bukan
> ditambahkan ke total lama.
>
> Empat charter P1 terakhir (C-05 form akun admin, C-06 daftar & sinkronisasi OPD,
> C-07 profil responden, C-08 ketahanan saat backend bermasalah) dijalankan pada
> 3 September 2026, dan C-13 dituntaskan pada hari yang sama setelah akun responden
> tanpa persetujuan tersedia. **Seluruh charter eksploratori yang tidak terhalang
> pihak lain kini sudah dijalankan;** yang tersisa hanya C-09, menunggu kredensial
> SSO dari Diskominfo.
> Modul A–X bertipe `Integ`/`Unit` adalah ranah backend dan belum dieksekusi dari sisi ini.
>
> ⚠️ **Angka "belum dikerjakan" sempat melonjak 8 → 20, dan itu kabar baik.** Empat belas kasus
> uji (TC-FE-034 s/d 047) ditambahkan setelah audit 2 September memeriksa silang seluruh
> 37 rute, 13 folder fitur, dan 31 komponen UI bersama terhadap dokumen ini. Layar-layar
> itu **tidak pernah gagal** — mereka tak pernah punya baris sama sekali, sehingga tak
> pernah muncul sebagai pekerjaan tertunda. Yang paling menonjol: Modul H (Pengaduan)
> memiliki 29 kasus uji yang **seluruhnya** `Integ`/`Unit`, padahal `features/complaints`
> adalah fitur frontend terbesar di proyek ini (28 komponen, 0 berkas uji); dan
> `/admin-opd/analytics` tak pernah disebut satu kali pun di dokumen pengujian mana pun.
>
> Suite otomatis: **80 uji Jest di 14 berkas, seluruhnya lulus** (diverifikasi 2 September 2026,
> dua kali jalan). Naik dari 46 karena `QuestionCard.test.jsx` ditulis ulang dari 1 menjadi
> 12 kasus, dan naik lagi dari 57 karena antarmuka pengaduan akhirnya beruji (23 kasus di
> tiga berkas). Ditambah **6 uji E2E Playwright** di peramban sungguhan, juga lulus — dijalankan
> terpisah dengan `pnpm test:e2e`, lihat Y.2. Jest sengaja dibuat mengabaikan `e2e/`
> (`testPathIgnorePatterns`): spec Playwright juga berakhiran `.spec.js` dan tanpa pengecualian
> itu Jest ikut memungutnya lalu gagal.
>
> ✅ **Peringatan `superuser` versi 1.2 DICABUT.** Versi lalu menandai belasan kasus uji
> sebagai "belum direvisi karena memakai peran `superuser` yang sudah dihapus". Peran itu
> **dikembalikan** pada 26 Agustus 2026 (`e1eb8b1 feat: peran superuser terpisah + pemilih
> peran saat login + log aktivitas khusus superuser`), sehingga enum `Role` kini berisi
> empat peran lagi: `kabupaten | opd | responden | superuser`.
>
> Artinya kasus-kasus uji itu **kembali sahih tanpa perlu diubah sama sekali** — Modul C
> (TC-USR-005, 007, 008, 012), Modul D (TC-SVY-003), Modul X (kolom "Superuser" pada
> TC-RBAC-001 s/d TC-RBAC-014 dan TC-ISO-009), serta TEST_PLAN.md §4.5. Pekerjaan
> pembersihan yang tertunda sejak 11 Agustus dengan sendirinya gugur.
>
> Pelajarannya layak dicatat: menunda revisi dokumen atas dasar keputusan desain yang masih
> bergerak ternyata lebih murah daripada mengerjakannya dua kali.

> ❌ **PENCABUTAN DI ATAS SENDIRI SUDAH TIDAK BERLAKU, 13 Oktober 2026.** Peran
> `superuser` dilebur untuk terakhir kali pada 15 September 2026 — sebelas hari
> sesudah kotak di atas ditulis — dan nilai enumnya dibuang. Kasus-kasus uji yang
> dinyatakan "kembali sahih tanpa perlu diubah" karena itu **kembali tidak
> sahih**, dan kali ini tidak akan berbalik lagi: tak ada migrasi yang
> mengembalikannya.
>
> Pelajaran yang lebih pahit daripada yang tercatat di atas, dan pantas berdiri
> di sebelahnya: pelajaran itu berbunyi "menunda revisi lebih murah daripada
> mengerjakannya dua kali", lalu penundaan yang sama membuat dokumen ini salah
> selama **28 hari** — dari 15 September sampai 13 Oktober — pada bagian yang
> dipakai orang sebagai daftar kerja. Yang membuatnya murah bukan penundaannya,
> melainkan keberuntungan bahwa keputusannya berbalik sekali.
>
> Kasus uji yang terdampak kini ditandai satu per satu di tempatnya masing
> masing, bukan lewat satu kotak terpusat seperti dua kali sebelumnya — justru
> supaya tak ada lagi kotak yang perlu dicabut kotak berikutnya.
