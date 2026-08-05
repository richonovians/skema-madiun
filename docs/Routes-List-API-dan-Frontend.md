# Daftar Routes — API & Frontend
## Sistem Survei Kepuasan Masyarakat (SKM) & Pengaduan Masyarakat

| | |
|---|---|
| **Dokumen pendamping** | PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md, Rencana-Integrasi-Frontend-Backend.md |
| **Versi** | 2.0 — disinkronkan dengan kode sungguhan (INT-26) |
| **Tanggal** | 5 Agustus 2026 (v1.0: 13 Juli 2026) |
| **Cakupan** | Kontrak routes REST API (Nest.js) & routes halaman frontend (Next.js) sesuai implementasi saat ini |

Dokumen ini adalah **rujukan resmi** daftar routes. Versi 1.0 ditulis di awal perencanaan dan sejak itu **arsitektur berubah signifikan** (autentikasi lokal digantikan SSO Helpdesk, OPD jadi cache read-only) — versi ini menggantikannya dengan apa yang sungguhan berjalan di kode. Swagger (`/api/docs`) tetap kontrak paling hidup untuk detail request/response; dokumen ini untuk peta cepat.

**Konvensi umum:**
- Prefiks API: `/api/v1`
- Autentikasi: sesi lokal berbasis JWT (`Authorization: Bearer <token>`), diterbitkan sistem sendiri setelah login SSO Helpdesk (OAuth2) — **bukan** JWT dari Helpdesk langsung. Di lingkungan non-produksi, `POST /auth/dev-login` menerbitkan token yang sama tanpa alur SSO sungguhan (404 di produksi).
- Format data: `application/json` (kecuali unggah lampiran pengaduan: `multipart/form-data`; unduhan ekspor hasil IKM: file biner mentah)
- **Envelope respons sukses baku**: `{ success, statusCode, message, data, meta }`. Endpoint list menyisipkan `meta.pagination = { total, page, limit, totalPages }`. Endpoint unduhan (`/results/export`) mengembalikan file mentah, bukan envelope.
- Kode status: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict
- Peran: `responden`, `opd`, `kabupaten` (= superuser, digabung 2026-08-05 — bypass seluruh `@Roles`, melampaui kolom Peran di tabel bawah, tidak dicantumkan berulang)

---

# BAGIAN A — ROUTES API (Backend Nest.js)

Kolom **Auth** menandai apakah endpoint memerlukan token. Kolom **Peran** menandai siapa yang berhak (di luar `kabupaten`/superuser, yang selalu lolos).

## A.0 Health (publik)

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/health` | ✗ | Publik | Cek aplikasi berjalan |

## A.1 Autentikasi & Akun (`/auth`)

**TIDAK ADA autentikasi lokal** (password/register/verify/forgot-reset-password) — login sepenuhnya lewat SSO Helpdesk (OAuth2 Authorization Code + PKCE). Modul SSO sungguhan (redirect ke Helpdesk, tukar code→token) belum diimplementasikan (menunggu kredensial Helpdesk); `dev-login` adalah pengganti sementara non-produksi yang menerbitkan sesi lokal yang SAMA persis dengan yang nanti diterbitkan setelah SSO sungguhan aktif.

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| POST | `/api/v1/auth/dev-login` | ✗ | Publik (404 di produksi) | **Non-produksi saja.** Terbitkan sesi lokal by `identifier` (email/ssoSubject) tanpa alur SSO sungguhan |
| POST | `/api/v1/auth/logout` | ✓ | Semua | Cabut sesi (stateless — hapus token sisi klien) |
| GET | `/api/v1/auth/me` | ✓ | Semua | Ambil data pengguna aktif |
| PATCH | `/api/v1/auth/profile` | ✓ | Semua | Ubah profil / data diri |

## A.2 Manajemen OPD (`/opd`) — READ-ONLY, cache dari Helpdesk

**Tidak ada create/update/delete OPD lokal** (keputusan arsitektur terkunci, D10) — Helpdesk adalah *source of truth* master data OPD, SKM cuma menyimpan cache tersinkron.

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/opd` | ✓ | Semua | Daftar OPD (data direktori tak sensitif — Responden butuh ini utk pilih tujuan pengaduan) |
| GET | `/api/v1/opd/:id` | ✓ | Kabupaten, OPD (miliknya) | Detail OPD |
| POST | `/api/v1/opd/sync` | ✓ | Kabupaten | Sinkronkan dari Helpdesk (upsert by `externalId`) — sumber Helpdesk sungguhan (`HelpdeskOpdClient`) belum dibangun, masih pakai `StubOpdSource` (3 fixture) |

## A.3 Manajemen Akun Admin (`/users`)

Seluruh route di bawah dibatasi Admin Kabupaten (level controller).

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/users` | ✓ | Kabupaten | Daftar akun admin (filter role/OPD) |
| POST | `/api/v1/users` | ✓ | Kabupaten | Buat akun Admin OPD / Kabupaten |
| GET | `/api/v1/users/:id` | ✓ | Kabupaten | Detail akun |
| PATCH | `/api/v1/users/:id` | ✓ | Kabupaten | Ubah akun (nama, OPD terkait) |
| PATCH | `/api/v1/users/:id/status` | ✓ | Kabupaten | Aktif/nonaktifkan akun |

## A.4 Survei & Pertanyaan (`/surveys`, `/questions`)

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/surveys` | ✓ | OPD, Kabupaten | Daftar survei (OPD: milik sendiri; Kabupaten: semua) |
| POST | `/api/v1/surveys` | ✓ | OPD | Buat paket survei (draft) |
| GET | `/api/v1/surveys/active` | ✓ | Responden | Daftar survei berstatus aktif (harus dideklarasikan sebelum `:id` — lihat catatan routing Express 5) |
| GET | `/api/v1/surveys/:id` | ✓ | OPD, Kabupaten | Detail survei |
| PATCH | `/api/v1/surveys/:id` | ✓ | OPD | Ubah survei (judul/periode, hanya saat draft) |
| DELETE | `/api/v1/surveys/:id` | ✓ | OPD | Hapus survei (draft) |
| PATCH | `/api/v1/surveys/:id/status` | ✓ | OPD | Transisi status: draft→aktif→ditutup (satu arah, tak bisa mundur) |
| POST | `/api/v1/surveys/:id/duplicate` | ✓ | OPD | Salin survei (jadi draft baru) |
| GET | `/api/v1/surveys/:id/questions` | ✓ | OPD | Daftar pertanyaan survei |
| POST | `/api/v1/surveys/:id/questions` | ✓ | OPD | Tambah pertanyaan kustom (survei harus draft) |
| POST | `/api/v1/surveys/:id/questions/template` | ✓ | OPD | Terapkan template 9 unsur baku SKM |
| PATCH | `/api/v1/surveys/:id/questions/reorder` | ✓ | OPD | Ubah urutan pertanyaan |
| PATCH | `/api/v1/questions/:id` | ✓ | OPD | Ubah teks pertanyaan (tipe tak bisa diubah) |
| DELETE | `/api/v1/questions/:id` | ✓ | OPD | Hapus pertanyaan |

## A.5 Pengisian, Hasil & IKM

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/surveys/:id/fill` | ✓ | Responden | Ambil struktur kuesioner (survei harus aktif) |
| POST | `/api/v1/surveys/:id/responses` | ✓ | Responden | Kirim jawaban (anonim — tak menyimpan identitas pengisi; anti-duplikat via `dedupeUserId`) |
| GET | `/api/v1/surveys/:id/responses` | ✓ | OPD, Kabupaten | Daftar respons masuk (jawaban lengkap per respons, tanpa identitas) |
| GET | `/api/v1/surveys/:id/results` | ✓ | OPD, Kabupaten | Hasil live-compute: NRR per unsur + nilai IKM + mutu |
| GET | `/api/v1/surveys/:id/results/export?format=` | ✓ | OPD, Kabupaten | Ekspor laporan (`csv`\|`excel`\|`pdf`) — file biner mentah, bukan envelope |
| GET | `/api/v1/dashboard/ikm` | ✓ | Kabupaten | Agregat & perbandingan IKM seluruh OPD (dari snapshot `ikm_results`, bukan live-compute) |

## A.6 Pengaduan (`/complaints`)

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| POST | `/api/v1/complaints` | ✓ | Responden | Ajukan pengaduan (multipart, lampiran opsional maks 5 file @5MB) — dapat nomor tiket |
| GET | `/api/v1/complaints` | ✓ | Semua¹ | Daftar pengaduan (terfilter kepemilikan) |
| GET | `/api/v1/complaints/:ticketNo` | ✓ | Semua¹ | Detail & lacak status via nomor tiket publik |
| PATCH | `/api/v1/complaints/:id/status` | ✓ | OPD (pemilik) | Ubah status: diterima→diproses→selesai, atau →ditolak (catatan wajib bila ditolak) |
| GET | `/api/v1/complaints/:id/replies` | ✓ | Semua¹ | Riwayat tanggapan pada tiket |
| POST | `/api/v1/complaints/:id/replies` | ✓ | OPD (pemilik), Responden (pengaju) | Tambah tanggapan |

## A.7 Audit & Referensi

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/audit-logs` | ✓ | Kabupaten | Daftar log aktivitas admin (filter `entitas`/`actorId`) |
| GET | `/api/v1/audit-logs/:id` | ✓ | Kabupaten | Detail satu log aktivitas |
| GET | `/api/v1/ref/unsur` | ✓ | OPD, Kabupaten | Daftar 9 unsur baku SKM (template PermenPANRB 14/2017) |
| GET | `/api/v1/ref/complaint-categories` | ✓ | Semua | Daftar 7 kategori baku pengaduan |

> ¹ **"Semua"** pada modul pengaduan tetap dibatasi kepemilikan data (ditegakkan di service, bukan `@Roles`): Responden hanya melihat pengaduannya sendiri, Admin OPD hanya pengaduan OPD-nya, Admin Kabupaten memantau seluruhnya (read-only — tak bisa ubah status/balas).

**Belum ada di backend** (dicek eksplisit, bukan sekadar belum terdaftar): `GET /dashboard/opd` (ringkasan Admin OPD — blocked D3, keputusan bisnis avgSlaDays/completionRate belum ada), endpoint statistik publik untuk `/statistics` (blocked D2/D6), agregasi tren bulanan (blocked D5), endpoint detail-per-respons survei (sengaja tak dibangun — daftar respons sudah kembalikan jawaban lengkap).

---

# BAGIAN B — ROUTES FRONTEND (Next.js App Router)

Struktur *route groups* App Router: `(respondent)` dan `(builder)` di URL nyata **tidak muncul** (hanya pengelompokan folder). Proteksi route dilakukan `apps/web/src/proxy.js` (dulu `middleware.js`, Next 16 mengganti nama) — cek cookie `token`, redirect ke `/` bila kosong, **cakupan matcher HANYA `/admin-kab/:path*` dan `/admin-opd/:path*`**; halaman Responden (`/surveys`, `/complaints`, `/profile`, `/dashboard`) tidak diproteksi di level proxy.

## B.1 Area Publik & Responden

| Route | Auth | Halaman | Status wiring |
|---|:---:|---|---|
| `/` | ✗ | Landing + form login (SSO Helpdesk / dev-login) | ✅ |
| `/about` | ✗ | Tentang sistem | ✅ (statis) |
| `/statistics` | ✗ | Statistik publik | ❌ dummy (INT-25, blocked D2/D6/D14) |
| `/dashboard` | 🔒 | Dashboard Responden | ❌ dummy (belum ada tiket) |
| `/profile` | 🔒 | Profil & data diri | ✅ (INT-16) |
| `/surveys` | 🔒 | Daftar survei aktif | ✅ (INT-17) |
| `/surveys/[id]` | 🔒 | Isi kuesioner survei | ✅ (INT-17) |
| `/complaints` | 🔒 | Daftar pengaduan saya | ✅ (INT-18) |
| `/complaints/new` | 🔒 | Form ajukan pengaduan | ✅ (INT-18) |
| `/complaints/[id]` | 🔒 | Detail & lacak pengaduan (param = ticketNo) | ✅ (INT-18) |
| `/complaints/success` | 🔒 | Konfirmasi pengaduan terkirim | ✅ |

## B.2 Area Admin OPD — prefiks `/admin-opd`

| Route | Auth | Halaman | Status wiring |
|---|:---:|---|---|
| `/admin-opd/dashboard` | 🔒 OPD | Ringkasan OPD | ❌ dummy (INT-23, DITUNDA — blocked D3/D4) |
| `/admin-opd/surveys` | 🔒 OPD | Daftar survei OPD | ✅ (INT-19) |
| `/admin-opd/surveys/builder/[id]` | 🔒 OPD | Builder pertanyaan (template + kustom) | ✅ (INT-19) |
| `/admin-opd/surveys/[id]/responses` | 🔒 OPD | Daftar respons masuk (anonim) | ✅ (INT-38) |
| `/admin-opd/surveys/[id]/responses/[responseId]` | 🔒 OPD | Detail satu respons | ✅ (INT-38) |
| `/admin-opd/analytics` | 🔒 OPD | Analisis SKM (hasil+ekspor, survei terpilih) & Analisis Pengaduan | ✅ tab SKM (INT-21+32); ❌ tab Pengaduan (blocked Fase 3) |
| `/admin-opd/complaints` | 🔒 OPD | Daftar pengaduan OPD | ✅ (INT-20) |
| `/admin-opd/complaints/[id]` | 🔒 OPD | Tangani & tanggapi pengaduan (param = ticketNo) | ✅ (INT-20) |

## B.3 Area Admin Kabupaten — prefiks `/admin-kab`

| Route | Auth | Halaman | Status wiring |
|---|:---:|---|---|
| `/admin-kab/dashboard` | 🔒 Kab | Dashboard agregat IKM semua OPD | ❌ dummy (INT-24, blocked D3 — sama spt INT-23) |
| `/admin-kab/opd` | 🔒 Kab | Daftar OPD + sinkronkan dari Helpdesk | ✅ (INT-22) |
| `/admin-kab/users` | 🔒 Kab | Kelola akun Admin OPD/Kabupaten | ✅ (INT-22) |
| `/admin-kab/users/create` | 🔒 Kab | Buat akun admin baru | ✅ (INT-22) |
| `/admin-kab/complaints` | 🔒 Kab | Pantau seluruh pengaduan lintas OPD (read-only) | ✅ (INT-33) |
| `/admin-kab/complaints/[id]` | 🔒 Kab | Detail pengaduan (read-only, param = ticketNo) | ✅ (INT-33) |
| `/admin-kab/audit-logs` | 🔒 Kab | Log aktivitas admin | ✅ (INT-34) |
| `/admin-kab/audit-logs/[id]` | 🔒 Kab | Detail satu log aktivitas | ✅ (INT-34) |

## B.4 Pemetaan Route Frontend → Endpoint API (halaman terwiring)

| Route Frontend | Endpoint API yang dipanggil |
|---|---|
| `/` | `POST /auth/dev-login`, `GET /auth/me` |
| `/profile` | `GET /auth/me`, `PATCH /auth/profile` |
| `/surveys` | `GET /surveys/active` |
| `/surveys/[id]` | `GET /surveys/:id/fill` → `POST /surveys/:id/responses` |
| `/complaints/new` | `GET /opd`, `GET /ref/complaint-categories` → `POST /complaints` |
| `/complaints/[id]` | `GET /complaints/:ticketNo`, `GET/POST /complaints/:id/replies` |
| `/admin-opd/surveys` | `GET /surveys`, `PATCH /surveys/:id/status`, `POST /surveys/:id/duplicate`, `DELETE /surveys/:id` |
| `/admin-opd/surveys/builder/[id]` | `GET/PATCH /surveys/:id`, `GET/POST /surveys/:id/questions`, `.../template`, `.../reorder`, `PATCH/DELETE /questions/:id`, `PATCH /surveys/:id/status` |
| `/admin-opd/surveys/[id]/responses(/[responseId])` | `GET /surveys/:id`, `GET /surveys/:id/questions`, `GET /surveys/:id/responses` |
| `/admin-opd/analytics` | `GET /surveys`, `GET /surveys/:id/results`, `GET /surveys/:id/results/export` |
| `/admin-opd/complaints(/[id])` | `GET /complaints`, `GET /complaints/:ticketNo`, `PATCH /complaints/:id/status`, `GET/POST /complaints/:id/replies` |
| `/admin-kab/opd` | `GET /opd`, `POST /opd/sync` |
| `/admin-kab/users(/create)` | `GET/POST /users`, `PATCH /users/:id/status` |
| `/admin-kab/complaints(/[id])` | `GET /complaints`, `GET /complaints/:ticketNo`, `GET /complaints/:id/replies` |
| `/admin-kab/audit-logs(/[id])` | `GET /audit-logs`, `GET /audit-logs/:id` |

---

## Catatan Implementasi

- **Proteksi route frontend**: `apps/web/src/proxy.js` (Next.js 16, bukan lagi `middleware.js`) cek cookie `token` untuk `/admin-kab/*` dan `/admin-opd/*` saja. Halaman Responden mengandalkan proteksi di level komponen/service (401 dari API), bukan proxy.
- **Konsistensi penamaan:** route API memakai bahasa Inggris (konvensi REST), sedangkan route frontend memakai Bahasa Indonesia untuk *label halaman* tapi path URL bahasa Inggris (`/complaints`, `/surveys`, bukan `/pengaduan`, `/survei` seperti draf v1.0) — frontend memanggil API lewat *service layer* (`features/*/services/*.api.js`), bukan pemetaan 1:1 URL.
- **`ticketNo` vs `id`:** pengaduan pakai `ticketNo` (format `PGD{YYYYMMDD}{4 acak}`) sebagai identifier di route/URL publik; `id` numerik tetap primary key internal, dipakai untuk aksi admin (`PATCH .../:id/status`, `POST .../:id/replies`).
- **Dokumentasi hidup:** implementasi API dilengkapi Swagger di `/api/docs` sebagai kontrak yang selalu sinkron dengan kode — rujuk ke sana untuk skema request/response detail per endpoint (DTO, entity, enum).
- Lihat `docs/Rencana-Integrasi-Frontend-Backend.md` untuk daftar keputusan bisnis yang masih menunggu (D12/D14) dan alasan tiap halaman "❌ dummy" di atas belum bisa diwiring.
