# Product Requirement Document (PRD)
## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

| | |
|---|---|
| **Pemilik Produk** | Dinas Komunikasi dan Informatika (Diskominfo) Kabupaten |
| **Versi Dokumen** | 1.1 |
| **Tanggal** | 13 Juli 2026 |
| **Status** | Menunggu Review |
| **Dokumen terkait** | ERD-Sistem-SKM-dan-Pengaduan.mermaid · Routes-List-API-dan-Frontend.md |
| **Stack** | Next.js (Frontend) · Nest.js (Backend) · PostgreSQL (Database) · Docker (Kontainerisasi) |

---

## 1. Ringkasan Eksekutif

Diskominfo membutuhkan sebuah platform terpadu yang menjalankan dua fungsi utama pelayanan publik: **(1) Survei Kepuasan Masyarakat (SKM)** untuk mengukur kualitas layanan setiap Organisasi Perangkat Daerah (OPD), dan **(2) Pengaduan Masyarakat** sebagai kanal masukan dan keluhan warga.

Sistem melibatkan tiga aktor bisnis: **Admin Kabupaten** (pengawas tingkat kabupaten, sekaligus pengelola sistem/superuser — akses penuh, digabung 2026-08-05), **Admin OPD** (pengelola survei & pengaduan di masing-masing perangkat daerah), dan **Responden/Masyarakat** (pengguna layanan). Warga cukup registrasi sekali, lalu dapat mengikuti survei apa pun dan mengajukan pengaduan tanpa mengisi ulang data diri.

Secara metodologi, modul SKM dirancang selaras dengan pedoman nasional (9 unsur pelayanan, skala penilaian 1–4, dan konversi ke Indeks Kepuasan Masyarakat/IKM), namun tetap fleksibel karena Admin OPD boleh menambah pertanyaan kustom di luar unsur baku.

---

## 2. Latar Belakang & Konteks Regulasi

Penyelenggara pelayanan publik wajib mengukur kepuasan masyarakat sebagai dasar perbaikan layanan (amanat UU No. 25 Tahun 2009 tentang Pelayanan Publik). Pedoman teknis SKM diatur dalam **PermenPANRB No. 14 Tahun 2017** yang menetapkan **9 unsur pelayanan** dengan skala 1–4 dan konversi ke nilai IKM. Pedoman ini kemudian diperbarui oleh **PermenPANRB No. 6 Tahun 2022 tentang Survei Kualitas Pelayanan** yang cakupannya lebih luas (persepsi, harapan, dan kesenjangan/gap).

**Implikasi desain:** kuesioner tidak boleh di-*hardcode*. Sistem harus mampu menampung template unsur baku sekaligus perubahan regulasi, sehingga struktur pertanyaan dibuat dinamis (lihat *Open Question OQ-1*).

---

## 3. Tujuan Produk (Goals)

1. Menyediakan kanal SKM daring yang terpusat untuk seluruh OPD dalam satu platform.
2. Mengotomasi perhitungan nilai IKM sehingga OPD tidak lagi mengolah data secara manual.
3. Memberi Admin Kabupaten pandangan agregat kinerja seluruh OPD dalam satu dashboard.
4. Menyediakan kanal pengaduan yang terlacak statusnya (dari pengajuan hingga selesai).
5. Menghilangkan pengisian data diri berulang bagi masyarakat melalui akun terdaftar.

### Non-Goals (Di luar cakupan awal)
- Integrasi dengan sistem kepegawaian/keuangan daerah.
- Aplikasi mobile native (cukup web responsif pada rilis awal).
- Modul manajemen dokumen atau disposisi surat internal OPD.
- Analitik prediktif / machine learning atas hasil survei.

---

## 4. Metrik Keberhasilan (Success Metrics)

| Metrik | Target Awal |
|---|---|
| Jumlah OPD aktif menggunakan sistem | 100% OPD yang ditugaskan |
| Waktu Admin OPD membuat 1 paket survei | < 15 menit |
| Perhitungan IKM otomatis vs manual | Selisih 0 (akurat) |
| Rata-rata waktu tanggap pengaduan | Terpantau & menurun antar-periode |
| Tingkat penyelesaian registrasi responden | > 80% tanpa bantuan |
| Ketersediaan sistem (uptime) | ≥ 99% |

---

## 5. Ruang Lingkup (Scope)

### 5.1 In-Scope
- Autentikasi & manajemen akun (Admin Kabupaten, Admin OPD, Responden).
- Manajemen data OPD dan provisioning akun Admin OPD.
- Pembuatan & pengelolaan paket survei oleh Admin OPD (unsur baku + kustom).
- Pengisian survei oleh responden.
- Perhitungan otomatis NRR per unsur dan nilai IKM.
- Dashboard hasil per OPD (Admin OPD) dan agregat kabupaten (Admin Kabupaten).
- Modul pengaduan: pengajuan, pelacakan status, tindak lanjut, dan penutupan.
- Ekspor hasil survei & pengaduan (mis. Excel/PDF/CSV).

### 5.2 Out-of-Scope (Rilis Awal)
- Single Sign-On (SSO) dengan sistem pemerintah lain.
- Notifikasi WhatsApp/SMS berbayar (email/notifikasi in-app dulu).
- Multi-bahasa.

---

## 6. Peran Pengguna & Hak Akses (RBAC)

> **Catatan asumsi (A-1):** Anda menyebut 2 admin. Namun seseorang tetap harus membuat daftar OPD dan akun Admin OPD. PRD ini mengasumsikan **Admin Kabupaten (Diskominfo)** yang menjalankan fungsi pengelolaan tersebut. Peran teknis terpisah **Superuser** (pengelola sistem, akses penuh) ditambahkan (2026-07-27, *OQ-2*), sempat **digabung** ke Admin Kabupaten (2026-08-05), lalu **DIPISAH KEMBALI** (2026-08-20) — keduanya atas permintaan user. Sejak dipisah, bedanya jelas: log aktivitas & manajemen akun khusus Superuser (lihat tabel di bawah).

| Kemampuan | Admin Kabupaten / Superuser | Admin OPD | Responden |
|---|:---:|:---:|:---:|
| Kelola akun Admin Kabupaten & Admin OPD, ubah role akun | ✅ | ❌ | ❌ |
| Kelola daftar OPD | ✅ (read-only, sinkron dari Helpdesk) | ❌ | ❌ |
| Buat/nonaktifkan akun Admin OPD | ✅ | ❌ | ❌ |
| Buat & kelola pertanyaan survei | ✅ (via bypass, wajib isi `opdId` sendiri) | ✅ (OPD sendiri) | ❌ |
| Publikasikan / tutup survei | ✅ (via bypass) | ✅ (OPD sendiri) | ❌ |
| Lihat hasil survei OPD sendiri | ✅ (semua OPD) | ✅ (OPD sendiri) | ❌ |
| Lihat hasil survei agregat semua OPD | ✅ | ❌ | ❌ |
| Kelola & tindak lanjut pengaduan | ✅ (pantau semua) | ✅ (OPD sendiri) | ❌ |
| Registrasi & login | (akun dibuatkan) | (akun dibuatkan) | ✅ |
| Isi survei | ❌ | ❌ | ✅ |
| Ajukan pengaduan & pantau statusnya | ❌ | ❌ | ✅ |

**Peran Admin Kabupaten & Superuser (dipisah kembali 2026-08-20):** keduanya mendapat akses penuh yang **melampaui** seluruh batasan `@Roles` (implementasi: *bypass* pada RolesGuard untuk peran berhak penuh, lihat `hasFullAccess` di `role.util.ts`). Bedanya BUKAN sekadar nama, dan tak bisa dinyatakan lewat `@Roles` (bypass-nya meloloskan keduanya) sehingga ditegakkan di dalam service:

| Kemampuan | Superuser | Admin Kabupaten |
|---|:---:|:---:|
| Log aktivitas (`/audit-logs`) | ✅ | ❌ 403 (`AuditService.assertSuperuser`) |
| Manajemen akun (`/users`, termasuk ubah role) | ✅ | ❌ 403 (`UsersService.assertSuperuser`) |
| Dashboard, survei, pertanyaan, pengaduan, OPD, IKM | ✅ | ✅ |
| Memilih area kerja saat login (`/pilih-peran`) | ✅ | ❌ (langsung ke dashboard kabupaten) |

Area kerja yang dipilih Superuser MENGURUNG navigasinya pada area itu saja (cookie `area` + proxy frontend) — pembatas navigasi, bukan hak akses: token-nya tetap berhak penuh di backend.

OPD tetap **read-only** dari Helpdesk — kemampuan CRUD penuh Admin Kabupaten TIDAK mencakup data OPD (keputusan arsitektur terkunci 2026-07-20, tidak diubah oleh penggabungan role ini).

**Prinsip penting:** Admin OPD hanya bisa mengakses data milik OPD-nya sendiri (*data isolation* per OPD). Admin Kabupaten SEBELUM digabung dengan Superuser bersifat **read-only** terhadap hasil survei (memantau, bukan membuat pertanyaan) — sejak digabung (2026-08-05), Admin Kabupaten **teknis bisa** membuat/mengelola survei OPD mana pun via bypass RolesGuard yang sama dengan Superuser lama, meski alur kerja normalnya (UI, dsb.) tetap didesain agar pembuatan survei dilakukan Admin OPD.

---

## 7. Persona

- **Bu Sari — Admin OPD (Dinas Kesehatan).** Ingin cepat membuat kuesioner dari template standar, memantau berapa warga sudah mengisi, dan melihat nilai IKM tanpa menghitung manual di Excel.
- **Pak Budi — Admin Kabupaten (Diskominfo).** Ingin membandingkan kinerja layanan antar-OPD dalam satu layar dan mengunduh laporan untuk pimpinan daerah.
- **Rina — Warga/Responden.** Baru pertama memakai layanan daring, ingin proses isi survei dan lapor pengaduan yang singkat, jelas statusnya, dan tidak berulang mengisi identitas.

---

## 8. Kebutuhan Fungsional (per Modul)

Format kode: **FR-[Modul]-[Nomor]**.

### 8.1 Modul Autentikasi & Manajemen Akun
- **FR-AUTH-01** Responden dapat registrasi mandiri (nama, email/no. HP, kata sandi, data demografis dasar: jenis kelamin, usia/kelompok umur, pendidikan, pekerjaan — sesuai profil responden SKM).
- **FR-AUTH-02** Verifikasi akun responden (mis. via email/OTP) sebelum dapat mengisi survei.
- **FR-AUTH-03** Login untuk ketiga peran dengan sesi aman berbasis token (JWT).
- **FR-AUTH-04** Reset kata sandi & ubah profil.
- **FR-AUTH-05** Data profil responden dipakai ulang otomatis pada setiap survei/pengaduan baru (tidak isi ulang).
- **FR-AUTH-06** Akun Admin OPD & Admin Kabupaten dibuat oleh Admin Kabupaten (bukan registrasi mandiri).
- **FR-AUTH-07** Nonaktifkan/aktifkan akun.

### 8.2 Modul Manajemen OPD (Admin Kabupaten)
- **FR-OPD-01** CRUD data OPD (nama, kode, jenis layanan, penanggung jawab).
- **FR-OPD-02** Menautkan satu atau lebih akun Admin OPD ke sebuah OPD.
- **FR-OPD-03** Melihat status keaktifan tiap OPD (jumlah survei aktif, pengaduan terbuka).

### 8.3 Modul Survei (Admin OPD)
- **FR-SVY-01** Membuat "paket survei" dengan judul, periode, dan status (draft/aktif/ditutup).
- **FR-SVY-02** Menambah pertanyaan dari **template 9 unsur baku** dengan satu klik.
- **FR-SVY-03** Menambah pertanyaan **kustom** dengan tipe: skala 1–4, pilihan ganda, atau isian teks/saran.
- **FR-SVY-04** Menandai pertanyaan mana yang dihitung ke IKM (pertanyaan berskala unsur) vs pertanyaan pelengkap.
- **FR-SVY-05** Mengatur apakah satu responden boleh mengisi lebih dari sekali dalam satu periode.
- **FR-SVY-06** Pratinjau (preview) kuesioner sebelum dipublikasikan.
- **FR-SVY-07** Menyalin (duplicate) paket survei periode sebelumnya.

### 8.4 Modul Pengisian Survei (Responden)
- **FR-FILL-01** Melihat daftar survei aktif dari berbagai OPD.
- **FR-FILL-02** Mengisi survei; identitas terisi otomatis dari profil.
- **FR-FILL-03** Menyimpan sementara (draft) dan melanjutkan (opsional).
- **FR-FILL-04** Konfirmasi setelah submit; tidak dapat mengubah setelah dikirim (integritas data).

### 8.5 Modul Hasil & Dashboard SKM
- **FR-RES-01** Admin OPD melihat hasil OPD-nya: jumlah responden, NRR per unsur, nilai IKM, mutu (A/B/C/D), dan tren antar-periode.
- **FR-RES-02** Rekap jawaban saran/teks kualitatif.
- **FR-RES-03** Admin Kabupaten melihat **dashboard agregat**: nilai IKM seluruh OPD, peringkat/perbandingan, dan filter per periode/jenis layanan.
- **FR-RES-04** Ekspor laporan (PDF/Excel/CSV).
- **FR-RES-05** Perhitungan IKM dilakukan otomatis oleh sistem (lihat Lampiran A).

### 8.6 Modul Pengaduan Masyarakat
- **FR-CMP-01** Responden mengajukan pengaduan: OPD tujuan, kategori, judul, uraian, dan lampiran (foto/dokumen).
- **FR-CMP-02** Setiap pengaduan memperoleh **nomor tiket unik** untuk pelacakan.
- **FR-CMP-03** Status pengaduan bertahap: `Diterima → Diproses → Selesai` (atau `Ditolak` dengan alasan).
- **FR-CMP-04** Admin OPD menanggapi & menindaklanjuti pengaduan yang ditujukan ke OPD-nya.
- **FR-CMP-05** Riwayat percakapan/tanggapan antara admin dan responden pada satu tiket.
- **FR-CMP-06** Responden menerima notifikasi (in-app/email) saat status berubah.
- **FR-CMP-07** Admin Kabupaten memantau seluruh pengaduan lintas OPD (read-only + statistik waktu tanggap).
- **FR-CMP-08** Opsi pengaduan bersifat privat (hanya OPD terkait) — bukan forum publik.

---

## 9. Alur Pengguna Utama (User Flows)

**A. Responden mengisi survei**
Registrasi → verifikasi akun → login → pilih survei aktif → isi (identitas otomatis) → submit → konfirmasi.

**B. Admin OPD membuat survei**
Login → buat paket survei → pilih template 9 unsur + tambah pertanyaan kustom → preview → publikasikan → pantau hasil real-time → tutup periode → ekspor laporan.

**C. Alur pengaduan**
Responden ajukan (dapat nomor tiket) → Admin OPD terima & proses → beri tanggapan → ubah status → responden dapat notifikasi → tiket ditutup saat selesai.

**D. Admin Kabupaten memantau**
Login → dashboard agregat IKM semua OPD → filter periode/OPD → bandingkan → ekspor laporan pimpinan.

---

## 10. Kebutuhan Non-Fungsional (NFR)

- **Keamanan:** hashing kata sandi (bcrypt/argon2), otorisasi berbasis peran di setiap endpoint, proteksi terhadap OWASP Top 10 (SQL injection, XSS, CSRF), rate limiting pada login.
- **Privasi Data (UU No. 27 Tahun 2022 – PDP):** data pribadi responden disimpan seminimal mungkin, dengan persetujuan (consent) saat registrasi, dan hak hapus akun.
- **Performa:** dashboard hasil dimuat < 3 detik untuk skala ribuan responden per periode.
- **Ketersediaan:** target uptime ≥ 99%; backup database terjadwal harian.
- **Aksesibilitas:** antarmuka responsif (mobile-first), kontras & label form memadai.
- **Auditabilitas:** log aktivitas admin (siapa mengubah apa, kapan).
- **Skalabilitas:** arsitektur mendukung penambahan OPD tanpa perubahan kode.

---

## 11. Arsitektur Teknis

```
┌──────────────┐      HTTPS/REST      ┌──────────────┐        ┌──────────────┐
│  Next.js     │ ───────────────────► │  Nest.js     │ ─────► │ PostgreSQL   │
│  (Frontend)  │ ◄─────────────────── │  (REST API)  │ ◄───── │ (Database)   │
│  SSR/SPA     │        JSON          │  Auth/RBAC   │        │              │
└──────────────┘                      └──────────────┘        └──────────────┘
        │                                    │                        │
        └──────────────── Docker Compose (kontainer terpisah) ────────┘
                    (frontend, backend, db, reverse-proxy)
```

- **Frontend — Next.js:** aplikasi web responsif; halaman publik (survei, form pengaduan) + area admin terproteksi; komunikasi via REST ke backend.
- **Backend — Nest.js:** modular (module: Auth, Users, OPD, Survey, Response, IKM, Complaint), guard RBAC, validasi DTO, service perhitungan IKM.
- **Database — PostgreSQL:** relasional; cocok untuk relasi OPD–Survei–Pertanyaan–Jawaban dan agregasi IKM.
- **Docker:** setiap layanan dikontainerisasi; `docker-compose` untuk orkestrasi lokal/deploy; disarankan tambahan **reverse proxy** (Nginx) dan volume terpisah untuk data PostgreSQL.

**Rekomendasi pendukung:** ORM (Prisma/TypeORM) untuk Nest.js, migrasi skema terversion, dan variabel lingkungan (`.env`) untuk kredensial.

### 11.1 Prinsip API-First (Kesiapan Multi-Klien: Web, Android, iOS)

Frontend **tidak pernah** mengakses database secara langsung — seluruh data mengalir lewat REST API Nest.js. Backend berperan sebagai satu-satunya "sumber kebenaran" dan pemegang logika bisnis, sehingga klien apa pun (web Next.js, aplikasi Android, aplikasi iOS) dapat mengonsumsi API yang sama tanpa menduplikasi logika atau membuka akses ke database. Ini adalah syarat utama agar sistem dapat diperluas ke aplikasi mobile di masa depan.

Agar API benar-benar tahan untuk banyak klien, PRD mensyaratkan:

- **Versioning API** (mis. prefiks `/api/v1/...`) supaya penambahan/perubahan endpoint tidak merusak aplikasi mobile yang sudah rilis.
- **Autentikasi stateless (JWT)** tanpa ketergantungan session/cookie server, karena klien mobile lebih cocok memakai token bearer.
- **Format respons & error yang konsisten** (struktur JSON baku) agar mudah diproses semua klien.
- **Dokumentasi OpenAPI/Swagger** (didukung native oleh Nest.js) sebagai kontrak API bagi tim pengembang mobile.
- **Konfigurasi CORS** yang benar untuk mengizinkan origin web, serta akses dari aplikasi mobile.
- **Notifikasi push mobile (FCM/APNs)** — belum masuk rilis awal, namun endpoint pengaduan/status sudah dirancang agar mudah dihubungkan ke push notification ketika aplikasi mobile dibangun.

---

## 12. Model Data

Model data berikut selaras dengan **ERD final** (file: `ERD-Sistem-SKM-dan-Pengaduan.mermaid`). Terdiri dari 13 entitas (bertambah dari 11 sejak `QuestionOption` diaktifkan penuh — QST-3 — dan `AuditLog` ditambahkan — AUD-1).

| Entitas | Field | Relasi |
|---|---|---|
| **USER** | `id` (PK), `sso_subject` (UK), `nama`, `email` (UK), `role` (`kabupaten`/`opd`/`responden` — `kabupaten` = superuser, digabung 2026-08-05), `opd_id` (FK, null jika bukan admin OPD), `is_active`, `consent_at`, `last_login_at`, `deleted_at`, `created_at`, `updated_at` | 1–0..1 RESPONDENT_PROFILE; N–1 OPD (admin); 1–N SURVEY_RESPONSE, COMPLAINT, COMPLAINT_REPLY, AUDIT_LOG |
| **RESPONDENT_PROFILE** | `id` (PK), `user_id` (FK), `jenis_kelamin`, `kelompok_umur`, `pendidikan`, `pekerjaan` | 1–1 dengan USER (responden) |
| **OPD** | `id` (PK), `nama`, `kode` (UK), `jenis_layanan`, `penanggung_jawab`, `is_active` | 1–N USER (admin), SURVEY, COMPLAINT |
| **SURVEY** | `id` (PK), `opd_id` (FK), `judul`, `periode`, `status` (`draft`/`aktif`/`ditutup`), `allow_multiple_submit`, `created_at` | 1–N QUESTION, SURVEY_RESPONSE, IKM_RESULT |
| **QUESTION** | `id` (PK), `survey_id` (FK), `teks`, `tipe` (`skala`/`pilihan`/`teks`), `is_ikm_unsur`, `kode_unsur` (`U1`–`U9`, null jika kustom), `urutan` | 1–N QUESTION_OPTION (tipe pilihan), ANSWER |
| **QUESTION_OPTION** | `id` (PK), `question_id` (FK), `label`, `nilai` (skor opsional, di luar rumus IKM resmi), `urutan` | 1–N ANSWER (via `selected_option_id`) |
| **SURVEY_RESPONSE** | `id` (PK), `survey_id` (FK), `user_id` (FK), `dedupe_user_id` (anti-duplikat), `submitted_at` | 1–N ANSWER |
| **ANSWER** | `id` (PK), `response_id` (FK), `question_id` (FK), `nilai` (1–4 untuk skala), `teks` (untuk tipe teks), `selected_option_id` (FK, untuk tipe pilihan) | — |
| **IKM_RESULT** | `id` (PK), `survey_id` (FK), `periode`, `nrr_per_unsur` (json), `nilai_ikm` (decimal), `mutu` (`A`/`B`/`C`/`D`), `jumlah_responden`, `dihitung_pada` | ringkasan hasil per periode |
| **COMPLAINT** | `id` (PK), `ticket_no` (UK), `user_id` (FK), `opd_id` (FK), `kategori`, `judul`, `uraian`, `status` (`diterima`/`diproses`/`selesai`/`ditolak`), `created_at` | 1–N COMPLAINT_ATTACHMENT, COMPLAINT_REPLY |
| **COMPLAINT_ATTACHMENT** | `id` (PK), `complaint_id` (FK), `file_url`, `mime_type`, `size_bytes`, `created_at` | — |
| **COMPLAINT_REPLY** | `id` (PK), `complaint_id` (FK), `author_id` (FK, admin/pelapor), `pesan`, `created_at` | — |
| **AUDIT_LOG** | `id` (PK), `actor_id` (FK), `aksi`, `entitas`, `detail` (json), `timestamp` | — |

> **Catatan desain:** `nrr_per_unsur` disimpan sebagai `json` agar fleksibel terhadap perubahan jumlah unsur (mis. adopsi PermenPANRB 6/2022). Bila diperlukan query per-unsur di tingkat SQL, dapat dinormalkan menjadi tabel terpisah `IKM_RESULT_DETAIL` (satu baris per unsur).

---

## 13. Kontrak Endpoint API (Final)

Daftar endpoint berikut bersifat **final dan mengikat** sebagai kontrak antara backend dan seluruh klien (web, Android, iOS). Semua endpoint memakai prefiks versi `/api/v1`. Rincian lengkap request/response, serta daftar routes frontend, terdapat pada dokumen terpisah **`Routes-List-API-dan-Frontend.md`** yang menjadi rujukan resmi.

**Autentikasi & Akun**

| Method | Endpoint | Peran | Fungsi |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Publik | Registrasi responden |
| POST | `/api/v1/auth/verify` | Publik | Verifikasi akun (OTP/email) |
| POST | `/api/v1/auth/login` | Publik | Login (mengembalikan JWT) |
| POST | `/api/v1/auth/forgot-password` | Publik | Minta reset kata sandi |
| POST | `/api/v1/auth/reset-password` | Publik | Setel ulang kata sandi |
| GET | `/api/v1/auth/me` | Semua | Profil pengguna aktif |
| PATCH | `/api/v1/auth/profile` | Semua | Ubah profil |

**Manajemen OPD & Admin (Kabupaten)**

| Method | Endpoint | Peran | Fungsi |
|---|---|---|---|
| GET | `/api/v1/opd` | Kabupaten | Daftar OPD |
| POST | `/api/v1/opd` | Kabupaten | Tambah OPD |
| GET | `/api/v1/opd/:id` | Kabupaten/OPD | Detail OPD |
| PATCH | `/api/v1/opd/:id` | Kabupaten | Ubah OPD |
| GET | `/api/v1/users` | **Superuser** | Daftar akun admin |
| POST | `/api/v1/users` | **Superuser** | Buat akun admin OPD |
| PATCH | `/api/v1/users/:id` | **Superuser** | Ubah akun & role |
| PATCH | `/api/v1/users/:id/status` | **Superuser** | Aktif/nonaktifkan akun |

**Survei & Pertanyaan (OPD)**

| Method | Endpoint | Peran | Fungsi |
|---|---|---|---|
| GET | `/api/v1/surveys` | OPD/Kabupaten | Daftar survei (terfilter peran) |
| POST | `/api/v1/surveys` | OPD | Buat paket survei |
| GET | `/api/v1/surveys/:id` | OPD/Kabupaten | Detail survei |
| PATCH | `/api/v1/surveys/:id` | OPD | Ubah survei |
| PATCH | `/api/v1/surveys/:id/status` | OPD | Publikasikan/tutup survei |
| POST | `/api/v1/surveys/:id/duplicate` | OPD | Duplikasi survei |
| GET | `/api/v1/surveys/:id/questions` | OPD | Daftar pertanyaan |
| POST | `/api/v1/surveys/:id/questions` | OPD | Tambah pertanyaan |
| POST | `/api/v1/surveys/:id/questions/template` | OPD | Terapkan template 9 unsur |
| PATCH | `/api/v1/questions/:id` | OPD | Ubah pertanyaan |
| DELETE | `/api/v1/questions/:id` | OPD | Hapus pertanyaan |

**Pengisian, Hasil & IKM**

| Method | Endpoint | Peran | Fungsi |
|---|---|---|---|
| GET | `/api/v1/surveys/active` | Responden | Daftar survei aktif |
| POST | `/api/v1/surveys/:id/responses` | Responden | Kirim jawaban survei |
| GET | `/api/v1/surveys/:id/responses` | OPD | Daftar respons masuk |
| GET | `/api/v1/surveys/:id/results` | OPD/Kabupaten | Hasil NRR + nilai IKM |
| GET | `/api/v1/surveys/:id/results/export` | OPD/Kabupaten | Ekspor laporan (PDF/Excel) |
| GET | `/api/v1/dashboard/ikm` | Kabupaten | Agregat IKM semua OPD |

**Pengaduan**

| Method | Endpoint | Peran | Fungsi |
|---|---|---|---|
| POST | `/api/v1/complaints` | Responden | Ajukan pengaduan |
| GET | `/api/v1/complaints` | Semua* | Daftar pengaduan (terfilter peran) |
| GET | `/api/v1/complaints/:ticketNo` | Semua* | Detail & lacak pengaduan |
| PATCH | `/api/v1/complaints/:id/status` | OPD | Ubah status pengaduan |
| GET | `/api/v1/complaints/:id/replies` | Semua* | Daftar tanggapan |
| POST | `/api/v1/complaints/:id/replies` | OPD/Responden | Tambah tanggapan |

**Audit**

| Method | Endpoint | Peran | Fungsi |
|---|---|---|---|
| GET | `/api/v1/audit-logs` | **Superuser** | Log aktivitas admin |

> *Peran "Semua\*" pada pengaduan tetap dibatasi kepemilikan data: responden hanya melihat pengaduannya sendiri, Admin OPD hanya pengaduan OPD-nya, Admin Kabupaten memantau seluruhnya.*

---

## 14. Rencana Rilis (Milestone)

**Fase 1 — MVP (fondasi):** Autentikasi + RBAC, manajemen OPD, buat survei (template 9 unsur), isi survei, perhitungan IKM, dashboard hasil OPD.

**Fase 2 — Pengaduan & Agregasi:** Modul pengaduan lengkap (tiket, status, tindak lanjut), dashboard agregat Admin Kabupaten, ekspor laporan.

**Fase 3 — Penyempurnaan:** Pertanyaan kustom lanjutan, notifikasi email, audit log, optimasi performa & aksesibilitas.

---

## 15. Asumsi, Ketergantungan & Batasan

- **A-1:** Admin Kabupaten menjalankan fungsi provisioning OPD & akun Admin OPD.
- **A-2:** Satu responden = satu akun terverifikasi (identitas unik via email/no. HP).
- **A-3:** Perhitungan IKM mengikuti kaidah 9 unsur skala 1–4 (dapat disesuaikan bila mengadopsi PermenPANRB 6/2022).
- **Dependensi:** ketersediaan layanan email untuk verifikasi & notifikasi; infrastruktur hosting/server yang mendukung Docker.

---

## 16. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Perubahan regulasi kuesioner | Kuesioner usang | Struktur pertanyaan dinamis, bukan hardcode |
| Kebocoran data pribadi | Hukum & kepercayaan | Enkripsi, minimasi data, kepatuhan UU PDP |
| Responden ganda/manipulasi | Nilai IKM bias | Verifikasi akun + batas pengisian per periode |
| Adopsi OPD rendah | Sistem tak terpakai | Onboarding & template siap pakai |

---

## 17. Pertanyaan Terbuka (Open Questions)

- **OQ-1:** Apakah standar yang dipakai PermenPANRB 14/2017 (9 unsur, IKM) atau sudah mengadopsi PermenPANRB 6/2022 (Survei Kualitas Pelayanan dengan analisis gap)? Ini menentukan struktur kuesioner & rumus.
- **OQ-2:** ~~Perlukah peran teknis Super Admin terpisah dari Admin Kabupaten?~~ **TERJAWAB (2026-07-27):** ya — ditambahkan role `superuser`. **DIREVISI (2026-08-05, atas permintaan user):** digabung kembali — role `superuser` DIHAPUS, `kabupaten` mewarisi akses penuh (bypass RolesGuard) sepenuhnya. Alasan: cukup satu tingkat admin tertinggi, tidak perlu dipisah secara teknis.
- **OQ-3:** Apakah pengaduan boleh anonim, atau wajib login? (PRD ini mengasumsikan wajib login.)
- **OQ-4:** Perlukah verifikasi identitas resmi (NIK) untuk responden, atau cukup email/HP?
- **OQ-5:** Apakah hasil IKM dipublikasikan ke publik (transparansi) atau internal saja?

---

## Lampiran A — Metodologi Perhitungan IKM (Referensi PermenPANRB 14/2017)

**9 Unsur Pelayanan:**
1. Persyaratan
2. Sistem, Mekanisme, dan Prosedur
3. Waktu Penyelesaian
4. Biaya/Tarif
5. Produk Spesifikasi Jenis Pelayanan
6. Kompetensi Pelaksana
7. Perilaku Pelaksana
8. Sarana dan Prasarana
9. Penanganan Pengaduan, Saran, dan Masukan

**Alur perhitungan:**
- Setiap unsur dinilai dengan **skala 1–4**.
- **NRR per unsur** = jumlah nilai unsur ÷ jumlah responden.
- **Bobot nilai tertimbang** = 1 ÷ jumlah unsur (mis. 1/9 ≈ 0,11 untuk 9 unsur).
- **NRR tertimbang per unsur** = NRR per unsur × bobot.
- **Nilai IKM** = (Σ NRR tertimbang seluruh unsur) × 25.

**Kategori Mutu Pelayanan:**

| Nilai IKM (konversi) | Mutu | Kinerja |
|---|:---:|---|
| 25,00 – 64,99 | D | Tidak Baik |
| 65,00 – 76,60 | C | Kurang Baik |
| 76,61 – 88,30 | B | Baik |
| 88,31 – 100,00 | A | Sangat Baik |

> *Catatan: nilai konversi di atas mengikuti pedoman PermenPANRB 14/2017 dan dapat ditinjau ulang jika sistem mengadopsi PermenPANRB 6/2022.*
