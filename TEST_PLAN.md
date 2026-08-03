# Rencana Pengujian (Test Plan)

## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

|                   |                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Dokumen Acuan** | PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md · ERD.png · Routes-List-API-dan-Frontend.md |
| **Versi Dokumen** | 1.0                                                                                    |
| **Tanggal**       | 29 Juli 2026                                                                           |
| **Stack**         | Next.js (Frontend) · Nest.js (Backend) · PostgreSQL (Database) · Prisma (ORM) · Docker |
| **Cakupan Uji**   | Backend REST API · Frontend UI · Integrasi End-to-End                                  |

---

## 1. Pendahuluan

### 1.1 Tujuan

Dokumen ini mendefinisikan strategi, cakupan, dan rencana pelaksanaan pengujian untuk **Sistem SKM & Pengaduan Masyarakat**. Tujuan utama pengujian adalah memastikan bahwa:

1. Seluruh kebutuhan fungsional (FR) dalam PRD terimplementasi dan berfungsi sesuai spesifikasi.
2. Aturan bisnis kritis — terutama **isolasi data OPD**, **batasan nilai IKM skala 1–4**, dan **pembuatan nomor tiket unik pengaduan** — berjalan benar.
3. Hak akses berbasis peran (RBAC) untuk empat aktor (Superuser, Admin Kabupaten, Admin OPD, Responden) ditegakkan secara konsisten.
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

| Kategori          | Deskripsi                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **Seed Data**     | Dijalankan via `prisma/seed.ts`: 1 superuser, 1 admin kabupaten, 3 OPD, 3 admin OPD, 5 responden |
| **Test Fixtures** | Data factory di folder `test/` untuk membuat entitas secara programatik                          |
| **Cleanup**       | Setiap suite test membersihkan data setelah selesai (transactional rollback atau truncate)       |

### 3.3 Akun Uji

| Peran                   | Email                     | Keterangan                       |
| ----------------------- | ------------------------- | -------------------------------- |
| Superuser               | `superuser@test.local`    | Akses penuh, bypass semua @Roles |
| Admin Kabupaten         | `kabupaten@test.local`    | Kelola OPD, lihat semua data     |
| Admin OPD (Dinkes)      | `opd-dinkes@test.local`   | Terikat ke OPD Dinas Kesehatan   |
| Admin OPD (Disdukcapil) | `opd-dukcapil@test.local` | Terikat ke OPD Disdukcapil       |
| Responden               | `responden@test.local`    | Isi survei & ajukan pengaduan    |

---

## 4. Cakupan Pengujian per Modul

### 4.1 Modul Autentikasi & Manajemen Akun

| Kode FR    | Kebutuhan                                                    | Jenis Uji        |
| ---------- | ------------------------------------------------------------ | ---------------- |
| FR-AUTH-01 | Registrasi responden (nama, email, sandi, demografis)        | Integration, E2E |
| FR-AUTH-02 | Verifikasi akun (OTP/email)                                  | Integration      |
| FR-AUTH-03 | Login JWT untuk semua peran                                  | Integration, E2E |
| FR-AUTH-04 | Reset & ubah kata sandi                                      | Integration      |
| FR-AUTH-05 | Data profil dipakai ulang otomatis                           | Integration, E2E |
| FR-AUTH-06 | Akun admin dibuat oleh Admin Kabupaten (bukan self-register) | Integration      |
| FR-AUTH-07 | Nonaktifkan/aktifkan akun                                    | Integration      |

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
- [ ] Seed data tersedia dan dapat dijalankan (`prisma db seed`).
- [ ] Lingkungan Docker Compose berjalan normal (api, db, frontend).
- [ ] Semua unit test yang ada lulus (`pnpm test`).

### 5.2 Kriteria Keluar (Exit Criteria)

- [ ] Seluruh test case prioritas **P0 (Kritis)** lulus 100%.
- [ ] Seluruh test case prioritas **P1 (Tinggi)** lulus ≥ 95%.
- [ ] Tidak ada bug severity **Critical** atau **High** yang belum ditangani.
- [ ] Coverage unit test ≥ 80% untuk service layer.
- [ ] Coverage integration test mencakup seluruh 49 endpoint API.
- [ ] Isolasi data OPD tervalidasi pada semua modul.
- [ ] Perhitungan IKM menghasilkan output identik dengan perhitungan manual.

---

## 6. Metrik Kualitas

| Metrik                     | Target              | Cara Ukur           |
| -------------------------- | ------------------- | ------------------- |
| Test Pass Rate             | ≥ 95% (P0/P1: 100%) | Jest report         |
| Code Coverage (service)    | ≥ 80%               | Jest --coverage     |
| Code Coverage (controller) | ≥ 70%               | Jest --coverage     |
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

| Deliverable               | Format                        | Lokasi                           |
| ------------------------- | ----------------------------- | -------------------------------- |
| Dokumen Rencana Pengujian | Markdown                      | `TEST_PLAN.md` (dokumen ini)     |
| Matriks Skenario Uji      | Markdown                      | `TEST_CASES.md`                  |
| Unit Test Code            | TypeScript (Jest)             | `apps/api/src/**/*.spec.ts`      |
| Integration Test Code     | TypeScript (Jest + Supertest) | `apps/api/test/**/*.e2e-spec.ts` |
| E2E Test Code             | TypeScript (Playwright)       | `apps/web/e2e/**/*.spec.ts`      |
| Test Coverage Report      | HTML/LCOV                     | CI artifacts                     |
| Bug Reports               | Issue                         | GitLab Issues                    |

---

## 10. Persetujuan

| Peran           | Nama | Tanggal | Tanda Tangan |
| --------------- | ---- | ------- | ------------ |
| Project Manager |      |         |              |
| Lead Developer  |      |         |              |
| QA Lead         |      |         |              |
| Product Owner   |      |         |              |
