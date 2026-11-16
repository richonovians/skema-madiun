# Product Requirement Document (PRD)
## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

| | |
|---|---|
| **Pemilik Produk** | Dinas Komunikasi dan Informatika (Diskominfo) Kabupaten |
| **Versi Dokumen** | 1.2 |
| **Tanggal** | 13 Juli 2026 (isi bab 1 sampai 17) |
| **Amandemen** | 16 November 2026 (bab 18) |
| **Status** | Menunggu Review |
| **Dokumen terkait** | ERD-Sistem-SKM-dan-Pengaduan.mermaid · Routes-List-API-dan-Frontend.md |
| **Stack** | Next.js (Frontend) · Nest.js (Backend) · PostgreSQL (Database) · Docker (Kontainerisasi) |

> **CARA MEMBACA DOKUMEN INI — peran `superuser` sudah tidak ada.**
>
> Isi dokumen ini menyebut peran `superuser` enam belas kali. Peran itu **dilebur ke
> `kabupaten` pada 15 September 2026** atas permintaan pemilik produk, dan nilai
> enumnya dibuang (`20260915140000_lebur_superuser_ke_kabupaten`). Sekarang hanya
> ada tiga peran: `kabupaten`, `opd`, `responden`. Setiap `superuser` di bawah
> harus dibaca sebagai `kabupaten`.
>
> **Isinya sengaja TIDAK ditulis ulang.** PRD adalah rekaman tentang apa yang
> diminta pemilik produk pada 13 Juli 2026, dan menyuntingnya agar cocok dengan
> kode hari ini akan memalsukan rekaman itu — justru dokumen inilah yang
> menjelaskan mengapa peran itu pernah ada. Riwayatnya berlapis: ditambahkan
> 27 Juli, dilebur 5 Agustus, **dikembalikan** 20 Agustus, lalu dilebur untuk
> terakhir kali 15 September. Keempatnya ada sebagai migrasi di
> `apps/api/prisma/migrations/`.
>
> Rujukan yang hidup untuk peran dan hak akses: `apps/api/src/common/auth/`
> (`role.util.ts`, `opd-scope.util.ts`) dan halaman **Dokumentasi API** di panel
> Admin Kabupaten, yang terbit otomatis dari kode.
>
> _Kotak ini ditambahkan 13 Oktober 2026._
>
> Perubahan kebutuhan lain sesudah 13 Juli 2026, seperti alur status pengaduan,
> tingkat pengaduan, masuk lewat SSO, dan jenis survei, dicatat di
> **bab 18 (Amandemen)**, bukan dengan menyunting bab 1 sampai 17.

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
| Dashboard OPD (`/dashboard/opd`) | ✅ (pilih OPD lebih dulu) | ❌ 403 (`DashboardService.resolveDashboardOpdId`) |
| Dashboard kabupaten, survei, pertanyaan, pengaduan, OPD, IKM | ✅ | ✅ |
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
- **FR-SVY-02** Survei berjenis **SKM** langsung memuat **9 unsur baku** (U1–U9) sejak dibuat; unsurnya tidak dapat dihapus, tetapi OPD mengubah kalimat pertanyaan tiap unsur.
- **FR-SVY-03** Menambah pertanyaan **kustom** dengan tipe: skala 1–4, pilihan ganda, atau isian teks/saran.
- **FR-SVY-04** Menandai pertanyaan mana yang dihitung ke IKM (pertanyaan berskala unsur) vs pertanyaan pelengkap.
- **FR-SVY-05** Mengatur apakah satu responden boleh mengisi lebih dari sekali dalam satu periode.
- **FR-SVY-06** Pratinjau (preview) kuesioner sebelum dipublikasikan.
- **FR-SVY-07** Menyalin (duplicate) paket survei periode sebelumnya.
- **FR-SVY-08** Jenis survei dipilih saat membuat: **SKM** (hasil: Nilai IKM menurut PermenPANRB) atau **Custom** (hasil: **Nilai Survei**). Survei Custom wajib memilih **tujuan** (Kepuasan / Evaluasi / Penilaian) dan **metode nilai** (rata-rata skala 1–4, mis. "3,40 / 4", atau indeks persen, mis. "85%"); keduanya menentukan nama angka dan kategori verbalnya (mis. Puas, Sangat Baik) serta boleh diganti sampai survei ditutup karena hanya mengatur tampilan.
- **FR-SVY-09** Survei SKM yang terlanjur dipilih dapat diganti menjadi Custom (satu arah) selama masih draf dan belum dijawab; sembilan unsur dihapus, pertanyaan tambahan dipertahankan. Statistik & Laporan dapat disaring menurut jenis survei (Semua / SKM / Custom).

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

## 18. Amandemen sesudah 13 Juli 2026

Bab 1 sampai 17 berisi permintaan pemilik produk per 13 Juli 2026. Pengecualiannya FR-SVY-08 dan FR-SVY-09, yang ditambahkan langsung pada 8 Oktober 2026. Bab ini mencatat kebutuhan yang kemudian berubah, sehingga pembaca tahu bagian mana yang tidak lagi berlaku tanpa harus membandingkannya dengan kode. Bila isi bab ini bertentangan dengan bab sebelumnya, bab inilah yang berlaku. Keadaan per 16 November 2026.

| Tanggal | Mengubah | Yang berlaku sekarang | Rujukan di kode |
|---|---|---|---|
| 27 Jul dan 4 Nov 2026 | FR-OPD-01, §12 (OPD) | Data OPD tidak dibuat atau disunting di aplikasi. Daftarnya disinkronkan dari Helpdesk (`POST /opd/sync`) dan hanya dapat dibaca. Sejak 4 November, tingkat sebuah OPD (kabupaten atau kecamatan) diturunkan dari namanya, karena data Helpdesk tidak memuatnya. | `opd/opd.controller.ts`, `opd/tingkat-opd.util.ts` |
| 5 Agu 2026 | OQ-5 | Terjawab: hasil IKM dipublikasikan. `GET /statistics` dapat dibuka tanpa masuk dan memuat rata-rata IKM, peringkat OPD menurut nilai IKM, dan tren IKM per triwulan, ditampilkan di beranda. | `dashboard/dashboard.controller.ts`, `dashboard/entities/statistics.entity.ts` |
| 6 Agu s.d. 12 Nov 2026 | FR-CMP-06 | Notifikasi hanya di dalam aplikasi; email tidak dikirim, karena backend tidak memuat pengirim email apa pun. Notifikasi dikirim saat status pengaduan berubah, ada balasan, pengaduan baru masuk (ke Admin OPD tujuan dan Admin Kabupaten), pengaduan diteruskan (ke pelapor), jawaban survei mencapai tonggak tertentu, dan cadangan harian gagal (ke Admin Kabupaten). | `notifications/`, enum `NotificationType` di `apps/api/prisma/schema.prisma` |
| 28 Agu s.d. 7 Okt 2026 | FR-AUTH-01 s.d. FR-AUTH-04, NFR Keamanan (hashing kata sandi) | Tidak ada registrasi mandiri maupun kata sandi. Semua peran masuk lewat SSO Helpdesk Kabupaten Madiun, dan identitas responden (NIK, nomor HP, alamat, jenis kelamin) diambil dari klaim SSO. Sejak 7 Oktober sesi dapat dicabut di sisi server sebelum kedaluwarsa. Jalur masuk lewat akun contoh hanya ada di pengembangan. | `auth/auth.controller.ts`, `auth/sso-identitas.mapper.ts` |
| 4 s.d. 14 Sep 2026 | OQ-3, FR-FILL | Terjawab: mengirim pengaduan tetap wajib masuk, tetapi pelapor dapat memilih anonim. Pada pengaduan anonim, nama, NIK, nomor HP, dan alamat pelapor tidak dikirim kepada admin. Survei dapat diatur boleh diisi tanpa masuk (`izinkan_anonim`), dan jalur itu dijaga captcha Cloudflare Turnstile serta batas laju per survei. | migrasi `20260904010000_add_complaint_is_anonim` dan `20260904020000_add_survey_anonim`, `complaints/complaints.service.ts`, `responses/public-responses.controller.ts` |
| 5 Sep 2026 | §6, §12 (USER) | Satu akun dapat memegang beberapa peran sekaligus (`roles` berupa daftar). Pengguna memilih peran yang sedang dipakai, dan peran itulah yang menentukan hak aksesnya. | migrasi `20260905000000_user_multi_role`, `auth/acting-role.util.ts` |
| 11 dan 15 Sep 2026 | FR-SVY-01, FR-SVY-07 | Begitu survei punya jawaban, periode dan susunan pertanyaannya terkunci; judul dan pengaturan lain masih boleh disunting. Survei yang dihapus masuk Sampah lebih dulu dan masih dapat dipulihkan sebelum dihapus permanen. Sejak 15 September tiap OPD boleh menunjuk paling banyak satu survei utama, yang ditawarkan kepada pelapor sesudah mengirim pengaduan ke OPD itu. | migrasi `20260911090000_sampah_survei` dan `20260915090000_survei_utama_per_opd`, `surveys/survey-scope.util.ts` |
| 14 Sep 2026 | FR-CMP-01 | Satu akun dibatasi 10 pengaduan per hari, dan batasnya dapat diatur lewat `COMPLAINT_DAILY_LIMIT`. | `complaints/complaints.constants.ts` |
| 15 Sep 2026 | §1, §6, OQ-2 | Peran `superuser` dilebur ke `kabupaten` untuk terakhir kalinya, sesudah sempat dipisah kembali pada 20 Agustus. Hanya ada tiga peran: `kabupaten`, `opd`, `responden`. Kotak di awal dokumen menjelaskan riwayatnya. | migrasi `20260915140000_lebur_superuser_ke_kabupaten`, `common/auth/role.util.ts` |
| 23 Sep s.d. 4 Nov 2026 | NFR Privasi Data | Lampiran dan isi pengaduan (uraian, lokasi kejadian, balasan, catatan status) serta NIK, nomor HP, dan alamat pengguna disimpan terenkripsi AES-256-GCM. Nama, email, dan judul pengaduan tetap polos. | `common/crypto/`, `docs/keamanan/enkripsi-at-rest.md` |
| 30 Sep 2026 | NFR Auditabilitas | Log aktivitas disimpan 14 hari (`AUDIT_RETENTION_DAYS=14`, permintaan pengguna) lalu dihapus permanen oleh API sekali sehari pukul 03.00 waktu server. Baris env yang kosong berarti retensi mati dan log disimpan selamanya. Retensi di bawah 7 hari menuntut izin tersurat. Pemangkasan tidak tercatat di log aktivitas itu sendiri, hanya di log aplikasi server. Angka resminya masih menunggu jawaban Diskominfo. | `audit/audit-retensi.service.ts`, `apps/api/.env.example` |
| 1 Okt 2026 (diputuskan 16 Nov 2026) | OQ-4 | Terjawab: verifikasi identitas diserahkan kepada SSO Helpdesk. Aplikasi menyalin NIK dari klaim SSO setiap kali pengguna masuk, menyimpannya terenkripsi, dan tidak memeriksanya sendiri (tanpa pengecekan ke Dukcapil maupun format 16 digit). NIK tidak wajib: bila Helpdesk tidak mengirimnya, pengguna tetap dapat mengisi survei dan mengirim pengaduan. | `auth/sso-identitas.mapper.ts`, migrasi `20261001090000_identitas_pelapor_dari_sso` |
| 6 Okt 2026 | FR-AUTH-06 | Di produksi, peran `opd` hanya dapat diberikan kepada akun ASN menurut klaim SSO. Login mencabut peran itu bila klaim SSO menyatakan OPD-nya berbeda atau akunnya bukan ASN. | `users/boleh-admin-opd.ts`, `auth/sinkron-peran-opd.ts` |
| 8 Okt dan 26 Okt 2026 | FR-SVY-09 | Jenis survei dapat diganti dua arah, selama survei masih draf dan belum dijawab. SKM ke Custom menghapus sembilan unsur. Custom ke SKM (dibuka 26 Oktober) menambahkan U1 sampai U9 di urutan 1 sampai 9 dan menggeser pertanyaan yang ada ke belakang sebagai pertanyaan tambahan yang tidak dihitung IKM. Kalimat "satu arah" pada FR-SVY-09 tidak berlaku lagi. | `surveys/ganti-jenis.util.ts` |
| 8 Okt 2026 | FR-SVY (penyuntingan survei) | Label skala 1 sampai 4 boleh diganti sampai survei ditutup, juga sesudah jawaban masuk, karena jawaban skala menyimpan skor. Opsi pilihan ganda terkunci begitu ada jawaban. | `surveys/survey-scope.util.ts` |
| 4 Nov 2026 | FR-CMP-01, §12 (COMPLAINT) | Pelapor memilih tingkat pengaduan, kabupaten atau kecamatan (kelurahan ikut kecamatan). Tingkat menentukan daftar OPD tujuan dan kategorinya: 21 kategori kabupaten dan 8 kategori kecamatan. Tanggal dan lokasi kejadian wajib diisi. Pelapor yang tidak tahu tujuannya boleh memilih "Lainnya", dan pengaduannya ditangani Admin Kabupaten. | migrasi `20261104090000_tingkat_pengaduan`, `reference/reference.constants.ts`, `complaints/tingkat-pengaduan.util.ts` |
| 4 Nov 2026 | FR-CMP-03, §12 (COMPLAINT) | Status pengaduan lima tahap: Terkirim, Menunggu Verifikasi, Diverifikasi, Sedang Ditindaklanjuti, Selesai. Dua status alternatif: Ditolak (akhir) dan Perlu Perbaikan (dikembalikan Admin ke Menunggu Verifikasi sesudah pelapor melengkapi). Ditolak dan Perlu Perbaikan wajib disertai catatan, dan setiap perpindahan tercatat di riwayat status. Status Diterima dan Diproses dihapus. | migrasi `20261104150000_alur_status_pengaduan`, `complaints/alur-status.util.ts` |
| 5 Nov 2026 | FR-CMP-04, FR-CMP-07 | Admin OPD dapat mengalihkan pengaduan miliknya ke instansi lain yang lebih berwenang. Pengaduan itu berstatus Dialihkan sampai OPD tujuan memverifikasinya. Admin Kabupaten meneruskan pengaduan yang belum bertujuan, jadi perannya tidak lagi hanya memantau. | migrasi `20261105093000_status_dialihkan`, `complaints/complaints.service.ts` (`alihkan`, `forward`) |
| 12 Nov 2026 | NFR Ketersediaan | Cadangan basis data harian dijalankan API sendiri pada jam WIB yang diatur `BACKUP_JAM` (baku pukul 02.00), ke folder `BACKUP_DIR`, dengan retensi `BACKUP_RETENTION_DAYS` (baku 14 hari). Bila gagal, Admin Kabupaten menerima notifikasi. | migrasi `20261112090000_notifikasi_cadangan_gagal`, `apps/api/.env.example` |

Jalur di kolom rujukan relatif terhadap `apps/api/src/`, dan jalur yang tidak diawali `common/` berada di `modules/`. Migrasi ada di `apps/api/prisma/migrations/`.

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
