# Daftar Routes — API & Frontend
## Sistem Survei Kepuasan Masyarakat (SKM) & Pengaduan Masyarakat

| | |
|---|---|
| **Dokumen pendamping** | PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md |
| **Versi** | 1.0 |
| **Tanggal** | 13 Juli 2026 |
| **Cakupan** | Kontrak routes REST API (Nest.js) & routes halaman frontend (Next.js) |

Dokumen ini adalah **rujukan resmi** daftar routes. Semua route API bersifat final dan mengikat sebagai kontrak antara backend dan seluruh klien (web, Android, iOS).

**Konvensi umum:**
- Prefiks API: `/api/v1`
- Autentikasi: `Authorization: Bearer <JWT>`
- Format data: `application/json` (kecuali unggah lampiran: `multipart/form-data`)
- Kode status: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `422` Validation Error

---

# BAGIAN A — ROUTES API (Backend Nest.js)

Kolom **Auth** menandai apakah endpoint memerlukan token. Kolom **Peran** menandai siapa yang berhak.

## A.1 Autentikasi & Akun (`/auth`)

| # | Method | Path | Auth | Peran | Deskripsi |
|---|---|---|:---:|---|---|
| 1 | POST | `/api/v1/auth/register` | ✗ | Publik | Registrasi responden + data profil |
| 2 | POST | `/api/v1/auth/verify` | ✗ | Publik | Verifikasi akun via OTP/tautan email |
| 3 | POST | `/api/v1/auth/login` | ✗ | Publik | Login, mengembalikan access token (JWT) |
| 4 | POST | `/api/v1/auth/refresh` | ✗ | Publik | Perbarui access token via refresh token |
| 5 | POST | `/api/v1/auth/logout` | ✓ | Semua | Cabut sesi/refresh token |
| 6 | POST | `/api/v1/auth/forgot-password` | ✗ | Publik | Kirim tautan reset kata sandi |
| 7 | POST | `/api/v1/auth/reset-password` | ✗ | Publik | Setel ulang kata sandi dengan token |
| 8 | GET | `/api/v1/auth/me` | ✓ | Semua | Ambil data pengguna aktif |
| 9 | PATCH | `/api/v1/auth/profile` | ✓ | Semua | Ubah profil / data diri |
| 10 | PATCH | `/api/v1/auth/change-password` | ✓ | Semua | Ganti kata sandi |

## A.2 Manajemen OPD (`/opd`)

| # | Method | Path | Auth | Peran | Deskripsi |
|---|---|---|:---:|---|---|
| 11 | GET | `/api/v1/opd` | ✓ | Kabupaten | Daftar seluruh OPD |
| 12 | POST | `/api/v1/opd` | ✓ | Kabupaten | Tambah OPD |
| 13 | GET | `/api/v1/opd/:id` | ✓ | Kabupaten, OPD | Detail OPD |
| 14 | PATCH | `/api/v1/opd/:id` | ✓ | Kabupaten | Ubah data OPD |
| 15 | PATCH | `/api/v1/opd/:id/status` | ✓ | Kabupaten | Aktif/nonaktifkan OPD |

## A.3 Manajemen Akun Admin (`/users`)

| # | Method | Path | Auth | Peran | Deskripsi |
|---|---|---|:---:|---|---|
| 16 | GET | `/api/v1/users` | ✓ | Kabupaten | Daftar akun admin (filter role/OPD) |
| 17 | POST | `/api/v1/users` | ✓ | Kabupaten | Buat akun Admin OPD / Kabupaten |
| 18 | GET | `/api/v1/users/:id` | ✓ | Kabupaten | Detail akun |
| 19 | PATCH | `/api/v1/users/:id` | ✓ | Kabupaten | Ubah akun (nama, OPD terkait) |
| 20 | PATCH | `/api/v1/users/:id/status` | ✓ | Kabupaten | Aktif/nonaktifkan akun |

## A.4 Survei & Pertanyaan (`/surveys`, `/questions`)

| # | Method | Path | Auth | Peran | Deskripsi |
|---|---|---|:---:|---|---|
| 21 | GET | `/api/v1/surveys` | ✓ | OPD, Kabupaten | Daftar survei (OPD: milik sendiri) |
| 22 | POST | `/api/v1/surveys` | ✓ | OPD | Buat paket survei |
| 23 | GET | `/api/v1/surveys/:id` | ✓ | OPD, Kabupaten | Detail survei |
| 24 | PATCH | `/api/v1/surveys/:id` | ✓ | OPD | Ubah survei |
| 25 | DELETE | `/api/v1/surveys/:id` | ✓ | OPD | Hapus survei (draft) |
| 26 | PATCH | `/api/v1/surveys/:id/status` | ✓ | OPD | Publikasikan / tutup periode |
| 27 | POST | `/api/v1/surveys/:id/duplicate` | ✓ | OPD | Salin survei periode sebelumnya |
| 28 | GET | `/api/v1/surveys/:id/questions` | ✓ | OPD | Daftar pertanyaan survei |
| 29 | POST | `/api/v1/surveys/:id/questions` | ✓ | OPD | Tambah pertanyaan (baku/kustom) |
| 30 | POST | `/api/v1/surveys/:id/questions/template` | ✓ | OPD | Terapkan template 9 unsur SKM |
| 31 | PATCH | `/api/v1/questions/:id` | ✓ | OPD | Ubah pertanyaan |
| 32 | DELETE | `/api/v1/questions/:id` | ✓ | OPD | Hapus pertanyaan |
| 33 | PATCH | `/api/v1/surveys/:id/questions/reorder` | ✓ | OPD | Ubah urutan pertanyaan |

## A.5 Pengisian, Hasil & IKM

| # | Method | Path | Auth | Peran | Deskripsi |
|---|---|---|:---:|---|---|
| 34 | GET | `/api/v1/surveys/active` | ✓ | Responden | Daftar survei yang sedang aktif |
| 35 | GET | `/api/v1/surveys/:id/fill` | ✓ | Responden | Ambil struktur kuesioner untuk diisi |
| 36 | POST | `/api/v1/surveys/:id/responses` | ✓ | Responden | Kirim jawaban survei |
| 37 | GET | `/api/v1/surveys/:id/responses` | ✓ | OPD | Daftar respons yang masuk |
| 38 | GET | `/api/v1/surveys/:id/results` | ✓ | OPD, Kabupaten | Hasil: NRR per unsur + nilai IKM + mutu |
| 39 | GET | `/api/v1/surveys/:id/results/export` | ✓ | OPD, Kabupaten | Ekspor laporan (PDF/Excel/CSV) |
| 40 | GET | `/api/v1/dashboard/ikm` | ✓ | Kabupaten | Agregat & perbandingan IKM semua OPD |

## A.6 Pengaduan (`/complaints`)

| # | Method | Path | Auth | Peran | Deskripsi |
|---|---|---|:---:|---|---|
| 41 | POST | `/api/v1/complaints` | ✓ | Responden | Ajukan pengaduan (dapat nomor tiket) |
| 42 | GET | `/api/v1/complaints` | ✓ | Semua¹ | Daftar pengaduan (terfilter kepemilikan) |
| 43 | GET | `/api/v1/complaints/:ticketNo` | ✓ | Semua¹ | Detail & lacak status |
| 44 | PATCH | `/api/v1/complaints/:id/status` | ✓ | OPD | Ubah status (diproses/selesai/ditolak) |
| 45 | GET | `/api/v1/complaints/:id/replies` | ✓ | Semua¹ | Riwayat tanggapan pada tiket |
| 46 | POST | `/api/v1/complaints/:id/replies` | ✓ | OPD, Responden | Tambah tanggapan |

## A.7 Audit & Referensi

| # | Method | Path | Auth | Peran | Deskripsi |
|---|---|---|:---:|---|---|
| 47 | GET | `/api/v1/audit-logs` | ✓ | Kabupaten | Log aktivitas admin |
| 48 | GET | `/api/v1/ref/unsur` | ✓ | OPD | Daftar 9 unsur baku SKM (template) |
| 49 | GET | `/api/v1/ref/complaint-categories` | ✓ | Semua | Daftar kategori pengaduan |

> ¹ **"Semua"** pada modul pengaduan tetap dibatasi kepemilikan data: responden hanya melihat pengaduannya sendiri, Admin OPD hanya pengaduan OPD-nya, Admin Kabupaten memantau seluruhnya (read-only).

---

# BAGIAN B — ROUTES FRONTEND (Next.js App Router)

Menggunakan struktur *App Router* dengan **route groups** untuk memisahkan area berdasarkan peran. Route bertanda 🔒 memerlukan sesi login; route dengan peran tertentu dilindungi *middleware* RBAC.

## B.1 Area Publik & Responden `(public)`

| # | Route | Auth | Halaman |
|---|---|:---:|---|
| 1 | `/` | ✗ | Beranda / landing |
| 2 | `/login` | ✗ | Masuk |
| 3 | `/register` | ✗ | Registrasi responden |
| 4 | `/verify` | ✗ | Verifikasi akun |
| 5 | `/forgot-password` | ✗ | Lupa kata sandi |
| 6 | `/reset-password` | ✗ | Setel ulang kata sandi |
| 7 | `/surveys` | 🔒 | Daftar survei aktif |
| 8 | `/surveys/[id]` | 🔒 | Isi kuesioner survei |
| 9 | `/surveys/[id]/selesai` | 🔒 | Konfirmasi survei terkirim |
| 10 | `/pengaduan` | 🔒 | Daftar pengaduan saya |
| 11 | `/pengaduan/baru` | 🔒 | Form ajukan pengaduan |
| 12 | `/pengaduan/[ticketNo]` | 🔒 | Detail & lacak pengaduan |
| 13 | `/profil` | 🔒 | Profil & data diri |

## B.2 Area Admin OPD `(opd)` — prefiks `/opd`

| # | Route | Auth | Halaman |
|---|---|:---:|---|
| 14 | `/opd/dashboard` | 🔒 OPD | Ringkasan OPD (survei aktif, pengaduan terbuka) |
| 15 | `/opd/survei` | 🔒 OPD | Daftar survei OPD |
| 16 | `/opd/survei/baru` | 🔒 OPD | Buat paket survei |
| 17 | `/opd/survei/[id]` | 🔒 OPD | Detail & kelola survei |
| 18 | `/opd/survei/[id]/pertanyaan` | 🔒 OPD | Kelola pertanyaan (template + kustom) |
| 19 | `/opd/survei/[id]/hasil` | 🔒 OPD | Hasil survei + nilai IKM |
| 20 | `/opd/pengaduan` | 🔒 OPD | Daftar pengaduan OPD |
| 21 | `/opd/pengaduan/[ticketNo]` | 🔒 OPD | Tangani & tanggapi pengaduan |

## B.3 Area Admin Kabupaten `(kabupaten)` — prefiks `/kabupaten`

| # | Route | Auth | Halaman |
|---|---|:---:|---|
| 22 | `/kabupaten/dashboard` | 🔒 Kab | Dashboard agregat IKM semua OPD |
| 23 | `/kabupaten/opd` | 🔒 Kab | Kelola daftar OPD |
| 24 | `/kabupaten/opd/baru` | 🔒 Kab | Tambah OPD |
| 25 | `/kabupaten/opd/[id]` | 🔒 Kab | Detail & ubah OPD |
| 26 | `/kabupaten/admin` | 🔒 Kab | Kelola akun Admin OPD |
| 27 | `/kabupaten/admin/baru` | 🔒 Kab | Buat akun Admin OPD |
| 28 | `/kabupaten/hasil-survei` | 🔒 Kab | Hasil survei seluruh OPD (perbandingan) |
| 29 | `/kabupaten/pengaduan` | 🔒 Kab | Pantau seluruh pengaduan lintas OPD |
| 30 | `/kabupaten/audit` | 🔒 Kab | Log aktivitas admin |

## B.4 Pemetaan Route Frontend → Endpoint API (Contoh Kunci)

| Route Frontend | Endpoint API yang dipanggil |
|---|---|
| `/register` | `POST /auth/register` |
| `/login` | `POST /auth/login` |
| `/surveys` | `GET /surveys/active` |
| `/surveys/[id]` | `GET /surveys/:id/fill` → `POST /surveys/:id/responses` |
| `/pengaduan/baru` | `POST /complaints` |
| `/pengaduan/[ticketNo]` | `GET /complaints/:ticketNo`, `POST /complaints/:id/replies` |
| `/opd/survei/baru` | `POST /surveys` |
| `/opd/survei/[id]/pertanyaan` | `GET/POST /surveys/:id/questions`, `.../template` |
| `/opd/survei/[id]/hasil` | `GET /surveys/:id/results` |
| `/opd/pengaduan/[ticketNo]` | `GET /complaints/:ticketNo`, `PATCH /complaints/:id/status` |
| `/kabupaten/dashboard` | `GET /dashboard/ikm` |
| `/kabupaten/opd` | `GET/POST /opd` |
| `/kabupaten/admin` | `GET/POST /users` |

---

## Catatan Implementasi

- **Proteksi route frontend** ditangani lewat *middleware* Next.js yang memeriksa keberadaan & peran pada token sebelum mengizinkan akses ke grup `(opd)` dan `(kabupaten)`.
- **Konsistensi penamaan:** route API memakai bahasa Inggris (konvensi REST), sedangkan route frontend memakai Bahasa Indonesia agar ramah bagi pengguna akhir. Keduanya boleh berbeda karena frontend memanggil API lewat *service layer*, bukan pemetaan 1:1 URL.
- **Dokumentasi hidup:** implementasi API wajib dilengkapi Swagger di `/api/docs` sebagai kontrak yang selalu sinkron dengan kode.
