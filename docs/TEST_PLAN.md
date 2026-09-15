# Rencana Pengujian (Test Plan)

## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

|                   |                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Dokumen Acuan** | PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md · ERD.png · Routes-List-API-dan-Frontend.md |
| **Versi Dokumen** | 1.4                                                                                    |
| **Tanggal**       | 15 September 2026 (v1.8 — §5.2 perkakas: E2E 17 → 19 pengujian di 7 berkas; v1.7 — §5.1 kriteria seed: `pnpm db:seed` dari akar repo GAGAL (skripnya hanya di apps/api) + peringatan bahwa seed memangkas peran superuser dev; v1.6 — §5.2 perkakas: E2E 13 → 17 pengujian di 6 berkas sesudah lima pagar regresi ditambahkan; v1.5 — §5.2 perkakas: E2E 11 → 13 pengujian di 5 berkas, pembersih data uji dapat bendera `--yatim`; v1.4 — seed dapat dijalankan lagi (CAT-014 diperbaiki), §3.3 & §5.1 disesuaikan; v1.3 — revisi §1.1, §3.2, §3.3, §5.1, §5.2, §9 — **model peran jamak** (`roles` + `actingRole`), seed yang tak lagi dapat dijalankan, klaim pembersihan data uji yang keliru, jumlah endpoint 49 → 67; v1.2 — 2 Sep: SSO Helpdesk, peran superuser kembali, origin `skema.local`; v1.1 — 10 Agu; v1.0 — 29 Juli 2026) |
| **Stack**         | Next.js (Frontend) · Nest.js (Backend) · PostgreSQL (Database) · Prisma (ORM) · Docker |
| **Cakupan Uji**   | Backend REST API · Frontend UI · Integrasi End-to-End                                  |

---

## 1. Pendahuluan

### 1.1 Tujuan

Dokumen ini mendefinisikan strategi, cakupan, dan rencana pelaksanaan pengujian untuk **Sistem SKM & Pengaduan Masyarakat**. Tujuan utama pengujian adalah memastikan bahwa:

1. Seluruh kebutuhan fungsional (FR) dalam PRD terimplementasi dan berfungsi sesuai spesifikasi.
2. Aturan bisnis kritis — terutama **isolasi data OPD**, **batasan nilai IKM skala 1–4**, dan **pembuatan nomor tiket unik pengaduan** — berjalan benar.
3. Hak akses berbasis peran (RBAC) untuk **empat peran** (Superuser, Admin Kabupaten, Admin OPD, Responden) ditegakkan secara konsisten. _Direvisi 2 Sep 2026: `superuser` sempat digabung ke `kabupaten` pada 5 Agustus, lalu dipisahkan kembali pada 26 Agustus (`e1eb8b1`)._

> **Direvisi 15 September 2026 — satu akun kini dapat memiliki beberapa peran.**
> `User.role` (tunggal) **dihapus** dan diganti `roles Role[]`. Yang menentukan
> hak akses bukan lagi kepemilikan peran, melainkan **peran yang sedang dipakai
> pada sesi** — klaim `act` di dalam token, dikembalikan `/auth/me` sebagai
> `actingRole`. Konsekuensinya bagi pengujian, dan semuanya sudah terbukti
> mematahkan pengujian yang ditulis atas model lama:
>
> - `GET /auth/me` **tidak lagi** mengembalikan `role`; pemakainya harus membaca
>   `roles` (kepemilikan) dan `actingRole` (yang dipakai). Alias `role` sengaja
>   tidak dipertahankan.
> - `POST /auth/dev-login` pada akun ber-peran lebih dari satu pulang dengan
>   `actingRole: null`. Seluruh endpoint terlindung menjawab **401 "Peran yang
>   ingin dipakai belum dipilih"** sampai `POST /auth/acting-role { role }`
>   menerbitkan token berperan. Skrip pengujian yang langsung memakai token
>   `dev-login` akan gagal dengan pesan yang terbaca seolah akunnya tak berhak.
> - Setiap peran kini terkurung pada areanya sendiri (`ROLE_PREFIXES` di
>   `proxy.js`), termasuk `kabupaten` yang sebelumnya boleh menengok
>   `/admin-opd/*`. Yang membutuhkan area lain **berganti peran**, bukan
>   menembus batasnya.
4. Perhitungan IKM sesuai metodologi PermenPANRB No. 14 Tahun 2017.
5. Kebutuhan non-fungsional (keamanan, performa, privasi data) terpenuhi.

### 1.2 Ruang Lingkup

| Dalam Cakupan                                       | Di Luar Cakupan                             |
| --------------------------------------------------- | ------------------------------------------- |
| Modul Autentikasi & Manajemen Akun                  | Integrasi SSO dengan sistem pemerintah lain |
| Modul Manajemen OPD                                 | Aplikasi mobile native                      |
| Modul Survei SKM (CRUD, template, pengisian, IKM)   | Notifikasi WhatsApp/SMS berbayar            |
| Modul Pengaduan Masyarakat (tiket, status, balasan) | Multi-bahasa                                |
| Dashboard Hasil & Agregat IKM                       | Analitik prediktif / ML                     |
| Modul Audit Log                                     | Load testing skala produksi                 |
| Ekspor Laporan (PDF/Excel/CSV)                      | Penetration testing profesional             |
| RBAC & Isolasi Data OPD                             |                                             |

### 1.3 Referensi Regulasi

- **PermenPANRB No. 14 Tahun 2017** — 9 unsur pelayanan, skala 1–4, metodologi IKM.
- **PermenPANRB No. 6 Tahun 2022** — Survei Kualitas Pelayanan (referensi lanjutan).
- **UU No. 27 Tahun 2022 (PDP)** — Perlindungan data pribadi responden.
- **UU No. 25 Tahun 2009** — Pelayanan Publik.

---

## 2. Strategi Pengujian

### 2.1 Level Pengujian

| Level                | Deskripsi                                                  | Tools                           | Tanggung Jawab     |
| -------------------- | ---------------------------------------------------------- | ------------------------------- | ------------------ |
| **Unit Test**        | Uji fungsi/metode terisolasi di service layer backend      | Jest, ts-jest                   | Developer Backend  |
| **Integration Test** | Uji endpoint API lengkap (controller → service → database) | Jest, Supertest, TestContainers | Developer Backend  |
| **Component Test**   | Uji komponen UI React secara terisolasi                    | Jest, React Testing Library     | Developer Frontend |
| **E2E Test**         | Uji alur pengguna lengkap via browser                      | Playwright / Cypress            | QA Engineer        |
| **Manual Test**      | Pengujian eksploratori, UI/UX, edge cases                  | Browser manual                  | QA Engineer        |

### 2.2 Pendekatan Pengujian

```
┌────────────────────────────────────────────────────────────┐
│                     E2E Tests (Alur Utama)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Integration Tests (API Endpoint)          │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │           Unit Tests (Service/Util)             │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

- **Unit tests** mencakup logika bisnis murni: perhitungan IKM, validasi jawaban, aturan transisi status, pengecekan privilege.
- **Integration tests** menguji setiap endpoint API dengan database nyata (PostgreSQL via Docker), termasuk RBAC dan isolasi data.
- **E2E tests** menguji alur pengguna end-to-end yang kritis (registrasi → isi survei → lihat hasil).

### 2.3 Prioritas Pengujian

| Prioritas       | Area                                                                              | Alasan                                                          |
| --------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **P0 — Kritis** | RBAC & isolasi data OPD, perhitungan IKM, anti-duplikat respons, nomor tiket unik | Kesalahan berdampak pada integritas data dan kepatuhan regulasi |
| **P1 — Tinggi** | CRUD Survei, pengisian survei, CRUD pengaduan, autentikasi                        | Fitur inti yang dipakai sehari-hari                             |
| **P2 — Sedang** | Dashboard agregat, ekspor laporan, manajemen OPD, audit log                       | Fitur pendukung penting                                         |
| **P3 — Rendah** | UI responsif, aksesibilitas, edge cases minor                                     | Penyempurnaan                                                   |

---

## 3. Lingkungan Pengujian

### 3.1 Lingkungan

| Lingkungan      | Tujuan                                     | Database                       | Konfigurasi                  |
| --------------- | ------------------------------------------ | ------------------------------ | ---------------------------- |
| **Local (Dev)** | Unit + integration test selama development | PostgreSQL via Docker Compose  | `.env` lokal                 |
| **CI/CD**       | Automated test pada setiap push/MR         | PostgreSQL container ephemeral | GitLab CI (`.gitlab-ci.yml`) |
| **Staging**     | E2E test + manual QA sebelum rilis         | PostgreSQL staging             | Mirror konfigurasi produksi  |

### 3.2 Data Uji

| Kategori          | Deskripsi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Seed Data**     | `apps/api/prisma/seed.ts` — idempoten, aman dijalankan berulang. **Diperiksa ulang 2 Sep 2026.** Isi: **4 akun** (lihat §3.3), **3 OPD** (`DINKES` Dinas Kesehatan · `DINDIK` Dinas Pendidikan dan Kebudayaan · `DUKCAPIL` Disdukcapil) yang kini ber-`externalId` **UUID asli dari Helpdesk**, bukan lagi HD-001…HD-003 karangan — diubah agar e2e tidak merusak data nyata (`c001590`). **2 survei** berisi template 9 unsur: "Survei Kepuasan Masyarakat Layanan Puskesmas" (`draft`, Dinkes, `2026-Q1`) dan "Survei Kepuasan Masyarakat Layanan Pendidikan Dasar" (`aktif`, Dindik, `2026-Q3`, sengaja **tanpa respons** agar alur pengisian bisa dicoba sendiri). **1 pengaduan** bernomor **`PGD20260811KT4E`** (warga → Disdukcapil, status `diterima`) — penanda `[SEED]` dan format `PGD-SEED-0001` sudah **tidak dipakai lagi** (`ecb8640`) |
| **Test Fixtures** | Helper pembuatan entitas secara programatik di `apps/api/test/helpers/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Cleanup**       | **Direvisi 15 Sep 2026 — pernyataan lama ("setiap suite membersihkan data setelah selesai, transactional rollback atau truncate") TIDAK BENAR untuk lapisan E2E.** Suite Playwright berjalan melawan backend & basis data sungguhan lewat HTTP; ia tak punya transaksi untuk digulung balik, dan aplikasinya sendiri tak menyediakan penghapusan (pengaduan tanpa endpoint `DELETE`; survei hanya terhapus saat `draft`). Tiap jalannya meninggalkan ± 1 pengaduan, 2 respons, dan beberapa notifikasi. Sebelas hari tanpa pembersihan menghasilkan **7.986 notifikasi yatim** di lonceng akun admin sungguhan. Pembersihan karena itu **eksplisit, bukan otomatis**: jalankan `node apps/web/e2e/support/bersihkan-data-uji.mjs` sesudah suite (`--dry` untuk melihat lebih dulu; `--yatim` untuk ikut menyapu notifikasi yang menaut survei yang sudah dimusnahkan — lihat BUG-014). Klaim lama tetap berlaku bagi integration test backend yang memakai basis data ephemeral. |

### 3.3 Akun Uji

> **Direvisi 2 September 2026.** Dua perubahan besar sejak revisi 10 Agustus:
>
> 1. **Peran `superuser` dikembalikan** (`e1eb8b1`, 26 Agu 2026) setelah sempat digabung ke
>    `kabupaten` pada 5 Agustus. Enum `Role` kini berisi empat peran lagi, dan seed
>    menyediakan akunnya sendiri. Revisi 10 Agustus yang menghapus akun Superuser dari
>    daftar ini **dibatalkan**.
> 2. **SSO Helpdesk sudah terpasang** (`d8d8ada`, 27 Agu 2026), jadi ada dua jalur masuk.
>
> **Cara login — jalur pengembangan (yang dipakai untuk pengujian):**
> `POST /api/v1/auth/dev-login` dengan body `{ identifier }` berisi **email atau
> `ssoSubject`** di bawah — **tidak ada password sama sekali**. Dijaga `NonProductionGuard`
> (membalas 404, bukan 403, di produksi) dan kini dibatasi laju per-IP.
>
> **Cara login — jalur sungguhan:** `GET /api/v1/auth/sso/login` mengalihkan ke Helpdesk,
> lalu kembali ke `/sso/callback`. Sesi dipegang cookie `session` **HttpOnly** — tidak ada
> token yang bisa dibaca JavaScript. Responden baru akan diminta **persetujuan PDP**
> (`POST /auth/consent`) sebelum bisa lanjut.

| Peran               | Email (`identifier`)            | `ssoSubject`           | Keterangan                                                                     |
| ------------------- | ------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| **Superuser**       | `superuser@example.go.id`       | `seed-superuser`       | **Baru sejak 26 Agu 2026.** Area terkurung tersendiri, manajemen user & log aktivitas khusus; dapat membuka dashboard OPD dengan memilih OPD-nya |
| **Admin Kabupaten** | `admin.kabupaten@example.go.id` | `seed-admin-kabupaten` | Mem-bypass seluruh `@Roles` lewat `RolesGuard`, berakses penuh lintas-OPD      |
| **Admin OPD**       | `admin.opd@example.go.id`       | `seed-admin-opd`       | Terikat ke OPD **Dinas Kesehatan** (`DINKES`)                                  |
| **Responden**       | `warga@example.go.id`           | `seed-responden`       | Sudah punya profil demografis (perempuan · 26-35 · S1 · Wiraswasta)            |

> ✅ **Seed dapat dijalankan lagi sejak 15 September 2026.** Ia sempat patah
> sepuluh hari — `seed.ts` menulis `role:` tunggal sesudah kolomnya diganti
> `roles Role[]` — dan sudah diperbaiki serta diverifikasi pada basis data yang
> dibuat dari nol ([CAT-014](BUG_REPORTS.md#cat-014)). Tabel di atas kembali
> menjadi titik awal yang dapat direproduksi.
>
> ⚠️ Jalankan seed pada basis data **bersih**, bukan di atas dev yang sudah
> menyimpang: `update: { roles: [Role.superuser] }` akan menimpa `roles` akun
> `superuser@example.go.id`, yang di `skm_db` kini ber-peran empat.
>
**Akun yang benar-benar ada di basis data dev — dibaca langsung 15 September 2026.**
Lima dari tujuh ber-peran lebih dari satu, jadi jalur "wajib memilih peran"
(§1.1) adalah jalur yang **biasa**, bukan kekecualian:

| `identifier` (email)            | `roles`                                    | `opdId` |
| ------------------------------- | ------------------------------------------ | ------: |
| `admin.kabupaten@example.go.id` | `kabupaten`                                |       — |
| `superuser@example.go.id`       | `superuser`, `kabupaten`, `opd`, `responden` |      16 |
| `admin.opd@example.go.id`       | `opd`, `responden`                         |       1 |
| `warga@example.go.id`           | `responden`                                |       — |
| `opd@gmail.com`                 | `opd`, `responden`                         |      28 |
| `warga@gmail.com`               | `responden`, `kabupaten`                   |       — |
| `budi@gmail.com`                | `opd`, `kabupaten`, `responden`            |      24 |

Hanya `admin.kabupaten@example.go.id` dan `warga@example.go.id` yang masuk
langsung tanpa memilih peran. Untuk sisanya: tekan tombol peran pada pemilih
yang muncul sesudah "Masuk", atau panggil
`POST /auth/acting-role { role }` bila masuk lewat API.

> **Alamat pengujian:** sejak reverse proxy satu origin dipasang (`83d4230`), aplikasi
> diakses lewat **`http://skema.local`** (port 80), bukan `localhost:3000`. Frontend dan
> backend berbagi origin yang sama, dan `NEXT_PUBLIC_API_URL` kini bernilai relatif
> `/api/v1`. Membuka `localhost:3000` langsung akan menghasilkan 404.

> ⚠️ **Dua keterbatasan seed yang perlu disiasati sebelum eksekusi:**
>
> 1. **Hanya ada satu akun Admin OPD** (Dinas Kesehatan). Pengujian arah "Dinkes ditolak
>    saat mengakses data OPD lain" (TC-ISO-001 s/d TC-ISO-007) tetap bisa dijalankan, karena
>    data milik OPD lain sudah tersedia di seed (survei aktif di Disdik, pengaduan di
>    Disdukcapil). Namun skenario yang menuntut **dua Admin OPD berbeda sekaligus** — mis.
>    membuktikan admin OPD B _bisa_ melihat data yang ditolak bagi admin OPD A — belum bisa.
> 2. **Admin OPD seed tidak memiliki survei yang siap dianalisis.** Survei Dinas Kesehatan
>    berstatus `draft` dan tanpa respons, sedangkan satu-satunya survei `aktif` justru milik
>    Dinas Pendidikan. Skenario "Admin OPD melihat respons / hasil IKM survei miliknya
>    sendiri" (TC-FILL-040, TC-IKM-030) memerlukan data tambahan lebih dulu.
>
> Untuk keduanya: minta tim backend menambahkannya ke seed, atau siapkan sendiri lewat
> `POST /users` dan `POST /surveys` sebagai Admin Kabupaten.

> ⚠️ **Database pengembangan bisa menyimpang dari `seed.ts`.** Tabel di atas
> mendokumentasikan apa yang _dihasilkan seed_ — sumber kanonik yang bisa direproduksi.
> Basis data lokal yang sudah lama dipakai umumnya sudah berbeda. Contoh nyata pada
> 10 Agustus 2026: akun yang ada justru `warga@gmail.com`, `opd@gmail.com`, dan
> `superuser@example.go.id` (sisa peran superuser lama yang kini ber-role `kabupaten`),
> sementara `admin.opd@example.go.id` dan `warga@example.go.id` tidak ada; jumlah OPD
> pun 54 hasil sinkronisasi Helpdesk, bukan 3.
>
> **Sebelum menjalankan test case yang bergantung pada data**, verifikasi dulu isi basis
> data yang kamu pakai (mis. `GET /users` sebagai Admin Kabupaten), atau reset dan jalankan
> ulang seed agar sesuai tabel di atas.

---

## 4. Cakupan Pengujian per Modul

### 4.1 Modul Autentikasi & Manajemen Akun

> **Direvisi 10 Agustus 2026.** Sistem ini **tidak memiliki autentikasi lokal**: tidak ada
> registrasi mandiri, verifikasi OTP, maupun reset/ubah kata sandi. Identitas berasal dari
> **SSO Helpdesk** (menunggu spesifikasi OAuth2); sementara itu `POST /auth/dev-login`
> dipakai sebagai pengganti dan **mati di production**. Rincian: TEST_CASES.md Modul A.

| Kode FR    | Kebutuhan                                                    | Status implementasi         | Jenis Uji              |
| ---------- | ------------------------------------------------------------ | --------------------------- | ---------------------- |
| FR-AUTH-01 | Registrasi responden mandiri                                 | ❌ Dibatalkan — via SSO     | —                      |
| FR-AUTH-02 | Verifikasi akun (OTP/email)                                  | ❌ Dibatalkan — via SSO     | —                      |
| FR-AUTH-03 | Login & penerbitan sesi untuk semua peran                    | ✅ **SSO Helpdesk aktif** (`d8d8ada`, 27 Agu 2026) — cookie sesi HttpOnly, peran dari klaim, persetujuan PDP, audit masuk. `dev-login` tetap ada untuk pengembangan, dijaga `NonProductionGuard` | Integration, Component, E2E |
| FR-AUTH-04 | Reset & ubah kata sandi                                      | ❌ Dibatalkan — tanpa sandi | —                      |
| FR-AUTH-05 | Data profil dipakai ulang otomatis                           | ✅ Ada                      | Integration, E2E       |
| FR-AUTH-06 | Akun admin dibuat oleh Admin Kabupaten (bukan self-register) | ✅ Ada (`POST /users`)      | Integration            |
| FR-AUTH-07 | Nonaktifkan/aktifkan akun                                    | ✅ Ada — berlaku seketika   | Integration            |
| FR-AUTH-08 | Proteksi route sisi klien berbasis peran (`proxy.js`)        | ✅ Ada                      | E2E, Component         |

### 4.2 Modul Manajemen OPD

| Kode FR   | Kebutuhan                                       | Jenis Uji   |
| --------- | ----------------------------------------------- | ----------- |
| FR-OPD-01 | CRUD data OPD                                   | Integration |
| FR-OPD-02 | Tautkan Admin OPD ke OPD                        | Integration |
| FR-OPD-03 | Status keaktifan OPD (jumlah survei, pengaduan) | Integration |

### 4.3 Modul Survei SKM

| Kode FR    | Kebutuhan                                  | Jenis Uji         |
| ---------- | ------------------------------------------ | ----------------- |
| FR-SVY-01  | Buat paket survei (judul, periode, status) | Unit, Integration |
| FR-SVY-02  | Template 9 unsur baku (satu klik)          | Unit, Integration |
| FR-SVY-03  | Pertanyaan kustom (skala/pilihan/teks)     | Integration       |
| FR-SVY-04  | Tandai pertanyaan IKM vs pelengkap         | Unit, Integration |
| FR-SVY-05  | Setting boleh/tidak multi-submit           | Unit, Integration |
| FR-SVY-06  | Preview kuesioner                          | E2E               |
| FR-SVY-07  | Duplikasi paket survei                     | Integration       |
| FR-FILL-01 | Daftar survei aktif (responden)            | Integration       |
| FR-FILL-02 | Isi survei (identitas otomatis)            | Integration, E2E  |
| FR-FILL-03 | Simpan sementara / draft (opsional)        | Integration       |
| FR-FILL-04 | Konfirmasi & integritas setelah submit     | Integration       |
| FR-RES-01  | Hasil OPD: NRR, IKM, mutu, tren            | Unit, Integration |
| FR-RES-02  | Rekap jawaban kualitatif                   | Integration       |
| FR-RES-03  | Dashboard agregat Admin Kabupaten          | Integration       |
| FR-RES-04  | Ekspor laporan (PDF/Excel/CSV)             | Integration       |
| FR-RES-05  | Perhitungan IKM otomatis                   | Unit (kritis)     |

### 4.4 Modul Pengaduan Masyarakat

| Kode FR   | Kebutuhan                                                 | Jenis Uji         |
| --------- | --------------------------------------------------------- | ----------------- |
| FR-CMP-01 | Ajukan pengaduan (OPD, kategori, judul, uraian, lampiran) | Integration       |
| FR-CMP-02 | Nomor tiket unik otomatis                                 | Unit, Integration |
| FR-CMP-03 | Status bertahap: Diterima → Diproses → Selesai / Ditolak  | Unit, Integration |
| FR-CMP-04 | Admin OPD tindak lanjut pengaduan OPD-nya                 | Integration       |
| FR-CMP-05 | Riwayat percakapan/tanggapan                              | Integration       |
| FR-CMP-06 | Notifikasi saat status berubah                            | Integration       |
| FR-CMP-07 | Admin Kabupaten pantau seluruh pengaduan (read-only)      | Integration       |
| FR-CMP-08 | Pengaduan bersifat privat                                 | Integration       |

### 4.5 Cross-Cutting Concerns

| Area                                | Jenis Uji                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| **RBAC — 4 peran**                  | Integration (setiap endpoint diuji untuk peran yang diizinkan DAN yang ditolak) |
| **Isolasi data OPD**                | Integration (Admin OPD A tidak bisa akses data OPD B)                           |
| **Superuser bypass**                | Integration (superuser harus lolos semua guard tanpa kecuali)                   |
| **Privilege escalation prevention** | Integration (kabupaten tidak bisa assign role superuser)                        |
| **Rate limiting**                   | Integration (throttle pada login & submit response)                             |
| **Soft delete (UU PDP)**            | Integration (data terhapus tidak muncul di query)                               |
| **Audit logging**                   | Integration (setiap aksi admin tercatat)                                        |

---

## 5. Kriteria Masuk & Keluar

### 5.1 Kriteria Masuk (Entry Criteria)

- [ ] Kode sudah ter-compile tanpa error (`pnpm build` sukses).
- [ ] Database migration terbaru sudah dijalankan (`prisma migrate deploy`).
- [ ] Seed data tersedia dan dapat dijalankan. Sempat tak terpenuhi 5–15 Sep 2026, lihat [CAT-014](BUG_REPORTS.md#cat-014). **Dari mana dijalankan menentukan** (terpantau 15 Sep 2026):

  | Perintah | Hasil |
  | -------- | ----- |
  | `pnpm db:seed` dari **akar repo** | ❌ `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "db:seed" not found` — skripnya hanya ada di `apps/api/package.json`, tak ada di akar |
  | `cd apps/api && pnpm db:seed` | ✅ |
  | `pnpm --filter ./apps/api db:seed` dari akar | ✅ |
  | `prisma db seed` | ❌ tak ada blok `prisma.seed` di package.json |

  > ⚠️ **Jangan jalankan pada `skm_db` tanpa berpikir dua kali.** Upsert superuser
  > memuat `update: { roles: [Role.superuser] }`, yang **menimpa** peran akun yang
  > sudah ada. Akun superuser dev kini berperan empat
  > (`superuser, kabupaten, opd, responden`); menjalankan seed akan memangkasnya
  > menjadi satu, dan akun itulah yang dipakai menguji perpindahan peran (C-15).
  > Untuk sekadar memastikan seed-nya waras, pakai basis data sekali pakai:
  >
  > ```
  > docker exec -i skm-db psql -U skm -d postgres -c "CREATE DATABASE skm_uji_seed;"
  > cd apps/api
  > DATABASE_URL="postgresql://skm:<sandi>@localhost:5432/skm_uji_seed?schema=public" pnpm exec prisma migrate deploy
  > DATABASE_URL="postgresql://skm:<sandi>@localhost:5432/skm_uji_seed?schema=public" pnpm db:seed
  > docker exec -i skm-db psql -U skm -d postgres -c "DROP DATABASE skm_uji_seed;"
  > ```
  >
  > Diverifikasi menempuh jalur itu 15 September 2026: seed lulus, menghasilkan
  > empat akun berperan tunggal, dan `skm_db` terbukti tak tersentuh.
- [ ] Lingkungan Docker Compose berjalan normal (api, db, frontend).
- [ ] Semua unit test yang ada lulus (`pnpm test`).

### 5.2 Kriteria Keluar (Exit Criteria)

- [ ] Seluruh test case prioritas **P0 (Kritis)** lulus 100%.
- [ ] Seluruh test case prioritas **P1 (Tinggi)** lulus ≥ 95%.
- [ ] Tidak ada bug severity **Critical** atau **High** yang belum ditangani.
- [ ] Coverage unit test ≥ 80% untuk service layer (Backend).
- [ ] Coverage component test ≥ 80% untuk UI Components (Frontend).
- [ ] Coverage integration test mencakup seluruh **67 endpoint** API (dihitung ulang 15 Sep 2026 dari dekorator rute di 14 controller; angka lama 49 berasal dari 29 Juli).
- [ ] Isolasi data OPD tervalidasi pada semua modul.
- [ ] Perhitungan IKM menghasilkan output identik dengan perhitungan manual.

---

## 6. Metrik Kualitas

| Metrik                     | Target              | Cara Ukur           |
| -------------------------- | ------------------- | ------------------- |
| Test Pass Rate             | ≥ 95% (P0/P1: 100%) | Jest report         |
| Code Coverage (service)    | ≥ 80%               | Jest --coverage     |
| Code Coverage (controller) | ≥ 70%               | Jest --coverage     |
| Code Coverage (frontend)   | ≥ 80%               | Jest --coverage     |
| Bug Density                | < 5 bugs/KLOC       | Issue tracker       |
| Mean Time to Fix (P0 bug)  | < 4 jam             | Issue tracker       |
| Regression Rate            | < 5%                | CI pipeline history |

---

## 7. Risiko Pengujian & Mitigasi

| Risiko                                                               | Dampak                  | Mitigasi                                                                                |
| -------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Modul Complaints belum diimplementasi → tidak bisa diuji integration | Test case tertunda      | Uji unit untuk logika bisnis yang sudah didesain; integration test setelah implementasi |
| Auth endpoint belum ada (SSO vs lokal) → E2E flow terputus           | Alur E2E tidak lengkap  | Mock auth untuk E2E; uji auth terpisah setelah keputusan arsitektur                     |
| Data race pada anti-duplikat submit                                  | False positive/negative | Uji concurrent submit dengan parallel requests                                          |
| Perubahan regulasi (PermenPANRB 6/2022)                              | Rumus IKM berubah       | Parameterisasi rumus; uji dengan kedua formula                                          |

---

## 8. Jadwal Pengujian

| Fase        | Aktivitas                                               | Estimasi      |
| ----------- | ------------------------------------------------------- | ------------- |
| **Fase 1**  | Unit test service layer (Auth, Survey, IKM, Complaints) | Minggu 1–2    |
| **Fase 2**  | Integration test semua endpoint API + RBAC              | Minggu 2–3    |
| **Fase 3**  | E2E test alur utama (registrasi → survei → hasil)       | Minggu 3–4    |
| **Fase 4**  | Manual QA + eksploratori + regresi                      | Minggu 4      |
| **Ongoing** | CI/CD automated regression pada setiap MR               | Berkelanjutan |

---

## 9. Deliverables

| Deliverable               | Format                        | Lokasi                            |
| ------------------------- | ----------------------------- | --------------------------------- |
| Dokumen Rencana Pengujian | Markdown                      | `TEST_PLAN.md` (dokumen ini)      |
| Matriks Skenario Uji      | Markdown                      | `TEST_CASES.md`                   |
| Unit Test Code            | TypeScript (Jest)             | `apps/api/src/**/*.spec.ts`       |
| Integration Test Code     | TypeScript (Jest + Supertest) | `apps/api/test/**/*.e2e-spec.ts`  |
| Component Test Code       | JSX/TSX (Jest + RTL)          | `apps/web/src/**/__tests__/*.jsx` |
| E2E Test Code             | JavaScript & TypeScript (Playwright) | `apps/web/e2e/**/*.spec.{js,ts}` — 19 pengujian di 7 berkas |
| Perkakas pembersih data uji | JavaScript (Node, ESM)      | `apps/web/e2e/support/bersihkan-data-uji.mjs` |
| Test Coverage Report      | HTML/LCOV                     | CI artifacts                      |
| Bug Reports               | Issue                         | GitLab Issues                     |

---

## 10. Persetujuan

| Peran           | Nama | Tanggal | Tanda Tangan |
| --------------- | ---- | ------- | ------------ |
| Project Manager |      |         |              |
| Lead Developer  |      |         |              |
| QA Lead         |      |         |              |
| Product Owner   |      |         |              |
