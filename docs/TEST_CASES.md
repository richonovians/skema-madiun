# Matriks Skenario Uji (Test Cases)

## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

|                        |                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Dokumen Acuan**      | PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md · ERD.png · Routes-List-API-dan-Frontend.md |
| **Dokumen Pendamping** | TEST_PLAN.md                                                                           |
| **Versi**              | 1.3                                                                                    |
| **Tanggal**            | 2 September 2026 (penyesuaian setelah 81 commit; v1.2 — 11 Agu; v1.1 — 10 Agu; v1.0 — 29 Jul 2026) |

**Konvensi:**

- **ID:** `TC-[MODUL]-[NOMOR]`
- **Prioritas:** P0 (Kritis), P1 (Tinggi), P2 (Sedang), P3 (Rendah)
- **Tipe:** Unit, Integration (Integ), E2E, Manual
- **Status:** ⬜ Belum dikerjakan, 🟡 Dalam pengerjaan, ✅ Lulus, ❌ Gagal, ⏭️ Dilewati

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
10. [Modul X — RBAC & Isolasi Data OPD (Cross-Cutting)](#modul-x--rbac--isolasi-data-opd-cross-cutting)

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
> `Role` kini hanya `kabupaten | opd | responden`; `kabupaten` merangkap superuser dan
> mem-bypass `RolesGuard`.

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
| TC-AUTH-055 | **Matriks proteksi route `proxy.js`**                     | Akses tiap route pada tiap kondisi peran — lihat A.5.1 | Sesuai tabel A.5.1                                                                                                                                                                               |    P0     |    E2E    |   ⬜   |
| TC-AUTH-056 | **Token tersimpan di localStorage & cookie non-HttpOnly** | DevTools → Application → Storage setelah login         | Token terbaca oleh JavaScript → rentan XSS. Cookie non-HttpOnly **disengaja** (dibaca `proxy.js` di Edge Runtime yang tak bisa akses localStorage). Konfirmasi mitigasi ke tim — lihat TC-FE-015 |    P0     |  Manual   |   ⬜   |

#### A.5.1 Matriks Proteksi Route (`proxy.js`)

> `✅` = halaman tampil · `↪️` = dialihkan ke route tersebut

| Route                                               | Tanpa token |   `responden`   |           `opd`           |        `kabupaten`        |
| --------------------------------------------------- | :---------: | :-------------: | :-----------------------: | :-----------------------: |
| `/` (beranda publik)                                |     ✅      |       ✅        | ↪️ `/admin-opd/dashboard` | ↪️ `/admin-kab/dashboard` |
| `/dashboard`, `/complaints`, `/surveys`, `/profile` |   ↪️ `/`    |       ✅        | ↪️ `/admin-opd/dashboard` | ↪️ `/admin-kab/dashboard` |
| `/admin-kab/**`                                     |   ↪️ `/`    | ↪️ `/dashboard` | ↪️ `/admin-opd/dashboard` |            ✅             |
| `/admin-opd/dashboard`                              |   ↪️ `/`    | ↪️ `/dashboard` |            ✅             | ↪️ `/admin-kab/dashboard` |
| `/admin-opd/**` (selain `dashboard`)                |   ↪️ `/`    | ↪️ `/dashboard` |            ✅             |            ✅             |

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

| ID         | Skenario                                            | Langkah                                                           | Data Input                                                                 | Expected Result                                                               | Prioritas | Tipe  | Status |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | :-------: | :---: | :----: |
| TC-OPD-001 | Daftar OPD (Admin Kabupaten)                        | GET `/opd`                                                        | Query: `page=1, limit=10`                                                  | 200 OK; array OPD dengan pagination                                           |    P1     | Integ |   ⬜   |
| TC-OPD-002 | Daftar OPD dengan filter pencarian nama             | GET `/opd?search=kesehatan`                                       | `search=kesehatan`                                                         | 200 OK; hanya OPD yang namanya mengandung "kesehatan"                         |    P2     | Integ |   ⬜   |
| TC-OPD-003 | Daftar OPD filter status aktif                      | GET `/opd?isActive=true`                                          | `isActive=true`                                                            | 200 OK; hanya OPD yang `is_active = true`                                     |    P2     | Integ |   ⬜   |
| TC-OPD-004 | Tambah OPD manual (Admin Kabupaten)                 | POST `/opd`                                                       | `{ nama: "Dinas Pendidikan", kode: "DISDIK", jenisLayanan: "Pendidikan" }` | 201 Created; OPD tersimpan; `is_active = true`                                |    P1     | Integ |   ⬜   |
| TC-OPD-005 | Tambah OPD dengan kode duplikat                     | POST `/opd`                                                       | Kode yang sudah ada                                                        | 409 Conflict; "Kode OPD sudah digunakan"                                      |    P1     | Integ |   ⬜   |
| TC-OPD-006 | Detail OPD (Admin Kabupaten melihat semua)          | GET `/opd/:id` sebagai kabupaten                                  | ID OPD valid                                                               | 200 OK; detail OPD                                                            |    P1     | Integ |   ⬜   |
| TC-OPD-007 | Detail OPD — Admin OPD hanya melihat OPD sendiri    | GET `/opd/:id` sebagai OPD Dinkes                                 | ID OPD Disdukcapil (bukan miliknya)                                        | 403 Forbidden                                                                 |    P0     | Integ |   ⬜   |
| TC-OPD-008 | Ubah data OPD (Admin Kabupaten)                     | PATCH `/opd/:id`                                                  | `{ nama: "Dinas Kesehatan Baru" }`                                         | 200 OK; data ter-update                                                       |    P1     | Integ |   ⬜   |
| TC-OPD-009 | Nonaktifkan OPD                                     | PATCH `/opd/:id/status`                                           | `{ isActive: false }`                                                      | 200 OK; OPD `is_active = false`; survei/pengaduan tetap ada (soft deactivate) |    P1     | Integ |   ⬜   |
| TC-OPD-010 | Sinkronisasi OPD dari Helpdesk                      | POST `/opd/sync`                                                  | — (fetch dari sumber eksternal)                                            | 200 OK; report: `created`, `updated`, `deactivated`, `skipped`                |    P2     | Integ |   ⬜   |
| TC-OPD-011 | Sinkronisasi — OPD hilang dari source dinonaktifkan | POST `/opd/sync` dengan source yang tidak mengandung OPD tertentu | —                                                                          | OPD yang hilang: `is_active = false`; TIDAK dihapus (jaga FK)                 |    P1     | Integ |   ⬜   |
| TC-OPD-012 | Responden tidak bisa akses daftar OPD               | GET `/opd` sebagai responden                                      | Token responden                                                            | 403 Forbidden                                                                 |    P0     | Integ |   ⬜   |

---

## Modul C — Manajemen Akun Admin

Referensi: PRD §6, §8.1 (FR-AUTH-06, FR-AUTH-07), Routes §A.3

| ID         | Skenario                                       | Langkah                                     | Data Input                               | Expected Result                                                                      | Prioritas | Tipe  | Status |
| ---------- | ---------------------------------------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ | :-------: | :---: | :----: |
| TC-USR-001 | Daftar akun admin (Admin Kabupaten)            | GET `/users`                                | `page=1, limit=10`                       | 200 OK; daftar user non-deleted                                                      |    P1     | Integ |   ⬜   |
| TC-USR-002 | Daftar akun admin filter per role              | GET `/users?role=opd`                       | `role=opd`                               | 200 OK; hanya user ber-role OPD                                                      |    P2     | Integ |   ⬜   |
| TC-USR-003 | Buat akun Admin OPD (oleh Admin Kabupaten)     | POST `/users` sebagai kabupaten             | `{ nama, email, role: "opd", opdId: 1 }` | 201 Created; user tersimpan; terikat ke OPD                                          |    P1     | Integ |   ⬜   |
| TC-USR-004 | Buat akun Admin OPD tanpa `opdId` → ditolak    | POST `/users`                               | `{ role: "opd" }` tanpa `opdId`          | 400 Bad Request; "opdId wajib diisi untuk role opd"                                  |    P1     | Integ |   ⬜   |
| TC-USR-005 | Kabupaten TIDAK boleh assign role `superuser`  | POST `/users` sebagai kabupaten             | `{ role: "superuser" }`                  | 403 Forbidden; "Hanya superuser yang boleh menetapkan role kabupaten atau superuser" |    P0     | Integ |   ⬜   |
| TC-USR-006 | Kabupaten TIDAK boleh assign role `kabupaten`  | POST `/users` sebagai kabupaten             | `{ role: "kabupaten" }`                  | 403 Forbidden                                                                        |    P0     | Integ |   ⬜   |
| TC-USR-007 | Superuser BOLEH assign role `kabupaten`        | POST `/users` sebagai superuser             | `{ role: "kabupaten", nama, email }`     | 201 Created                                                                          |    P0     | Integ |   ⬜   |
| TC-USR-008 | Superuser BOLEH assign role `superuser`        | POST `/users` sebagai superuser             | `{ role: "superuser", nama, email }`     | 201 Created                                                                          |    P0     | Integ |   ⬜   |
| TC-USR-009 | Buat akun dengan email duplikat                | POST `/users`                               | Email yang sudah ada                     | 409 Conflict; "Email atau ssoSubject sudah digunakan"                                |    P1     | Integ |   ⬜   |
| TC-USR-010 | Ubah akun admin (nama, OPD tautan)             | PATCH `/users/:id`                          | `{ nama: "Budi Updated", opdId: 2 }`     | 200 OK; data ter-update                                                              |    P1     | Integ |   ⬜   |
| TC-USR-011 | Nonaktifkan akun Admin OPD                     | PATCH `/users/:id/status`                   | `{ isActive: false }`                    | 200 OK; `is_active = false`                                                          |    P1     | Integ |   ⬜   |
| TC-USR-012 | Kabupaten tidak boleh mengelola akun superuser | PATCH `/users/:id/status` sebagai kabupaten | Target: user ber-role superuser          | 403 Forbidden; "Hanya superuser yang boleh mengelola akun kabupaten atau superuser"  |    P0     | Integ |   ⬜   |
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
| TC-SVY-003 | Buat survei — superuser wajib kirim `opdId`                | POST `/surveys` sebagai superuser tanpa `opdId` | Token superuser                                                            | 400 Bad Request; "opdId wajib diisi"                        |    P1     | Integ |   ⬜   |
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

## Modul X — RBAC & Isolasi Data OPD (Cross-Cutting)

Referensi: PRD §6 (Tabel Hak Akses), PRD §10 (NFR Keamanan)

### X.1 Matriks Akses per Peran — Endpoint Kunci

> Setiap baris menguji bahwa peran tertentu **mendapat response yang benar** pada endpoint tersebut.

| ID          | Endpoint                       | Superuser | Kabupaten |      Admin OPD       | Responden | Tipe  | Status |
| ----------- | ------------------------------ | :-------: | :-------: | :------------------: | :-------: | :---: | :----: |
| TC-RBAC-001 | `GET /opd`                     |  ✅ 200   |  ✅ 200   |        ❌ 403        |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-002 | `POST /opd`                    |  ✅ 201   |  ✅ 201   |        ❌ 403        |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-003 | `GET /users`                   |  ✅ 200   |  ✅ 200   |        ❌ 403        |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-004 | `POST /users` (role=opd)       |  ✅ 201   |  ✅ 201   |        ❌ 403        |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-005 | `POST /users` (role=kabupaten) |  ✅ 201   |  ❌ 403   |        ❌ 403        |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-006 | `POST /surveys`                |  ✅ 201   |  ❌ 403   |        ✅ 201        |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-007 | `GET /surveys`                 |  ✅ 200   |  ✅ 200   | ✅ 200 (OPD sendiri) |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-008 | `GET /surveys/active`          |  ✅ 200   |  ❌ 403   |        ❌ 403        |  ✅ 200   | Integ |   ⬜   |
| TC-RBAC-009 | `POST /surveys/:id/responses`  |     —     |  ❌ 403   |        ❌ 403        |  ✅ 201   | Integ |   ⬜   |
| TC-RBAC-010 | `GET /surveys/:id/results`     |  ✅ 200   |  ✅ 200   | ✅ 200 (OPD sendiri) |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-011 | `POST /complaints`             |     —     |  ❌ 403   |        ❌ 403        |  ✅ 201   | Integ |   ⬜   |
| TC-RBAC-012 | `PATCH /complaints/:id/status` |  ✅ 200   |  ❌ 403   | ✅ 200 (OPD sendiri) |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-013 | `GET /audit-logs`              |  ✅ 200   |  ✅ 200   |        ❌ 403        |  ❌ 403   | Integ |   ⬜   |
| TC-RBAC-014 | `GET /dashboard/ikm`           |  ✅ 200   |  ✅ 200   |        ❌ 403        |  ❌ 403   | Integ |   ⬜   |

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
| TC-ISO-009 | **Superuser bisa akses semua data cross-OPD**                       | GET survei/pertanyaan/respons/hasil dari OPD mana pun sebagai superuser | —                                                           |               200 OK; tidak ada batasan OPD                |  P0   | Integ  | ⬜  |
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
| TC-FE-002 | **Proteksi Halaman (Routing)**                          | Buka `/dashboard` tanpa cookie `token` → lalu ulangi tiap route pada matriks A.5.1                                         | Dialihkan ke beranda `/` (**bukan** portal SSO eksternal — belum ada). Detail lengkap per peran: lihat **TC-AUTH-055**                                                                                                                                                                                                                                                                                                    |    P0     |    E2E    |   ⬜   |
| TC-FE-003 | **Validasi Pengisian SKM (Nilai 1-4)**                  | Di form survei, coba masukkan nilai 5 atau -1 (jika berupa radio button, pastikan tidak bisa edit DOM untuk kirim nilai 5) | Input ditolak oleh antarmuka (menampilkan pesan error seketika). **Tercakup sebagian:** otomatisasi memastikan tepat 4 radio bernilai 1–4 dirender, sehingga nilai lain tak bisa dipilih lewat UI. Manipulasi DOM belum diuji — pertahanan sesungguhnya ada di TC-FILL-011 s/d TC-FILL-015 (backend). **Diperluas 2 Sep 2026:** kartu kini bercabang menurut tipe pertanyaan, jadi cakupannya bertambah — label skala tersuai tetap mengirim SKOR 1–4 (bukan id opsi), dan tipe tak dikenal memunculkan peringatan, bukan layar kosong                                                                                                                      |    P0     | Component |   🟡   |
| TC-FE-004 | **Validasi Field Wajib Unsur IKM**                      | Pada form pengisian survei, kosongi satu unsur IKM lalu klik Submit                                                        | Tombol Submit di-disable atau muncul peringatan "Pertanyaan wajib diisi", request API dicegah. **Lulus manual (sesi C-01, 11 Agu 2026):** tombol "Kirim Survei" nonaktif selama responden belum menjawab, jadi jalur cabang "tombol di-disable" yang terjadi. **Otomatisasi belum ada.** Test lama yang berlabel TC-FE-004 ternyata menguji formulir pemilihan OPD, bukan pengisian unsur IKM — dipindah ke **TC-FE-016** |    P0     | Component |   ✅   |
| TC-FE-005 | **Navigasi Berdasarkan Role**                           | Akses aplikasi dengan token SSO Responden                                                                                  | Menu sidebar "Manajemen OPD", "User", dan "Survei Admin" disembunyikan                                                                                                                                                                                                                                                                                                                                                    |    P1     | Component |   ⬜   |
| TC-FE-006 | **Notifikasi Toast**                                    | Lakukan aksi sukses (misal isi profil)                                                                                     | Muncul notifikasi toast hijau (Success) di layar                                                                                                                                                                                                                                                                                                                                                                          |    P2     | Component |   ⬜   |
| TC-FE-007 | **Tampilan Mobile Responsif**                           | Buka halaman isi survei via browser HP                                                                                     | Tabel/daftar pertanyaan tidak terpotong (scrollable atau stacking vertical)                                                                                                                                                                                                                                                                                                                                               |    P2     |  Manual   |   ⬜   |
| TC-FE-008 | **Loading State (Anti Double Submit)**                  | Klik Submit pengaduan/survei                                                                                               | Tombol berubah menjadi loading spinner, form disable, klik ganda beruntun dicegah. **Tercakup sebagian:** baru sisi survei (`SurveyNavigation`); form pengaduan belum diotomatisasi                                                                                                                                                                                                                                       |    P1     | Component |   🟡   |
| TC-FE-009 | **E2E: Isi Survei dari Login sampai Selesai**           | Skrip Playwright: login lewat `POST /auth/dev-login` (tanpa sandi), isi survei SKM                                         | Dialihkan ke halaman "Terima Kasih", tidak ada error konsol. Catatan: injeksi mock token tidak diperlukan — dev-login sudah cukup                                                                                                                                                                                                                                                                                         |    P0     |    E2E    |   ⬜   |
| TC-FE-010 | **E2E: Pengajuan Pengaduan**                            | Skrip E2E: login sebagai responden, isi form pengaduan (unggah gambar dummy)                                               | Tiket baru muncul di daftar dengan nomor tiket dari API (format `PGD` + tanggal + 4 karakter)                                                                                                                                                                                                                                                                                                                             |    P0     |    E2E    |   ⬜   |
| TC-FE-011 | **Handling Jaringan (Timeout/Error 500)**               | Buat endpoint membalas 500, lalu buka halaman yang bergantung padanya dan tekan "Coba Lagi"                                | Frontend menampilkan komponen error dengan anggun (bukan layar putih) dan tombol Coba Lagi benar-benar memicu pengambilan ulang                                                                                                                                                                                                                                                                                           |    P1     | Component |   ✅   |
| TC-FE-012 | **UI Interaktif (Chart Dashboard IKM)**                 | Buka Dashboard IKM, arahkan kursor ke grafik batang/pie                                                                    | Tooltip berisi detail nilai NRR dan nama OPD muncul dan posisinya tidak terpotong layar                                                                                                                                                                                                                                                                                                                                   |    P1     | Component |   ⬜   |
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
| TC-FE-028 | **Identitas Navbar Admin dari API**                     | Render `AdminNavbar` & `AdminKabNavbar` dengan MSW membalas `GET /auth/me` bernama "Budi Santoso"                           | Nama itu muncul, dan tak satu pun nilai karangan lama ("Dr. Handoko", "Kepala Dinas", inisial "AK") ada di dokumen. **Mengunci BUG-001 yang sudah diperbaiki** (`efb7b9f`, `4e3e0c9`) — tanpa ini perbaikannya bisa diam-diam kembali                                                                                                                                                                                       |    P1     | Component |   ⬜   |
| TC-FE-029 | **Pertanyaan Tipe Uraian**                              | Render `QuestionCard` untuk pertanyaan bertipe `text`                                                                      | Merender textarea (bukan skala), menyatakan jawabannya tidak wajib, membatasi 1000 karakter dan menghitung yang sudah diketik, serta meneruskan teks ke store                                                                                                                                                                                                                                                             |    P1     | Component |   ✅   |
| TC-FE-030 | **Pertanyaan Tipe Pilihan Ganda**                       | Render `QuestionCard` untuk pertanyaan bertipe `multiple_choice`, termasuk keadaan opsi kosong                              | Satu opsi per pilihan berlabel huruf A/B/C; nilai yang dikirim adalah **ID opsi**, bukan nomor urut (inilah yang dulu ditolak backend); bila opsinya kosong tampil peringatan jujur, bukan skala yang salah                                                                                                                                                                                                                |    P1     | Component |   ✅   |
| TC-FE-031 | **Salinan Survei Mempertahankan Opsi Jawaban**          | Duplikat survei berisi pertanyaan Pilihan Ganda dan Skala berlabel tersuai, lalu buka salinannya sebagai responden          | Opsi pilihan ganda tersalin lengkap dan label skala tersuai tidak berganti ke label baku. **Temuan: gagal — [BUG-005](BUG_REPORTS.md#bug-005)** (High): `duplicate()` tidak menyalin relasi opsi, dan jalur itu melewati `CreateQuestionDto` yang biasanya mewajibkan minimal 2 opsi                                                                                                                                        |    P0     |   Integ   |   ❌   |

### Y.1 Peta Otomatisasi (per 2 September 2026)

| Berkas uji                                                              | Jumlah test | Kasus uji                                   |
| ----------------------------------------------------------------------- | :---------: | ------------------------------------------- |
| `components/ui/__tests__/Button.test.jsx`                               |      4      | TC-FE-027                                   |
| `components/ui/__tests__/ErrorState.test.jsx`                           |      3      | TC-FE-011                                   |
| `components/ui/__tests__/NotificationDropdown.test.jsx`                 |     10      | TC-FE-017, TC-FE-018, **TC-FE-019**         |
| `features/statistics/components/__tests__/StatisticsDashboard.test.jsx` |      7      | TC-FE-020, TC-FE-021                        |
| `features/surveys/components/__tests__/QuestionCard.test.jsx`           |   **12**    | TC-FE-003, **TC-FE-029**, **TC-FE-030**     |
| `features/surveys/components/__tests__/SurveyForm.test.jsx`             |      4      | TC-FE-016                                   |
| `features/surveys/components/__tests__/SurveyNavigation.test.jsx`       |      2      | TC-FE-008 (sebagian)                        |
| `features/surveys/builder/.../SurveyBuilder.integration.test.jsx`       |      3      | TC-FE-025                                   |
| `features/surveys/components/.../SurveyManagement.integration.test.jsx` |      3      | TC-FE-026                                   |
| `app/admin-kab/opd/__tests__/page.test.jsx`                             |      2      | TC-FE-013, TC-FE-014 (sebagian)             |
| `app/admin-kab/audit-logs/__tests__/page.test.jsx`                      |      7      | TC-FE-022, TC-FE-023, TC-FE-024             |
| **Total**                                                               |   **57**    |                                             |

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

---

## Ringkasan Statistik Test Cases

| Modul                    | Jumlah TC |   P0   |   P1   |   P2   |   P3   |
| ------------------------ | :-------: | :----: | :----: | :----: | :----: |
| A — Auth & Akun          |    38     |   13   |   14   |   9    |   2    |
| B — Manajemen OPD        |    12     |   2    |   5    |   4    |   1    |
| C — Manajemen Akun Admin |    14     |   5    |   5    |   2    |   2    |
| D — Survei SKM           |    19     |   3    |   12   |   4    |   0    |
| E — Pertanyaan Survei    |    13     |   3    |   8    |   2    |   0    |
| F — Pengisian Survei     |    22     |   9    |   11   |   1    |   1    |
| G — IKM & Hasil          |    20     |   13   |   5    |   2    |   0    |
| H — Pengaduan            |    27     |   10   |   12   |   3    |   2    |
| I — Audit Log            |     7     |   0    |   0    |   7    |   0    |
| X — RBAC & Isolasi       |    25     |   15   |   5    |   3    |   2    |
| Y — Frontend & E2E       |    30     |   8    |   15   |   6    |   1    |
| **TOTAL**                |  **227**  | **81** | **92** | **43** | **11** |

> **80 test cases (P0)** harus lulus 100% sebelum rilis. Fokus utama: isolasi data OPD (11 TC API), keamanan sisi klien & nilai IKM 1–4, E2E alur kritis responden, nomor tiket unik, dan RBAC.
>
> **Status eksekusi per 2 September 2026** — baru Modul Y yang dieksekusi (frontend,
> lingkup tester). Dari 30 kasus uji Modul Y: **16 ✅ lulus**, **4 🟡 tercakup sebagian**,
> **1 ❌ gagal** (TC-FE-031, salinan survei kehilangan opsi jawaban — [BUG-005](BUG_REPORTS.md#bug-005)),
> **9 ⬜ belum dikerjakan** (3 di antaranya E2E, menunggu `apps/web/e2e/` dibuat).
> Modul A–X bertipe `Integ`/`Unit` adalah ranah backend dan belum dieksekusi dari sisi ini.
>
> Suite otomatis: **57 uji di 11 berkas, seluruhnya lulus** (diverifikasi 2 September 2026,
> dua kali jalan). Naik dari 46 karena `QuestionCard.test.jsx` ditulis ulang dari 1 menjadi
> 12 kasus.
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
