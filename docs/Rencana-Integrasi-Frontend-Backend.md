# Rencana Integrasi Frontend ↔ Backend

| | |
|---|---|
| **Status dokumen** | Analisis + roadmap (belum dieksekusi) |
| **Tanggal analisis** | 2026-07-30 |
| **Kondisi backend** | Seluruh roadmap MVP + Fase 2 + AUD-1 + QST-3 selesai; 34 endpoint aktif; unit 19 suite/145 test, e2e 12 suite/103 test hijau |
| **Kondisi frontend** | 20 halaman UI jadi secara tampilan, tetapi **100% memakai data dummy** (belum ada satu pun panggilan API nyata) dan **cakupannya belum menutup seluruh fitur backend** (lihat §2.8) |
| **Dokumen terkait** | PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md · Routes-List-API-dan-Frontend.md · apps/web/AGENTS.md |

---

## 1. Ringkasan Temuan

Backend dan frontend sama-sama "selesai" secara terpisah, tetapi **belum pernah saling berbicara**. Integrasi bukan sekadar mengganti dummy dengan `fetch` — ada 5 kelas pekerjaan yang harus dibereskan lebih dulu, satu di antaranya adalah *blocker* mutlak.

| # | Kelas pekerjaan | Berat | Sifat |
|---|---|---|---|
| A | **Autentikasi** — belum ada mekanisme login yang dapat dipakai frontend | 🔴 Blocker | Backend |
| B | Konfigurasi & klien HTTP (env, baseURL, envelope) | 🟢 Ringan | Frontend |
| C | Ketidaksesuaian bentuk data (nama field, enum, tipe id) | 🟡 Sedang | Frontend (adapter) |
| D | Data turunan/relasi yang belum disediakan backend (jumlah, nama relasi) | 🟡 Sedang | Backend |
| E | **Endpoint agregat dashboard/statistik yang sama sekali belum ada** | 🔴 Berat | Backend |
| F | **Halaman/aksi yang belum ada** → beberapa fitur backend tak terjangkau UI | 🟡 Sedang | Frontend |
| G | **Konflik model data** dari pekerjaan frontend terbaru (kategori, kecamatan, anonim) | 🔴 Blocker pengaduan | Perlu keputusan bisnis |

Ditambah 2 utang non-teknis: **dokumen Routes-List sudah tidak sesuai kenyataan**, dan **service layer frontend masih kosong** padahal `AGENTS.md` mewajibkannya.

> **Catatan penjadwalan.** Kelas **F** adalah satu-satunya pekerjaan yang **tidak bergantung pada autentikasi**, sehingga dapat dikerjakan tim frontend **paralel** selagi backend membereskan blocker A. Ini jalur tercepat memanfaatkan dua sisi sekaligus.
>
> **Kelas G ditemukan setelah analisis awal** (empat commit frontend terbaru). Sifatnya berbeda dari yang lain: bukan pekerjaan teknis yang tinggal dieksekusi, melainkan **kebutuhan bisnis yang perlu diklarifikasi lebih dulu** (§2.9, D12–D14). Karena berpotensi menuntut migrasi skema, sebaiknya diajukan **sedini mungkin** — bila jawabannya baru datang setelah Fase 4 berjalan, biaya perbaikannya jauh lebih besar.

---

## 2. Analisis Detail

### 2.1 🔴 Blocker: tidak ada jalur autentikasi yang bisa dipakai

Ini satu-satunya hal yang membuat integrasi **tidak bisa dimulai** tanpa dibereskan lebih dulu.

**Kondisi backend:** `StubAuthProvider` mengidentifikasi pengguna lewat *header dev* (`x-dev-role`, `x-dev-user-id`, `x-dev-opd-id`, `x-dev-sso-subject`). Tidak ada endpoint login, tidak ada penerbitan token/sesi.

**Kondisi frontend:** `src/services/api.js` sudah menyiapkan interceptor yang mengirim `Authorization: Bearer ${localStorage.getItem('token')}` — tetapi tidak ada apa pun yang pernah mengisi `token` itu. `SSOLoginButton.jsx` hanya menulis penanda palsu `localStorage.setItem('sso_logged_in', 'true')` lalu me-reload halaman. `AuthCallbackLoader.jsx` **kosong (0 byte)**.

Jadi kedua sisi sudah "menyiapkan tempat" untuk auth, tetapi dengan asumsi yang tidak bertemu, dan tidak ada implementasi di tengahnya.

**Kenapa tidak bisa menunggu SSO-1?** SSO-1 (SsoAuthProvider OIDC nyata) *blocked* menunggu spesifikasi resmi dari Helpdesk — bisa berminggu-minggu. Menunggu berarti integrasi frontend berhenti total.

**Jalan keluar — dan ini bukan pekerjaan yang terbuang:** PRD Bab keputusan arsitektur #2 sudah menetapkan bahwa setelah callback SSO, **SKM menerbitkan sesi lokalnya sendiri** (cookie httpOnly / JWT sesi). Penerbitan sesi lokal itu **tidak bergantung pada spesifikasi Helpdesk sama sekali** — hanya *sumber identitas awal*-nya yang bergantung. Artinya kita bisa membangun sekarang:

1. Modul sesi lokal (terbitkan + verifikasi JWT sesi) — komponen yang memang dibutuhkan SSO-1 nanti.
2. `SessionAuthProvider` sebagai `AuthProvider` kedua di seam yang sudah ada — memverifikasi JWT sesi.
3. `POST /auth/dev-login` **khusus non-produksi** (dipagari `NODE_ENV`) yang menerbitkan sesi untuk pengguna seed tertentu.

Saat spesifikasi Helpdesk tiba, yang ditambahkan hanya jalur callback OAuth2 → tukar code → ambil profil → **terbitkan sesi lokal lewat modul yang sama**. Frontend tidak berubah sedikit pun, karena sejak awal sudah memakai `Authorization: Bearer` + sesi lokal. `/auth/dev-login` cukup dimatikan di produksi.

> **Konsekuensi jika memilih jalur lain** (misal frontend mengirim header dev langsung): frontend harus menulis kode auth yang nanti dibuang, dan header dev harus bocor ke kode produksi. Tidak direkomendasikan.

### 2.2 Konfigurasi & klien HTTP

| Temuan | Detail | Dampak |
|---|---|---|
| `baseURL` salah | Default `http://localhost:3000/api/v1` — itu port **frontend**. API ada di **3001** | Semua request gagal/nyasar |
| Tidak ada `.env.local`/`.env.example` di `apps/web` | `NEXT_PUBLIC_API_URL` tak pernah diset | Selalu jatuh ke default yang salah |
| Envelope belum ditangani | Backend membungkus semua respons: `{ success, statusCode, message, data, meta }`; pagination di `meta.pagination` | Setiap pemanggil harus menulis `res.data.data` — mudah lupa, mudah salah |
| Error belum dinormalisasi | Backend mengirim `{ success:false, message, error:{ code, details } }`; validasi 400 menaruh daftar pesan di `error.details` | UI tidak punya cara seragam menampilkan pesan gagal |
| `package-lock.json` muncul di `apps/web` | Proyek memakai **pnpm workspaces**; lockfile npm ini sisa `npm install` lokal | Risiko dependency drift & lockfile ganda |

Kabar baik: **CORS di backend sudah siap** (`CORS_ORIGIN` default `http://localhost:3000`, `credentials: true`) — tidak perlu perubahan untuk dev.

### 2.3 Ketidaksesuaian bentuk data

Frontend memakai bahasa Inggris + camelCase + enum HURUF BESAR; backend memakai Indonesia + enum huruf kecil (mengikuti skema Prisma/PostgreSQL). Ini **bukan bug** — keduanya konsisten di dalam dirinya sendiri — tetapi butuh lapisan penerjemah.

**Survey**

| Frontend | Backend | Catatan |
|---|---|---|
| `id: '1'` (string) | `id: 1` (number) | Tipe berbeda |
| `title` | `judul` | |
| `status: 'AKTIF'/'DRAF'/'DITUTUP'` | `status: 'aktif'/'draft'/'ditutup'` | Beda kapitalisasi & ejaan (`DRAF` vs `draft`) |
| `period: 'TRIWULAN II - 2026'` | `periode: '2026'` | Frontend memakai label bebas; backend `VarChar(20)` bebas juga → perlu kesepakatan format |
| `respondentsCount: 432` | ✗ tidak ada | **Butuh backend** (§2.4) |
| `ikmScore: 84.50` | ✗ ada di endpoint terpisah `/results` | **Butuh backend** (§2.4) |
| `isClosed: false` | ✗ | Turunan dari `status` — cukup di adapter |

**Complaint**

| Frontend | Backend | Catatan |
|---|---|---|
| `id: "CMP-2026-0089"` | `ticketNo: "PGD20260729ABCD"` (+ `id: 1` internal) | Format nomor tiket berbeda; frontend memakai satu field untuk dua peran |
| `reporter: { name, initials }` | hanya `userId: 10` | **Butuh backend** — nama pelapor tidak pernah dikirim |
| `title` | `judul` | |
| `dateStr: "18 Juli 2026"` | `createdAt` (ISO 8601) | Pemformatan tanggal → adapter/util |
| `status: "Diproses"` | `status: "diproses"` | Kapitalisasi |

**User**

| Frontend | Backend | Catatan |
|---|---|---|
| `name` | `nama` | |
| `organization: 'Dinas Kesehatan'` | `opdId: 1` | **Butuh backend** — nama OPD tidak dikirim |
| `status: 'ACTIVE'/'INACTIVE'/'PENDING'` | `isActive: true/false` | Enum vs boolean; `PENDING` **tidak punya padanan** di backend |
| `role: 'ADMIN_OPD'/'ADMIN_KABUPATEN'/'SUPER_ADMIN'/'RESPONDENT'` | `role: 'opd'/'kabupaten'/'superuser'/'responden'` | Perlu peta 1:1 |
| `initials: 'SR'` | ✗ | Turunan dari nama — di frontend |

**OPD**

| Frontend | Backend | Catatan |
|---|---|---|
| `code` / `name` / `serviceType` | `kode` / `nama` / `jenisLayanan` | Penamaan |
| `address` | ✗ **tidak ada di skema** | **Butuh keputusan** — tambah kolom, atau hapus dari UI |
| `activeSurveys` / `openComplaints` | ✗ tidak ada | **Butuh backend** (§2.4) |
| `status: 'ACTIVE'` | `isActive: true` | |

> **Prinsip pembagian yang direkomendasikan.** Agar tidak saling merusak: **backend menambah data yang butuh query/join** (jumlah, nama relasi, agregat) — itu memang tugasnya; **frontend menerjemahkan penamaan & format tampilan** (`initials`, `dateStr`, label huruf besar) — itu urusan presentasi. Backend tidak boleh tahu soal `initials` atau `'TRIWULAN II - 2026'`, karena kontrak envelope-nya juga dipakai klien Android/iOS di masa depan (PRD Bab 11).

### 2.4 Data relasi/turunan yang belum disediakan backend

Bukan agregat berat, hanya `include`/`count` tambahan pada endpoint yang sudah ada:

| Endpoint | Tambahan yang dibutuhkan | Untuk halaman |
|---|---|---|
| `GET /surveys` | `respondentsCount`, `nilaiIkm` (dari snapshot bila ada) | `/admin-opd/surveys` |
| `GET /opd` | `activeSurveys`, `openComplaints` | `/admin-kab/opd` |
| `GET /users` | `opdNama` (join nama OPD) | `/admin-kab/users` |
| `GET /complaints` | `reporterNama` (join nama pelapor) | `/admin-opd/complaints` |

> Catatan privasi: menambah nama pelapor ke pengaduan **tidak melanggar** desain anonimitas — anonimitas hanya berlaku untuk **respons survei** (SKM agregat, sudah ditegakkan di `ResponseEntity`). Pengaduan justru harus bisa ditindaklanjuti ke pelapornya (FR-CMP-04/05, sudah ada riwayat balasan antar keduanya). Tetap perlu dipastikan hanya OPD pemilik & Kabupaten yang melihatnya — isolasi 3-arah yang sudah ada di `ComplaintsService` sudah menangani ini.

### 2.5 🔴 Endpoint agregat yang sama sekali belum ada

Ini pekerjaan terbesar. Tiga halaman menuntut data yang **belum punya endpoint apa pun**, dan sebagian menuntut perhitungan yang belum pernah dibuat (tren bulanan, SLA).

**a. `/statistics` — halaman publik**

Menuntut: `summary` (ikm, totalRespondents, totalComplaints, completionRate, avgSlaDays, activeOpd), `ikmTrend` (deret bulanan), `complaintTrend` (deret bulanan), `complaintStatus` (distribusi), `serviceElements` (9 unsur agregat **lintas seluruh OPD**), `valueDistribution`, dan `insight.text` (narasi).

Masalah tambahan yang perlu keputusan:
- Halaman ini **publik** (di luar route group ber-auth), tetapi **satu-satunya endpoint publik di backend saat ini adalah `/health`**. Perlu diputuskan: buat endpoint statistik publik, atau halaman ini dijadikan ber-auth.
- `avgSlaDays` / `completionRate` butuh definisi bisnis yang belum ada (SLA dihitung dari status `diterima` → `selesai`? hari kalender atau kerja?).
- `insight.text` adalah **narasi yang di dummy ditulis manual**. Perlu diputuskan: dihapus dari UI, diisi manual oleh admin (butuh tabel/field baru), atau dibuat template otomatis dari angka.

**b. `/admin-opd/dashboard`**

Menuntut: `ikmScore` + `ikmGrade`, `totalRespondents` + `respondentTrend` (perbandingan bulan lalu), `activeTickets`, `avgResponseTime` + `slaTarget`, `performanceMetrics` (realisasi vs target per unsur), `recentFeedback` (saran teks terbaru + rating).

`performanceMetrics` sebagian bisa diturunkan dari `nrrPerUnsur` yang sudah ada di `IkmService`; `target: 4.00` adalah konstanta. `recentFeedback` butuh query jawaban tipe `teks` terbaru — perlu keputusan privasi: dummy menampilkan **nama responden**, sedangkan respons survei sengaja anonim. Kemungkinan besar nama harus dihapus dari UI ini.

**c. `/admin-kab/dashboard`**

Menuntut: `summary` (ikmScore, ikmGrade, totalRespondents, openComplaints, newComplaints, systemActivityPercent), `ikmLeaderboard`, `complaintDistribution`, `recentActivities`.

Kabar baik: `ikmLeaderboard` **sudah tersedia** lewat `GET /dashboard/ikm` (DASH-1) — sudah berperingkat dan berfilter. Sisanya perlu ditambahkan.

**Catatan lintas ketiganya:** tren bulanan (`ikmTrend`, `complaintTrend`, `respondentTrend`) menuntut agregasi berbasis waktu yang belum pernah dibuat. `IkmResult` hanya menyimpan snapshot **per periode survei** (string bebas seperti `'2026'`), bukan per bulan — jadi tren bulanan IKM tidak bisa dihitung dari sana secara langsung. Perlu keputusan: hitung dari `submittedAt` respons secara langsung (lebih mahal, tapi akurat per bulan), atau ubah UI agar mengikuti granularitas periode yang ada.

### 2.6 Utang dokumen: Routes-List sudah tidak sesuai kenyataan

| Isi dokumen | Kenyataan di kode |
|---|---|
| `/pengaduan`, `/pengaduan/baru`, `/pengaduan/[ticketNo]` | `/complaints`, `/complaints/new`, `/complaints/[id]` |
| `/opd/dashboard`, `/opd/survei/...` | `/admin-opd/dashboard`, `/admin-opd/surveys/...` |
| `/kabupaten/dashboard`, `/kabupaten/opd`, `/kabupaten/admin` | `/admin-kab/dashboard`, `/admin-kab/opd`, `/admin-kab/users` |
| `/login`, `/register`, `/verify`, `/forgot-password`, `/reset-password` | **Tidak ada** — dan memang **sudah dibatalkan** oleh keputusan SSO-only (tidak ada auth lokal) |
| — | `/statistics`, `/about` ada di kode tapi **tidak tercatat** di dokumen |
| Pemetaan `POST /auth/login`, `POST /auth/register` | Endpoint ini **tidak pernah ada** (dibatalkan bersama auth lokal) |

Dokumen ini disebut PRD sebagai "sumber kebenaran API", jadi drift-nya perlu dibereskan agar tidak menyesatkan saat integrasi.

### 2.7 Service layer frontend masih kosong

`AGENTS.md` mewajibkan: *"Semua API melalui services"* dan *"Jangan akses backend langsung dari component"*. Saat ini:

- `src/services/api.js` — ada, tapi `baseURL` salah & envelope belum ditangani
- `src/features/authentication/services/sso.api.js` — **kosong (0 byte)**
- `src/features/complaints/services/helpdesk.api.js` — **kosong (0 byte)**
- Fitur lain (surveys, users, opd, ikm, dashboard, statistics) — **belum punya folder `services/` sama sekali**

Halaman saat ini meng-import dummy langsung dari `constants/`/`data/`, jadi pekerjaan wiring nanti = buat service + adapter, lalu ganti import di halaman.

### 2.8 Cakupan halaman: fitur backend yang belum terjangkau UI

Tidak ada halaman yang "setengah jadi" — semuanya utuh secara tampilan. Masalahnya berbeda: **ada fitur backend yang sudah selesai & teruji tetapi tidak punya pintu masuk dari UI sama sekali.** Selama ini tidak terlihat karena backend & frontend dikerjakan terpisah.

**Sudah tersedia UI-nya (tidak perlu dikerjakan):**

| Fitur backend | Konsumen UI |
|---|---|
| `POST /surveys` (buat paket survei) | ✅ `SurveyTabs` → `/surveys/builder/new` (builder sudah menangani mode `new`) |
| `POST /surveys/:id/questions/template` (9 unsur) | ✅ tombol "Tambah 9 Unsur Baku" di `BuilderSidebar` |
| Tipe pertanyaan **pilihan ganda** (QST-3) | ✅ palet builder sudah punya Skala / Pilihan Ganda / Isian Teks |
| `PATCH /surveys/:id/status` (publikasi) | ✅ tombol "Publikasikan" di `BuilderToolbar` |

**Belum ada UI-nya:**

| # | Fitur backend (selesai & teruji) | Kondisi UI | Akibat |
|---|---|---|---|
| 1 | `GET /audit-logs` (**AUD-1**) | ❌ tidak ada halaman; menu di `AdminKabSidebar` juga tidak ada | Seluruh fitur audit tak bisa dilihat siapa pun |
| 2 | Pantau pengaduan lintas OPD untuk Kabupaten (**FR-CMP-07**) | ❌ tidak ada halaman; tidak ada menu | Admin Kabupaten tak bisa memantau pengaduan, padahal isolasi 3-arah di backend sudah menyiapkannya |
| 3 | `GET /surveys/:id/results` (IKM per survei) | ❌ tidak ada halaman hasil per-survei | `/admin-opd/analytics` yang ada bersifat **agregat seluruh OPD** (tab SKM/Pengaduan + filter tahun), bukan hasil satu survei |
| 4 | `GET /surveys/:id/results/export` (**EXP-1**, CSV/Excel/PDF) | ❌ `ExportButton` yang ada adalah **tiruan** (`console.log` + `alert`) dan konteksnya agregat OPD | Ekspor laporan resmi tak bisa diunduh |
| 5 | `GET /surveys/:id/responses` (daftar respons masuk) | ❌ tidak ada | Admin OPD tak bisa melihat respons mentah |
| 6 | `POST /surveys/:id/duplicate` | ❌ tidak ada aksi; kartu survei hanya punya "Salin Kode" (menyalin kode, **bukan** menduplikasi survei) | Fitur salin survei periode lalu tak terpakai |
| 7 | `POST /opd/sync` (sinkronisasi dari Helpdesk) | ❌ tidak ada tombol | Satu-satunya cara memperbarui data OPD tak bisa dipicu |
| 8 | `POST /users` (buat akun admin) | ⚠️ tombol **"Buat Akun Admin Baru" ada tetapi mati** — tanpa `onClick`/route | Akun admin tak bisa dibuat dari UI |
| 9 | Konfirmasi survei terkirim | ❌ tidak ada (padahal `/complaints/success` ada padanannya, dan Routes-List merencanakan `/surveys/[id]/selesai`) | Responden tak dapat umpan balik jelas setelah mengirim |

**Dua masalah kebenaran data yang ditemukan sekalian:**

**(a) Tombol "Tambah Instansi OPD Baru" melanggar keputusan arsitektur.**
`OPDHeader` menyediakan tombol tambah OPD, padahal keputusan yang **sudah dikunci** menyatakan: *"OPD READ-ONLY — KEPUTUSAN FINAL: CRUD OPD lokal DITIADAKAN, Admin Kabupaten TIDAK membuat/mengedit OPD"* (Helpdesk = sumber kebenaran). Backend sengaja hanya menyediakan `GET /opd`, `GET /opd/:id`, `POST /opd/sync`. UI ini menjanjikan kemampuan yang backend **memang tidak akan pernah punya**. Rekomendasi: ganti menjadi **"Sinkronkan dari Helpdesk"** — sekaligus menutup celah nomor 7 di atas.

**(b) Nomor unsur U8 & U9 tertukar di frontend.**

| | U8 | U9 |
|---|---|---|
| PermenPANRB 14/2017, PRD Lampiran A, backend `reference.constants.ts` | Sarana dan Prasarana | Penanganan Pengaduan, Saran, dan Masukan |
| Frontend `NINE_UNSUR` (builder) | ❌ Penanganan Pengaduan | ❌ Sarana dan Prasarana |

Ini penomoran standar regulasi, jadi tertukarnya berpengaruh pada pelaporan resmi. Akar masalahnya: daftar 9 unsur **di-hardcode ulang di frontend**, padahal backend sudah menyediakan `GET /ref/unsur` justru untuk keperluan ini. Perbaikannya bukan sekadar menukar dua baris, tetapi **mengambil daftar dari `/ref/unsur`** — sekali diperbaiki, jenis kesalahan ini tak akan terulang.

### 2.9 🔴 Konflik model data dari pekerjaan frontend terbaru

Empat commit frontend terbaru (`d2b9d78..14c5dfb` — form kecamatan, layanan dinamis, opsi anonim) memperkenalkan model data yang **berbenturan dengan backend di lima titik**. Formnya masih `console.log` (belum POST sungguhan), jadi belum ada yang rusak — tetapi **fitur pengaduan tidak akan bisa jalan sama sekali** begitu di-wire.

> **Penting untuk kerangka berpikir:** ini **bukan kesalahan tim frontend.** Mereka membangun sesuai kebutuhan nyata Diskominfo yang tampaknya belum tertangkap saat backend dirancang — kecamatan sebagai unit pelayanan, kategori spesifik per instansi, dan opsi anonim. Yang dibutuhkan adalah **klarifikasi kebutuhan bersama**, bukan salah satu sisi mengalah ke sisi lain.

**Konflik 1 — Kategori pengaduan: kecocokan NOL** 🔴

| | Jumlah | Sifat | Validasi |
|---|---|---|---|
| Frontend (baru) | 18 kode | **Dinamis per instansi** (`categoryOptionsMap`) | — |
| Backend | 7 kode | **Statis & flat** (`COMPLAINT_CATEGORIES`) | `@IsIn(KATEGORI_KODE)` ketat |

Tidak **satu pun** kode frontend ada di daftar backend → setiap `POST /complaints` ditolak **HTTP 400**.

Namun setelah dipetakan, ternyata ada **hierarki yang bersih** — daftar frontend sebenarnya adalah **sub-level** dari 7 kategori backend, bukan penggantinya:

| Instansi | Kode frontend | Padanan kategori backend |
|---|---|---|
| PUPR | `infrastruktur_jalan`, `infrastruktur_air`, `tata_ruang` | `infrastruktur` |
| Dishub | `rambu`, `parkir`, `angkutan` | `infrastruktur` / `keamanan_ketertiban` |
| Dinkes | `pelayanan_puskesmas`, `fasilitas_kesehatan`, `bpjs` | `kesehatan` |
| Dukcapil | `ktp_kk`, `akta`, `pindah_datang` | `pelayanan_administrasi` |
| 15 Kecamatan | `adm_kependudukan`, `surat_pengantar`, `legalisasi`, `perizinan_tertentu`, `pengaduan_masyarakat`, `pembinaan_desa` | `pelayanan_administrasi` |

**Rekomendasi:** pertahankan 7 kategori backend sebagai **kategori** (dibutuhkan untuk agregasi & pelaporan lintas kabupaten — justru inti dashboard Diskominfo), lalu tambahkan field **`subKategori`/`layanan`** untuk daftar spesifik per-OPD. Keduanya bukan konsep yang sama: yang satu *jenis keluhan*, yang lain *layanan yang dikeluhkan*. Menghapus 7 kategori umum akan mematikan kemampuan agregasi.

**Konflik 2 — Identitas instansi: tipe berbeda** 🔴
Frontend mengirim slug string (`'pupr'`, `'kec_balerejo'`, `'disdukcapil'`, `'dpmptsp'`); backend menuntut `opdId: number` (FK ke tabel `opd`). Frontend tidak pernah memegang ID numerik. Perbaikan: ambil daftar instansi dari `GET /opd` (dengan `id` sungguhan) alih-alih hardcode slug.

**Konflik 3 — 15 Kecamatan sebagai instansi tujuan** 🔴
Kebutuhan ini **sah secara bisnis** (kecamatan memang unit pelayanan publik). Tetapi tabel `opd` adalah **cache read-only dari Helpdesk** (keputusan terkunci), sehingga kecamatan hanya bisa muncul **bila master data OPD Helpdesk memuatnya**. Bila tidak, 15 opsi itu tak akan pernah bisa dipilih — dan ini menyentuh keputusan arsitektur, bukan sekadar seeding data.

**Konflik 4 — Fitur "Anonim" belum ada di backend; untuk survei justru bertabrakan** 🔴

Toggle Anonim ditambahkan di **dua** tempat: form pengaduan (`isAnonymous`) dan survei (`?anonymous=`).

- **Pengaduan:** `Complaint.userId` adalah FK **NOT NULL**. Lebih dari itu, anonim berbenturan dengan **FR-CMP-04/05** — admin harus dapat menindaklanjuti dan berbalas pesan dengan pelapor; bila anonim, riwayat balasan (`complaint_replies`) kehilangan tujuan.
- **Survei:** respons survei **sudah anonim** by design (`ResponseEntity` tak pernah mengekspos `userId`). Namun `userId` tetap disimpan karena **anti-duplikat BE-4 bergantung padanya** (`dedupeUserId`). Jadi anonim sungguhan pada survei berarti **mematikan pencegahan pengisian ganda** — persisnya risiko yang sudah terdaftar di PRD Bab 15: *"Responden ganda/manipulasi → Nilai IKM bias"*. Kemungkinan besar toggle ini **tidak diperlukan** untuk survei, karena kerahasiaan yang diinginkan sudah terpenuhi.

**Konflik 5 — "Layanan" tak punya padanan di backend** 🟡
`SurveyForm` mengarahkan ke `/surveys/${opd}?layanan=${layanan}` — memakai **slug OPD sebagai id survei**, padahal `GET /surveys/:id/fill` menuntut id survei numerik. Selain itu "layanan" tidak ada di model backend; `Opd.jenisLayanan` granularitasnya berbeda (satu nilai per OPD, bukan daftar sub-layanan). Belum ada cara memetakan *instansi + layanan → survei aktif*, sehingga alur dari landing page belum bisa sampai ke kuesioner yang benar.

---

## 3. Roadmap Integrasi

Diurutkan berdasarkan ketergantungan. Fase 0 wajib selesai lebih dulu; Fase 2 & 3 (backend) dapat berjalan **paralel** dengan Fase 1 (frontend).

### Fase 0 — Fondasi (blocker) 🔴

| ID | Pekerjaan | Sisi | Est. | Ketergantungan |
|---|---|---|---|---|
| **INT-1** | Modul sesi lokal: terbitkan + verifikasi JWT sesi. `SessionAuthProvider` sebagai `AuthProvider` kedua di seam yang sudah ada. `StubAuthProvider` tetap dipertahankan untuk e2e. | Backend | 2–3 h | — |
| **INT-2** | `POST /auth/dev-login` — dipagari `NODE_ENV !== 'production'`, menerbitkan sesi untuk pengguna seed. Plus `POST /auth/logout`. | Backend | 1 h | INT-1 |
| **INT-3** | `apps/web/.env.example` + `.env.local`; perbaiki `baseURL` → port **3001**. | Frontend | 15 m | — |
| **INT-4** | Perkuat `api.js`: buka envelope otomatis (`data` → nilai balik, `meta.pagination` diteruskan), normalisasi error jadi bentuk seragam, tangani 401 → hapus sesi. | Frontend | 2–3 h | INT-3 |
| **INT-5** | Alur login nyata di frontend: isi `AuthCallbackLoader` yang kosong, `SSOLoginButton` memanggil `/auth/dev-login`, ganti penanda palsu `sso_logged_in` dengan sesi sungguhan, buat `useAuth`/store + `middleware.js` untuk proteksi route per peran. | Frontend | 1–2 hari | INT-2, INT-4 |

**Keluaran Fase 0:** frontend bisa login sungguhan dan memanggil endpoint ber-auth. Setelah ini integrasi per halaman bisa jalan.

### Fase 0B — Kelengkapan halaman (frontend, **paralel dengan Fase 0**) 🟡

Menutup celah §2.8. **Tidak bergantung pada autentikasi** — halaman dibangun dulu dengan dummy, lalu di-wire di Fase 4 bersama halaman lain. Ini yang membuat tim frontend tidak menganggur selagi backend membereskan blocker auth.

| ID | Pekerjaan | Est. | Catatan |
|---|---|---|---|
| **INT-30** | Perbaiki U8/U9 tertukar → ambil daftar unsur dari `GET /ref/unsur`, hapus `NINE_UNSUR` hardcode | 0.5 hari | 🔴 **Kerjakan lebih dulu** — kesalahan penomoran regulasi |
| **INT-31** | Ganti tombol "Tambah Instansi OPD Baru" → "Sinkronkan dari Helpdesk" (`POST /opd/sync`) | 0.5 hari | Butuh **D10**; menyelaraskan UI dengan keputusan OPD read-only |
| **INT-32** | Halaman hasil per-survei (`/admin-opd/surveys/[id]/results`): NRR per unsur, nilai IKM, mutu, jumlah responden + **tombol ekspor nyata** (CSV/Excel/PDF) + aksi "Lihat Hasil" di kartu survei | 1.5–2 hari | Menutup celah 3 & 4; ganti `ExportButton` tiruan |
| **INT-33** | Halaman pantau pengaduan lintas OPD untuk Kabupaten (`/admin-kab/complaints`) + menu sidebar | 1 hari | Menutup celah 2 (FR-CMP-07) |
| **INT-34** | Halaman log audit (`/admin-kab/audit`) + menu sidebar: tabel + filter entitas/pelaku | 1 hari | Menutup celah 1 (AUD-1) |
| **INT-35** | Aktifkan tombol "Buat Akun Admin Baru" yang mati: form/modal buat akun | 0.5–1 hari | Menutup celah 8 |
| **INT-36** | Aksi duplikat survei pada kartu survei | 0.5 hari | Menutup celah 6 |
| **INT-37** | Halaman konfirmasi survei terkirim | 0.5 hari | Menutup celah 9 |
| **INT-38** | Daftar respons masuk per survei (dapat menyatu dengan halaman hasil INT-32) | 0.5 hari | Menutup celah 5 |

**Keluaran Fase 0B:** setiap fitur backend punya pintu masuk dari UI, sehingga tidak ada lagi pekerjaan backend yang terbuang tak terpakai.

### Fase 1 — Kontrak & adapter (frontend)

| ID | Pekerjaan | Sisi | Est. | Ketergantungan |
|---|---|---|---|---|
| **INT-6** | Lapisan adapter per entitas (survey, complaint, user, opd, ikm): terjemahkan penamaan/enum/tipe id backend → bentuk yang dipakai komponen. Satu tempat, agar perubahan kontrak tidak menyebar ke UI. | Frontend | 1 hari | INT-4 |
| **INT-7** | Service per fitur sesuai `AGENTS.md`: `surveys.api.js`, `complaints.api.js`, `users.api.js`, `opd.api.js`, `ikm.api.js`, `auth.api.js`, `dashboard.api.js`. | Frontend | 1–2 hari | INT-6 |
| **INT-8** | Util bersama: format tanggal Indonesia, `initials` dari nama, peta label enum, komponen state loading/empty/error yang konsisten. | Frontend | 0.5 hari | — |

### Fase 2 — Pengayaan endpoint yang sudah ada (backend)

Ringan, tidak butuh migrasi.

| ID | Pekerjaan | Sisi | Est. | Ketergantungan |
|---|---|---|---|---|
| **INT-9** | `GET /surveys` + `respondentsCount` & `nilaiIkm` | Backend | 0.5 hari | — |
| **INT-10** | `GET /opd` + `activeSurveys` & `openComplaints` | Backend | 0.5 hari | — |
| **INT-11** | `GET /users` + `opdNama`; `GET /complaints` + `reporterNama` | Backend | 0.5 hari | — |

### Fase 2B — Penyelarasan model pengaduan & survei (backend) 🔴

Menutup konflik §2.9. **Harus selesai sebelum Fase 4** (wiring pengaduan & survei), karena sebagian menuntut migrasi skema — jauh lebih murah dikerjakan sekarang daripada saat halaman sudah ter-wire. Seluruhnya **tertahan keputusan D12–D14**.

| ID | Pekerjaan | Est. | Ketergantungan |
|---|---|---|---|
| **INT-42** | Tambah `subKategori`/`layanan` pada pengaduan + endpoint referensinya (daftar sub-kategori per OPD). Pertahankan 7 kategori umum untuk agregasi. Butuh migrasi. | 1.5–2 hari | **D12** |
| **INT-43** | Pastikan instansi tujuan (termasuk kecamatan bila disetujui) tersedia lewat `GET /opd` — lewat sinkronisasi Helpdesk atau jalur lain sesuai keputusan | 0.5–2 hari | **D13** (sangat bergantung jawabannya) |
| **INT-44** | Dukungan pengaduan anonim bila memang diminta: kebijakan `userId`, dampaknya pada alur balasan, dan migrasi terkait | 1–2 hari | **D14** |
| **INT-45** | Pemetaan *instansi + layanan → survei aktif* agar alur landing page sampai ke kuesioner yang benar (§2.9 konflik 5) | 1 hari | **D12** |

### Fase 3 — Endpoint agregat baru (backend) 🔴

Terberat; butuh keputusan bisnis (lihat §4) sebelum mulai.

| ID | Pekerjaan | Sisi | Est. | Ketergantungan |
|---|---|---|---|---|
| **INT-12** | `GET /dashboard/opd` — ringkasan Admin OPD (IKM+mutu, jumlah responden, tiket aktif, metrik per unsur, saran terbaru) | Backend | 1–2 hari | Keputusan D3, D4 |
| **INT-13** | Perluas `GET /dashboard/ikm` untuk kebutuhan dashboard Kabupaten (ringkasan + distribusi pengaduan + aktivitas terbaru) | Backend | 1 hari | — |
| **INT-14** | Endpoint statistik publik untuk `/statistics` | Backend | 2 hari | Keputusan D2, D3 |
| **INT-15** | Agregasi tren berbasis waktu (IKM/pengaduan/responden per bulan) | Backend | 1–2 hari | Keputusan D5 |

### Fase 4 — Wiring per halaman (frontend)

Dikerjakan halaman demi halaman, tiap halaman: pasang service → hapus dummy → uji manual. Diurutkan dari yang paling sedikit ketergantungannya.

| ID | Halaman | Endpoint | Ketergantungan |
|---|---|---|---|
| **INT-16** | `/profile` | `GET /auth/me`, `PATCH /auth/profile` | Fase 0 |
| **INT-17** | `/surveys`, `/surveys/[id]` | `GET /surveys/active`, `/fill`, `POST /responses` | Fase 1 |
| **INT-18** | `/complaints`, `/new`, `/[id]` | `GET/POST /complaints`, `/replies` | Fase 1 |
| **INT-19** | `/admin-opd/surveys` + builder | `GET/POST/PATCH /surveys`, `/questions`, `/template`, `/reorder` | INT-9 |
| **INT-20** | `/admin-opd/complaints`, `/[id]` | `GET /complaints`, `PATCH /status`, `/replies` | INT-11 |
| **INT-21** | `/admin-opd/analytics` | `GET /surveys/:id/results`, `/export` | Fase 1 |
| **INT-22** | `/admin-kab/opd`, `/admin-kab/users` | `GET /opd`, `POST /opd/sync`, `GET/POST/PATCH /users` | INT-10, INT-11 |
| **INT-23** | `/admin-opd/dashboard` | `GET /dashboard/opd` | INT-12 |
| **INT-24** | `/admin-kab/dashboard` | `GET /dashboard/ikm` (diperluas) | INT-13 |
| **INT-25** | `/statistics` | endpoint statistik publik | INT-14, INT-15 |
| **INT-39** | Halaman baru dari Fase 0B: hasil per-survei + ekspor, respons masuk | `GET /surveys/:id/results`, `/results/export`, `/responses` | INT-32, INT-38 |
| **INT-40** | Halaman baru dari Fase 0B: pengaduan kabupaten, log audit | `GET /complaints`, `GET /audit-logs` | INT-33, INT-34 |
| **INT-41** | Aksi baru dari Fase 0B: sync OPD, buat akun admin, duplikat survei | `POST /opd/sync`, `POST /users`, `POST /surveys/:id/duplicate` | INT-31, INT-35, INT-36 |

### Fase 5 — Pembersihan & dokumen

| ID | Pekerjaan | Sisi | Est. |
|---|---|---|---|
| **INT-26** | Sinkronkan Routes-List dengan kenyataan (§2.6): nama route sebenarnya, hapus route auth lokal yang sudah dibatalkan, catat `/statistics` & `/about` | Docs | 0.5 hari |
| **INT-27** | Hapus seluruh berkas dummy setelah halaman terkait selesai di-wire | Frontend | 0.5 hari |
| **INT-28** | Hapus `apps/web/package-lock.json` (proyek memakai pnpm); pastikan tidak ada `npm install` di alur kerja frontend | Repo | 15 m |
| **INT-29** | Uji alur ujung-ke-ujung per peran (responden, OPD, kabupaten) dengan data seed | QA | 1 hari |

---

## 4. Keputusan yang Dibutuhkan Sebelum Mulai

| ID | Keputusan | Rekomendasi | Memblokir |
|---|---|---|---|
| **D1** | Strategi auth sementara selagi menunggu spec Helpdesk | **Sesi lokal (JWT) + `/auth/dev-login` non-produksi** — bukan pekerjaan terbuang, memang komponen yang dibutuhkan SSO-1 (§2.1) | INT-1, seluruh Fase 0 |
| **D2** | `/statistics` publik atau ber-auth? | Bila publik, perlu endpoint publik baru + pertimbangan cache/rate-limit (saat ini hanya `/health` yang publik) | INT-14 |
| **D3** | Definisi `avgSlaDays`, `completionRate`, `systemActivityPercent` | Perlu definisi bisnis dari Diskominfo — belum ada di PRD | INT-12, INT-14 |
| **D4** | `recentFeedback` menampilkan nama responden? | **Hapus nama** — respons survei sengaja anonim (sudah ditegakkan di `ResponseEntity`); menampilkan nama akan bertentangan dengan desain itu | INT-12 |
| **D5** | Tren bulanan: hitung dari `submittedAt`, atau UI mengikuti granularitas periode survei? | `IkmResult` hanya per periode (string bebas), tidak per bulan — tren bulanan IKM harus dihitung ulang dari respons | INT-15 |
| **D6** | `insight.text` di `/statistics` | Hapus dari UI, atau sediakan tempat penyimpanan agar bisa diisi admin | INT-14 |
| **D7** | Kolom `address` pada OPD | Backend tidak punya kolom ini, dan OPD adalah **cache read-only dari Helpdesk** — menambah kolom lokal berarti data itu tak akan pernah tersinkronisasi. Rekomendasi: **hapus dari UI**, kecuali Helpdesk memang menyediakannya | INT-10, INT-22 |
| **D8** | Format `periode` survei | Frontend menampilkan `'TRIWULAN II - 2026'`, backend `VarChar(20)` bebas. Perlu format baku agar bisa diurutkan & difilter | INT-9, INT-19 |
| **D9** | `NotificationDropdown.jsx` (baru dari tim frontend) | Belum ada endpoint notifikasi — terkait **NOTIF-1** yang juga masih menunggu keputusan desain (email vs in-app) | — |
| **D10** | Tombol "Tambah Instansi OPD Baru" (§2.8a) | **Ganti jadi "Sinkronkan dari Helpdesk"** — keputusan OPD read-only sudah dikunci, backend tak akan pernah menyediakan CRUD OPD lokal. Bila Diskominfo memang menghendaki OPD dikelola manual di SKM, itu **membalik keputusan arsitektur** dan perlu dibahas tersendiri (berdampak ke sync, `externalId`, dan konflik data dengan Helpdesk) | INT-31, INT-41 |
| **D11** | Cakupan halaman baru Fase 0B | Konfirmasi 9 halaman/aksi di §2.8 memang diinginkan. Bila ada yang dianggap tidak perlu, fitur backend terkait sebaiknya ditandai "tidak dipakai" agar tidak menyesatkan (bukan dibiarkan menggantung) | Fase 0B |

**Keputusan dari konflik §2.9 — perlu klarifikasi Diskominfo, tidak bisa diputuskan tim teknis sendiri:**

| ID | Keputusan | Rekomendasi | Memblokir |
|---|---|---|---|
| **D12** | Kategori pengaduan: 7 umum (backend) atau 18 spesifik per instansi (frontend)? | **Keduanya, bertingkat** — 7 kategori umum dipertahankan untuk agregasi & pelaporan lintas kabupaten (inti dashboard Diskominfo), daftar spesifik frontend menjadi `subKategori`/`layanan`. Keduanya konsep berbeda: *jenis keluhan* vs *layanan yang dikeluhkan*. Menghapus kategori umum akan mematikan kemampuan agregasi | INT-42, INT-45 |
| **D13** | **Apakah master data OPD di Helpdesk memuat 15 kecamatan?** | Pertanyaan faktual yang harus dijawab Helpdesk lebih dulu. Bila **ya** → cukup sinkronisasi. Bila **tidak** → pilih: (a) minta Helpdesk menambahkan, atau (b) izinkan sumber instansi tambahan di luar Helpdesk — dan opsi (b) **membalik sebagian keputusan OPD read-only**, jadi perlu pembahasan tersendiri | INT-43, seluruh alur pengaduan |
| **D14** | Fitur "Anonim" benar-benar diminta? | **Pisahkan dua kasusnya.** Untuk **survei: sebaiknya dihapus** — kerahasiaan yang diinginkan sudah terpenuhi (respons memang anonim bagi admin), sementara anonim sungguhan akan mematikan anti-duplikat BE-4 dan membuka risiko manipulasi nilai IKM yang sudah terdaftar di PRD Bab 15. Untuk **pengaduan**: bila diminta, perlu kejelasan bagaimana admin menindaklanjuti & membalas pelapor anonim (FR-CMP-04/05) | INT-44 |

---

## 5. Estimasi & Jalur Kritis

| Fase | Sisi | Estimasi | Catatan |
|---|---|---|---|
| Fase 0 — Fondasi auth & klien HTTP | Backend + Frontend | 3–5 hari | 🔴 Blocker seluruh integrasi |
| Fase 0B — Kelengkapan halaman | Frontend | 6.5–8 hari | 🟢 **Paralel dengan Fase 0** — tidak butuh auth |
| Fase 1 — Kontrak & adapter | Frontend | 2.5–3.5 hari | Paralel dengan Fase 2–3 |
| Fase 2 — Pengayaan endpoint | Backend | 1.5 hari | Paralel |
| Fase 2B — Penyelarasan model pengaduan | Backend | 4–7 hari | 🔴 Tertahan **D12–D14**; wajib sebelum Fase 4 |
| Fase 3 — Agregat baru | Backend | 5–7 hari | 🔴 Terberat; tertahan keputusan D2–D6 |
| Fase 4 — Wiring halaman (13 butir) | Frontend | 6–10 hari | Bertahap per halaman |
| Fase 5 — Pembersihan & docs | Docs + Repo | 2 hari | |

**Jalur kritis:** Fase 0 → Fase 1 → Fase 4.

Dua hal yang memperpendek waktu nyata dibanding penjumlahan di atas:

1. **Fase 0B berjalan penuh secara paralel.** Selagi backend membangun sesi lokal (Fase 0), tim frontend menutup 9 celah halaman — tidak ada yang menganggur, dan Fase 0B tidak pernah menjadi jalur kritis.
2. **Fase 3 hanya memblokir 3 halaman.** Dashboard OPD, dashboard Kabupaten, dan `/statistics` (INT-23/24/25) saja yang bergantung padanya — **sisanya bisa tuntas tanpa menunggu Fase 3**, termasuk seluruh halaman baru Fase 0B.

**Rekomendasi urutan mulai:**

| Langkah | Backend | Frontend | Paralel: klarifikasi |
|---|---|---|---|
| 1 | INT-1, INT-2 (sesi lokal + dev-login) | INT-30 (perbaiki U8/U9 — mendesak), INT-3 | **Ajukan D12–D14 ke Diskominfo & Helpdesk sekarang** |
| 2 | INT-9 s.d. INT-11 (pengayaan endpoint) | INT-4, INT-5 (klien HTTP + alur login) | Matangkan D2–D6 |
| 3 | Fase 2B (setelah D12–D14 dijawab) | Fase 0B sisanya (INT-31 s.d. INT-38) | |
| 4 | Fase 3 (setelah D2–D6 diputuskan) | Fase 1 → Fase 4 halaman non-dashboard | |

**Dua rangkaian keputusan, dua tingkat urgensi:**

- **D12–D14 (§2.9) paling mendesak** — memblokir seluruh alur pengaduan, dan **D13 butuh jawaban dari pihak luar** (apakah master data OPD Helpdesk memuat kecamatan). Karena bergantung pihak ketiga, pertanyaan ini sebaiknya dikirim **hari pertama**, bukan menunggu Fase 2B tiba.
- **D2–D6** hanya memblokir 3 halaman dashboard/statistik, jadi masih ada kelonggaran waktu.

**Risiko utama jadwal:** bila D13 dijawab "Helpdesk tidak memuat kecamatan", konsekuensinya menyentuh keputusan arsitektur OPD read-only dan bisa menambah pekerjaan yang belum terhitung di estimasi mana pun. Ini alasan tambahan mengapa pertanyaan itu perlu diajukan lebih dulu.

---

## 6. Catatan Penting

- **Backend tidak perlu dirombak.** Seluruh 34 endpoint yang ada tetap dipakai apa adanya; pekerjaan backend di rencana ini adalah *penambahan* (pengayaan + agregat baru), bukan perubahan kontrak yang sudah ada. Tidak ada migrasi skema yang dibutuhkan kecuali bila D6/D7 diputuskan menambah kolom.
- **Seam auth terbukti bermanfaat.** Karena `AuthProvider` sudah menjadi abstraksi sejak M0, menambahkan sesi lokal tidak menyentuh satu pun modul bisnis — dan nanti SSO nyata juga tidak akan menyentuhnya.
- **Anonimitas SKM harus dijaga.** Beberapa UI dummy menampilkan nama responden (`recentFeedback`) — ini bertentangan dengan desain anonim yang sudah ditegakkan di backend. Perlu diselaraskan di sisi UI, bukan dilonggarkan di backend.
- **`/api/docs` (Swagger) adalah kontrak hidup.** Selama integrasi, frontend sebaiknya merujuk ke sana, bukan ke tabel di dokumen yang bisa tertinggal (sebagaimana terbukti di §2.6).
- **"Backend selesai" ≠ "fitur sampai ke pengguna".** §2.8 menunjukkan 9 fitur backend yang sudah selesai, teruji, dan ter-merge — tetapi tak punya pintu masuk dari UI. Untuk pekerjaan berikutnya, sebaiknya setiap tiket backend diperiksa: *siapa yang akan memanggil endpoint ini, dan apakah halamannya sudah ada?* Lebih murah menjawab itu saat perencanaan daripada menemukannya berbulan-bulan kemudian.
- **Data referensi jangan di-hardcode dua kali.** U8/U9 tertukar di frontend (§2.8b) terjadi karena daftar 9 unsur ditulis ulang manual, padahal `GET /ref/unsur` memang disediakan untuk itu. Pola yang sama berlaku untuk kategori pengaduan (`GET /ref/complaint-categories`) — pastikan frontend mengambilnya dari API, bukan menyalin daftarnya. Konflik §2.9 nomor 1 & 2 pun berakar dari hal yang sama: daftar instansi & kategori di-hardcode di frontend, bukan diambil dari `GET /opd` dan `GET /ref/complaint-categories`.
- **Bekerja paralel tanpa kontrak bersama menimbulkan drift yang mahal.** §2.9 adalah contohnya: tim frontend menambahkan kecamatan, kategori dinamis, dan opsi anonim — semuanya kebutuhan yang masuk akal — tetapi tanpa kontrak yang disepakati lebih dulu, hasilnya berbenturan dengan model backend termasuk keputusan yang sudah dikunci. Untuk ke depan, perubahan pada **field yang akan dikirim ke API** sebaiknya disepakati dulu (cukup lewat Swagger + kesepakatan singkat), sementara perubahan yang murni tampilan tetap bebas.
- **Kebutuhan bisnis yang belum tertangkap lebih baik ditemukan sekarang.** Kecamatan sebagai unit pelayanan dan kategori spesifik per instansi kemungkinan besar **kebutuhan yang benar** — hanya belum tertangkap saat backend dirancang. Menemukannya di tahap perencanaan integrasi (saat form masih `console.log`) jauh lebih murah daripada setelah pengaduan berjalan di produksi dengan model data yang salah.
