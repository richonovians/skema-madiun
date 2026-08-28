# Daftar Routes — API & Frontend
## Sistem Survei Kepuasan Masyarakat (SKM) & Pengaduan Masyarakat

| | |
|---|---|
| **Dokumen pendamping** | PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md, Rencana-Integrasi-Frontend-Backend.md |
| **Versi** | 2.2 — batas laju endpoint masuk & IP klien di belakang reverse proxy |
| **Tanggal** | 28 Agustus 2026 (v2.1: 27 Agustus 2026; v2.0: 5 Agustus 2026; v1.0: 13 Juli 2026) |
| **Cakupan** | Kontrak routes REST API (Nest.js) & routes halaman frontend (Next.js) sesuai implementasi saat ini |

Dokumen ini adalah **rujukan resmi** daftar routes. Versi 1.0 ditulis di awal perencanaan dan sejak itu **arsitektur berubah signifikan** (autentikasi lokal digantikan SSO Helpdesk, OPD jadi cache read-only) — versi ini menggantikannya dengan apa yang sungguhan berjalan di kode. Swagger (`/api/docs`) tetap kontrak paling hidup untuk detail request/response; dokumen ini untuk peta cepat.

**Konvensi umum:**
- Prefiks API: `/api/v1`
- Autentikasi: sesi lokal berbasis JWT, diterbitkan sistem sendiri setelah login SSO Helpdesk (OAuth2) — **bukan** JWT dari Helpdesk langsung. Dua cara penyerahan, keduanya berlaku: cookie **`session` HttpOnly** (jalur SSO, lihat A.1) atau header `Authorization: Bearer <token>` (jalur `dev-login`, non-produksi, 404 di produksi). Bila keduanya ada, header didahulukan.
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

**TIDAK ADA autentikasi lokal** (password/register/verify/forgot-reset-password) — login sepenuhnya lewat SSO Helpdesk (OAuth2 Authorization Code).

**Status per 2026-08-28:** modul SSO **sudah diimplementasikan** (redirect ke Helpdesk, verifikasi `state`, tukar code→token, pencocokan/pembuatan akun, penerbitan sesi). Yang masih menghalangi pemakaian sungguhan hanya `client_id`/`client_secret` dari tim Helpdesk — tanpanya menekan tombol "Masuk via SSO Helpdesk" mendarat di halaman galat `/sso/callback` yang menyebutkan kunci mana yang kosong. `dev-login` tetap ada sebagai jalur non-produksi dan menerbitkan sesi lokal yang SAMA persis.

**Kedua endpoint SSO gagal dengan redirect, bukan JSON.** Aturan ini berlaku untuk `sso/login` **dan** `sso/callback`, dan alasannya sama: yang membuka kedua alamat itu adalah peramban pengguna lewat navigasi, bukan axios — galat mentah berarti warga menatap `{"success":false,...}` di tab kosong. Pada `sso/callback` aturan itu ada sejak awal; pada `sso/login` baru diterapkan 28 Agu 2026, dan sampai saat itu tombol utama aplikasi memang menampilkan JSON kepada pengguna. Bedanya satu: kegagalan `sso/login` **tidak** membuang cookie `sso_state`, karena membuangnya akan mematikan percobaan masuk yang sedang berjalan di tab lain.

Dua catatan penting tentang protokol Helpdesk, karena keduanya menyimpang dari bawaan OIDC:
- **Tanpa PKCE.** Dokumen penemuan (`<issuer>/.well-known/openid-configuration`) tak mencantumkan `code_challenge_methods_supported`. Akibatnya parameter `state` bukan lapisan kedua melainkan **satu-satunya** pertahanan CSRF — karena itu ia bertanda tangan, sekali pakai, berumur 10 menit, dan diikat ke cookie `sso_state` (HttpOnly, `Path=/api/v1/auth/sso`).
- **Tanpa `end_session_endpoint`.** Tak ada RP-initiated logout: `POST /auth/logout` hanya mengakhiri sesi SKM, tidak sesi Helpdesk-nya.

**Penyerahan sesi (2026-08-27):** token sesi diserahkan sebagai cookie **`session` HttpOnly** (`Path=/`, `SameSite=Lax`, `Secure` di produksi, `Max-Age` = `exp` token). Alamat callback ke frontend TIDAK memuat token sama sekali — hanya `#expires=` (detik epoch), yang bukan rahasia. Konsekuensinya: (a) frontend memakai `withCredentials: true`; (b) `POST /auth/logout` kini **wajib** dipanggil karena hanya server yang dapat menghapus cookie HttpOnly; (c) di produksi `SESSION_COOKIE_DOMAIN` praktis wajib (mis. `.madiunkab.go.id`) agar cookie dari `api.*` ikut terbaca `skm.*`. Header `Authorization: Bearer` tetap didahulukan bila ada — itu jalur `dev-login`.

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/auth/sso/login` | ✗ | Publik | **Redirect 302** ke halaman login Helpdesk + set cookie `sso_state`. Dibuka lewat navigasi peramban, bukan XHR. Gagal **juga** 302 (ke `WEB_APP_URL/sso/callback#error=`), tak pernah JSON mentah. **60/menit per IP** |
| GET | `/api/v1/auth/sso/callback` | ✗ | Publik | Tujuan balik dari Helpdesk. Verifikasi `state` → tukar `code` → cocokkan akun → set cookie `session`. **Selalu** membalas 302 ke `WEB_APP_URL/sso/callback` (`#expires=` bila berhasil, `#error=` bila gagal), tak pernah galat mentah. **60/menit per IP** |
| POST | `/api/v1/auth/dev-login` | ✗ | Publik (404 di produksi) | **Non-produksi saja.** Terbitkan sesi lokal by `identifier` (email/ssoSubject) tanpa alur SSO sungguhan. **30/menit per IP** |
| POST | `/api/v1/auth/logout` | ✓ | Semua | Akhiri sesi + **hapus cookie `session`**. Sesi Helpdesk tidak ikut berakhir (tak ada `end_session_endpoint`) |
| POST | `/api/v1/auth/consent` | ✓ | Semua | Catat persetujuan UU PDP (`users.consent_at`). **Idempoten** — pemanggilan ulang mengembalikan waktu yang sudah ada tanpa menggesernya |
| GET | `/api/v1/auth/me` | ✓ | Semua | Ambil data pengguna aktif. Dipakai `/sso/callback` & `/persetujuan`. Memuat `consentRequired` & `ssoLinked` (boolean turunan; `consentAt` sendiri tidak diekspos) |
| PATCH | `/api/v1/auth/profile` | ✓ | Semua | Ubah profil / data diri |

**Dua domain yang didaftarkan di Helpdesk.** Hanya callback **backend** yang didaftarkan — alamat frontend tidak, dan Helpdesk tak perlu tahu. Callback wajib mendarat di backend karena penukaran `code` memerlukan `client_secret`; kalau mendarat di frontend, secret itu harus ada di peramban dan berhenti menjadi secret.

| Lingkungan | Origin aplikasi | `redirect_uri` yang didaftarkan |
|---|---|---|
| Pengembangan | `http://skema.local` | `http://skema.local/api/v1/auth/sso/callback` |
| Produksi | `https://skema.madiunkab.go.id` | `https://skema.madiunkab.go.id/api/v1/auth/sso/callback` |

**Batas laju & IP klien di belakang proxy (2026-08-28).** Batas global adalah `THROTTLE_LIMIT` (100/menit per IP); tiga endpoint masuk di tabel atas dibatasi lebih ketat langsung di `AuthController`. Angka SSO sengaja tetap longgar (60/menit): di jaringan seluler Indonesia sangat banyak warga berbagi satu IP publik (CGNAT), dan batas yang "aman" di atas kertas justru menolak orang yang benar-benar ingin masuk. `dev-login` lebih ketat lagi (30/menit) bukan karena bebannya, melainkan karena ia menerbitkan sesi untuk **email mana pun yang ada, tanpa kata sandi**. Angkanya semula 10 dan dinaikkan setelah dicoba: pengujian berganti-ganti peran rutin melakukan belasan login dalam satu menit, sehingga 10/menit menjatuhkan `429` pada pemakaian yang sah — dan batas yang menghalangi alat uji proyeknya sendiri tak akan bertahan. Yang sesungguhnya menjaga endpoint ini adalah `NonProductionGuard` (404 di produksi); throttle-nya polisi tidur, bukan pintu.

Batas itu semula tidak bekerja per-IP sama sekali. Express secara baku tak mempercayai `X-Forwarded-For`, sehingga di belakang nginx `req.ip` — kunci yang dipakai `ThrottlerGuard` — bernilai IP nginx untuk **seluruh** pengguna: satu ember bersama, sehingga `429` menimpa orang yang tak melakukan apa-apa sementara satu penyerang tak dapat dipisahkan dari yang lain. Diperbaiki lewat `TRUST_PROXY_HOPS` (baku `1`), disetel di `app.setup.ts` agar runtime **dan** e2e memakai jalur yang sama. Nilainya **harus cocok dengan topologi**: satu nginx = `1`, ada load balancer lagi di depannya = `2`, API terekspos langsung = `0`. Berupa angka dan bukan `true` dengan sengaja — `true` mempercayai seluruh rantai, sehingga klien bisa mengarang `X-Forwarded-For` dan memakai ember baru setiap permintaan. Karena nginx **menambahkan** IP asli di ujung kanan (`$proxy_add_x_forwarded_for`), nilai karangan klien terlewati dengan sendirinya.

Satu domain per lingkungan, bukan dua: frontend & backend disajikan pada **satu origin** lewat reverse proxy (`infra/nginx/dev.conf` untuk dev, `infra/nginx/prod.conf` untuk produksi), dengan `/api/v1/*` dan `/uploads/*` diteruskan ke backend dan sisanya ke Next.js. Akibatnya cookie sesi jadi **host-only**, CORS tak pernah terpakai, `SESSION_COOKIE_DOMAIN` tetap kosong, dan bentuk konfigurasi dev identik dengan produksi — jalur cookie yang dipakai produksi benar-benar teruji, bukan cabang kode yang mati di dev.

**TLS di produksi bukan pilihan.** `SessionCookieService` memasang atribut `Secure` begitu `NODE_ENV=production`, dan peramban **membuang** cookie `Secure` yang datang lewat `http://` tanpa pesan apa pun: backend melaporkan login sukses sementara pengguna tetap dianggap belum masuk, dan gejalanya tak menunjuk ke mana pun. Karena itu `prod.conf` melayani aplikasi **hanya** di `443` dan menjadikan `80` semata pengantar `301` (kecuali jalur `/.well-known/acme-challenge/`, yang harus tetap lewat agar pembaruan sertifikat tak gagal). Dua perbedaan lain dari dev: upstream menunjuk nama service compose (`api`, `web`) bukan `host.docker.internal`, dan **`/api/docs` ditutup `404`** — di dev ia ikut lolos lewat `location /api/`, dan di produksi itu berarti seluruh permukaan API terpampang tanpa autentikasi. Swagger ditutup di dua lapis: `location` tersebut (ikut mencakup `/api/docs-json`) dan `SWAGGER_ENABLED=false`. Keduanya sudah diuji `nginx -t` dan diverifikasi berjalan: `80 → 301` dengan path utuh, `/api/docs` & `/api/docs-json → 404`, sedangkan `/api/v1/*`, `/uploads/*`, dan `/` tetap diteruskan.

Pencocokan di sisi Helpdesk bersifat **persis**: skema, host, port, path, dan ada-tidaknya garis miring akhir (`.../callback` ≠ `.../callback/`). Yang masih perlu dikonfirmasi ke tim Helpdesk: bolehkah satu client punya dua `redirect_uri`? Bila hanya satu, minta **dua client terpisah** (dev & prod) — lebih baik, karena secret produksi tak perlu beredar di laptop.

Dua jebakan yang sudah ditemukan & ditangani saat menyiapkan ini (2026-08-27), keduanya bergejala menyesatkan karena halaman tetap membalas `200`:
- **`allowedDevOrigins` di `apps/web/next.config.js`** wajib memuat `skema.local`. Next.js 16 menolak permintaan dev ber-`Origin` asing, dan yang gagal adalah WebSocket HMR — React lalu **tak pernah terhidrasi**, sehingga `/sso/callback` menggantung selamanya di "Menyelesaikan proses masuk..." tanpa satu pun galat di halaman.
- **Jangan tambahkan `extra_hosts: host.docker.internal:host-gateway`** pada service `proxy`. Docker Desktop sudah menyediakan nama itu (IPv4); baris tersebut menumpuk entri IPv6 yang tak terjangkau, nginx bergilir ke sana, dan jabat-tangan WebSocket gagal dengan `upstream sent no valid HTTP/1.0 header`. Baris itu hanya perlu di Docker Engine Linux.

**Pencocokan akun saat callback** (`SsoService.provision`, urutannya menentukan): (1) `sso_subject == sub` → pengguna yang sudah pernah masuk; (2) `email == email` → akun lama, `sso_subject` **dinaikkan** ke `sub` asli. Langkah 2 bukan kemewahan: seluruh `sso_subject` yang ada sekarang masih penampung pra-SSO (`seed-superuser`, `pending:...`) dan tanpanya setiap akun lama — termasuk Admin Kabupaten — akan dibuatkan akun baru berperan `responden` sementara riwayatnya menjadi yatim; (3) tak keduanya → akun baru, perannya diturunkan dari klaim (lihat di bawah).

**Peran & OPD dari klaim** (`sso-role.mapper.ts`, sejak 2026-08-27). Diatur env `HELPDESK_SSO_ROLE_MAP` berformat `nilaiKlaim:peran` dipisah koma; kosong = semua akun baru jadi `responden` seperti sebelumnya. Empat aturan yang menentukan:
- **Hanya saat akun DIBUAT.** SSO tak pernah bisa menurunkan peran akun yang sudah ada — kalau tidak, Helpdesk yang berhenti mengirim klaim akan diam-diam menurunkan setiap Admin Kabupaten menjadi warga, dan kegagalan itu senyap.
- **`superuser` tak dapat dipetakan** dan diabaikan bila dicoba. Peran itu memegang log aktivitas & manajemen pengguna; penetapannya tak diserahkan ke sistem di luar kendali kita.
- **Parser sengaja pemaaf** terhadap bentuk klaim (string tunggal, daftar berkoma/spasi, array string, array objek `{name}`/`{slug}`/`{id}`, objek tunggal) dan mengembalikan daftar kosong — bukan galat — untuk bentuk tak dikenal. Bentuknya belum dikonfirmasi Helpdesk, dan galat di sini berarti login gagal total hanya karena bentuk di luar dugaan.
- **Peran `opd` menuntut OPD nyata**: nilai klaim dicocokkan ke `opd.external_id` atau `opd.kode` (case-insensitive, karena `kode` tersimpan huruf besar sementara klaim dinormalkan huruf kecil). Tak ada yang cocok → akun dibuat `responden`, sebab peran `opd` tanpa `opdId` membuat dashboard OPD-nya pasti gagal.

**Persetujuan UU PDP** (`ConsentService`). Kolom `users.consent_at` sudah ada sejak awal tapi **tak punya jalur tulis** sampai 2026-08-27 — callback SSO pun sengaja membiarkannya kosong, karena mengisinya otomatis berarti mencatat persetujuan yang belum pernah diberikan. Yang dimintai hanya `responden`; admin bertindak dalam kapasitas jabatan, bukan sebagai subjek data. Penegakannya **dua lapis**: penjaga navigasi di frontend (`/persetujuan` + cookie `consent` yang dibaca proxy.js) dan — yang sesungguhnya — penolakan `403` di dua titik pengumpulan data, `POST /complaints` dan `POST /surveys/:id/responses`. Tanpa lapis kedua persetujuan ini cuma kosmetik, sebab cookie dapat disunting pemiliknya.

**Audit login.** `login`, `logout`, dan `consent` dicatat ke `audit_logs` dengan `entitas = 'auth'`. Dipanggil LANGSUNG, bukan lewat dekorator `@Audit`: interceptor-nya mengambil aktor dari request, dan callback SSO `@Public()` belum punya pengguna saat ia berjalan. Login **gagal** tidak dicatat — `audit_logs.actor_id` NOT NULL dan pada kegagalan tak ada aktor untuk ditunjuk; kegagalan tetap masuk log aplikasi. Konsekuensi yang perlu diketahui: `actor_id` ber-RESTRICT, sehingga pengguna yang pernah masuk **tak dapat di-hard-delete** — produksi memakai soft delete sehingga tak pernah menabraknya, tapi pembersihan e2e harus membuang baris auditnya lebih dulu.

## A.2 Manajemen OPD (`/opd`) — READ-ONLY, cache dari Helpdesk

**Tidak ada create/update/delete OPD lokal** (keputusan arsitektur terkunci, D10) — Helpdesk adalah *source of truth* master data OPD, SKM cuma menyimpan cache tersinkron.

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/opd` | ✓ | Semua | Daftar OPD (data direktori tak sensitif — Responden butuh ini utk pilih tujuan pengaduan) |
| GET | `/api/v1/opd/:id` | ✓ | Kabupaten, OPD (miliknya) | Detail OPD |
| POST | `/api/v1/opd/sync` | ✓ | Kabupaten | Sinkronkan dari Helpdesk (upsert by `externalId`) — sumber Helpdesk sungguhan (`HelpdeskOpdClient`) belum dibangun, masih pakai `StubOpdSource` (3 fixture) |

## A.3 Manajemen Akun Admin (`/users`)

Seluruh route di bawah **khusus Superuser** (2026-08-20). Ditegakkan di dalam
`UsersService.assertSuperuser`, BUKAN lewat `@Roles`: RolesGuard meloloskan
`kabupaten` dan `superuser` sama saja (bypass peran berhak penuh), jadi dekorator
tak bisa membedakan keduanya. Admin Kabupaten biasa mendapat **403** di seluruh
route ini — termasuk `PATCH /users/:id`, sehingga pengangkatan/penurunan peran
admin sepenuhnya di tangan Superuser.

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/users` | ✓ | Superuser | Daftar akun admin (filter role/OPD) |
| POST | `/api/v1/users` | ✓ | Superuser | Buat akun Admin OPD / Kabupaten / Superuser |
| GET | `/api/v1/users/:id` | ✓ | Superuser | Detail akun |
| PATCH | `/api/v1/users/:id` | ✓ | Superuser | Ubah akun (nama, OPD terkait, role) |
| PATCH | `/api/v1/users/:id/status` | ✓ | Superuser | Aktif/nonaktifkan akun |
| DELETE | `/api/v1/users/:id` | ✓ | Superuser | Hapus akun (soft delete) |

## A.4 Survei & Pertanyaan (`/surveys`, `/questions`)

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/surveys` | ✓ | OPD, Kabupaten | Daftar survei (OPD: milik sendiri; Kabupaten: semua). Filter opsional `opdId` mempersempit ke satu OPD — di-AND-kan dengan penyaring kepemilikan, jadi tak dapat melebarkan akses |
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
| PATCH | `/api/v1/questions/:id` | ✓ | OPD | Ubah teks pertanyaan &/atau GANTI seluruh opsi jawaban — tipe `pilihan` min. 2 opsi, tipe `skala` tepat 4 label skor (`nilai` dipaksa 1-4); tipe pertanyaan sendiri tak bisa diubah |
| DELETE | `/api/v1/questions/:id` | ✓ | OPD | Hapus pertanyaan |

## A.5 Pengisian, Hasil & IKM

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/surveys/:id/fill` | ✓ | Responden | Ambil struktur kuesioner (survei harus aktif) |
| POST | `/api/v1/surveys/:id/responses` | ✓ | Responden | Kirim jawaban. `userId` **disimpan** (kolom wajib) + `dedupeUserId` untuk anti-duplikat; keanoniman SKM ditegakkan di sisi PENYAJIAN — lihat baris di bawah |
| GET | `/api/v1/surveys/:id/responses` | ✓ | OPD, Kabupaten | Daftar respons masuk (jawaban lengkap per respons). `ResponseEntity` sengaja tak memuat `userId`/`dedupeUserId`: admin tak boleh tahu SIAPA yang mengisi |
| GET | `/api/v1/me/survey-responses` | ✓ | Responden | Riwayat survei yang diisi **pemanggil sendiri** (judul, periode, nama OPD, waktu kirim). Cakupan selalu `userId` dari token — tak ada parameter pemilik, jadi tak bisa dipakai mengintip riwayat orang lain. Dipakai riwayat aktivitas dashboard warga (2026-08-24) |
| GET | `/api/v1/surveys/:id/results` | ✓ | OPD, Kabupaten | Hasil live-compute: NRR per unsur + nilai IKM + mutu |
| GET | `/api/v1/surveys/:id/results/export?format=` | ✓ | OPD, Kabupaten | Ekspor laporan (`csv`\|`excel`\|`pdf`) — file biner mentah, bukan envelope |
| GET | `/api/v1/dashboard/opd?opdId=` | ✓ | OPD, **Superuser** | Ringkasan satu OPD (IKM survei terbaru, responden, tiket aktif, SLA, umpan balik). OPD: selalu OPD-nya sendiri, `opdId` diabaikan. Superuser: WAJIB mengirim `opdId`. **Admin Kabupaten 403** (keputusan user 2026-08-20) |
| GET | `/api/v1/dashboard/ikm` | ✓ | Kabupaten | Agregat & perbandingan IKM seluruh OPD (dari snapshot `ikm_results`, bukan live-compute) |

## A.6 Pengaduan (`/complaints`)

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| POST | `/api/v1/complaints` | ✓ | Responden | Ajukan pengaduan (multipart, lampiran opsional maks 5 file @5MB) — dapat nomor tiket |
| GET | `/api/v1/complaints` | ✓ | Semua¹ | Daftar pengaduan (terfilter kepemilikan). Filter opsional `opdId` mempersempit ke satu OPD — di-AND-kan dengan penyaring kepemilikan, jadi tak dapat melebarkan akses |
| GET | `/api/v1/complaints/:ticketNo` | ✓ | Semua¹ | Detail & lacak status via nomor tiket publik |
| PATCH | `/api/v1/complaints/:id/status` | ✓ | OPD (pemilik) | Ubah status: diterima→diproses→selesai, atau →ditolak (catatan wajib bila ditolak) |
| GET | `/api/v1/complaints/:id/replies` | ✓ | Semua¹ | Riwayat tanggapan pada tiket |
| POST | `/api/v1/complaints/:id/replies` | ✓ | OPD (pemilik), Responden (pengaju) | Tambah tanggapan |

## A.7 Audit & Referensi

| Method | Path | Auth | Peran | Deskripsi |
|---|---|:---:|---|---|
| GET | `/api/v1/audit-logs` | ✓ | Superuser | Daftar log aktivitas admin (filter `entitas`/`actorId`) — Admin Kabupaten 403 (`AuditService.assertSuperuser`) |
| GET | `/api/v1/audit-logs/:id` | ✓ | Superuser | Detail satu log aktivitas |
| GET | `/api/v1/ref/unsur` | ✓ | OPD, Kabupaten | Daftar 9 unsur baku SKM (template PermenPANRB 14/2017) |
| GET | `/api/v1/ref/complaint-categories` | ✓ | Semua | Daftar 7 kategori baku pengaduan |

> ¹ **"Semua"** pada modul pengaduan tetap dibatasi kepemilikan data (ditegakkan di service, bukan `@Roles`): Responden hanya melihat pengaduannya sendiri, Admin OPD hanya pengaduan OPD-nya, Admin Kabupaten memantau seluruhnya (read-only — tak bisa ubah status/balas).

**Belum ada di backend** (dicek eksplisit, bukan sekadar belum terdaftar): endpoint detail-per-respons survei (sengaja tak dibangun — daftar respons sudah kembalikan jawaban lengkap).

---

# BAGIAN B — ROUTES FRONTEND (Next.js App Router)

Struktur *route groups* App Router: `(respondent)` dan `(builder)` di URL nyata **tidak muncul** (hanya pengelompokan folder). Proteksi route dilakukan `apps/web/src/proxy.js` (dulu `middleware.js`, Next 16 mengganti nama) — cek cookie `token`, redirect ke `/` bila kosong, **cakupan matcher HANYA `/admin-kab/:path*` dan `/admin-opd/:path*`**; halaman Responden (`/surveys`, `/complaints`, `/profile`, `/dashboard`) tidak diproteksi di level proxy.

## B.1 Area Publik & Responden

| Route | Auth | Halaman | Status wiring |
|---|:---:|---|---|
| `/` | ✗ | Landing + tombol masuk (SSO Helpdesk; tautan "akun dev" hanya di lingkungan pengembangan) | ✅ |
| `/sso/callback` | ✗ | Pendaratan setelah callback SSO: baca fragment `#expires=`/`#error=`, panggil `GET /auth/me`, simpan `role` + waktu kedaluwarsa, antar ke beranda peran. Superuser mendapat pemilih area di sini. **Sengaja di luar matcher proxy.js** — cookie `role` belum ada saat halaman ini dibuka | ✅ (2026-08-27) |
| `/persetujuan` | 🔒 Warga | Gerbang persetujuan UU PDP. Warga tak dapat memakai fitur sebelum menyetujui; yang sudah menyetujui & non-warga dipantulkan keluar. Sengaja **di luar** grup `(respondent)` — kerangka warga lengkap akan menawarkan jalan keluar dari gerbang yang tak boleh dilewati. Keperluannya diperiksa dari `GET /auth/me`, bukan dari cookie | ✅ (2026-08-27) |
| `/about` | ✗ | Tentang sistem | ✅ (statis) |
| `/statistics` | ✗ | Statistik publik | ❌ dummy (INT-25, blocked D2/D6/D14) |
| `/dashboard` | 🔒 | Dashboard Responden | ✅ — riwayat aktivitas menggabung pengaduan + pengisian survei (2026-08-24) |
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
| `/admin-opd/dashboard` | 🔒 OPD + SU | Ringkasan OPD (Superuser: OPD yang dipilihnya) | ✅ (INT-12/INT-23) |
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
| `/admin-kab/users` | 🔒 SU | Kelola akun Admin OPD/Kabupaten/Superuser | ✅ (INT-22) |
| `/admin-kab/users/create` | 🔒 SU | Buat akun admin baru | ✅ (INT-22) |
| `/admin-kab/complaints` | 🔒 Kab | Pantau seluruh pengaduan lintas OPD (read-only) | ✅ (INT-33) |
| `/admin-kab/complaints/[id]` | 🔒 Kab | Detail pengaduan (read-only, param = ticketNo) | ✅ (INT-33) |
| `/admin-kab/audit-logs` | 🔒 SU | Log aktivitas admin | ✅ (INT-34) |
| `/admin-kab/audit-logs/[id]` | 🔒 SU | Detail satu log aktivitas | ✅ (INT-34) |
| `/pilih-peran` (di luar prefiks) | 🔒 SU | Ganti area kerja Superuser tanpa logout | ✅ (2026-08-20) |

**🔒 SU** = khusus Superuser. Admin Kabupaten biasa dipantulkan proxy ke
`/admin-kab/dashboard`, dan API-nya pun 403 bila URL dipaksa.

**Kurungan area Superuser (2026-08-20):** peran yang dipilih Superuser saat login
disimpan sebagai cookie `area` dan proxy membatasi navigasinya pada area itu saja
(`kabupaten` → `/admin-kab`, `opd` → `/admin-opd`, `responden` → halaman warga).
Ini pembatas NAVIGASI, bukan hak akses — backend tetap memperlakukan Superuser
setara Kabupaten (`hasFullAccess`).

**Memilih OPD (2026-08-20):** memilih area OPD menuntut Superuser memilih SATU OPD
(daftar dari `GET /opd`). Pilihannya disimpan di localStorage (`acting_opd`) plus
cookie `opd` berisi id-nya saja — cookie itu ada karena proxy perlu tahu
ADA-TIDAKNYA OPD terpilih. Dipakai sebagai `?opdId=` pada `GET /dashboard/opd`,
`GET /surveys`, & `GET /complaints`, dan sebagai `opdId` saat membuat survei baru
dari area itu (tanpanya `POST /surveys` menolak "opdId wajib diisi", karena akun
Superuser tak tertaut OPD mana pun).

`/admin-opd/dashboard` KINI tersedia untuk Superuser yang sudah memilih OPD
(2026-08-20, keputusan user: "hanya superuser yang bisa membuka dashboard opd").
Tanpa OPD terpilih ia dipantulkan ke `/admin-opd/surveys` — backend menolak 400
tanpa `opdId`, jadi halamannya pasti gagal memuat. Admin Kabupaten tetap
dipantulkan dan tetap 403 di API.

## B.4 Pemetaan Route Frontend → Endpoint API (halaman terwiring)

| Route Frontend | Endpoint API yang dipanggil |
|---|---|
| `/` | `GET /auth/sso/login` (navigasi, bukan XHR), `POST /auth/dev-login`, `GET /auth/me` |
| `/sso/callback` | `GET /auth/me`; `POST /auth/logout` bila superuser membatalkan di pemilih peran |
| `/persetujuan` | `GET /auth/me` → `POST /auth/consent`; `POST /auth/logout` bila menolak |
| `/profile` | `GET /auth/me`, `PATCH /auth/profile` |
| `/dashboard` | `GET /complaints`, `GET /me/survey-responses` (riwayat aktivitas menggabung keduanya), `GET /surveys/active` |
| `/surveys` | `GET /surveys/active`, `GET /opd` (hanya bila `?opdId=` — untuk nama pada chip filter) |
| `/surveys/[id]` | `GET /surveys/:id/fill` → `POST /surveys/:id/responses` |
| `/complaints/new` | `GET /opd`, `GET /ref/complaint-categories` → `POST /complaints` |
| `/complaints/[id]` | `GET /complaints/:ticketNo`, `GET/POST /complaints/:id/replies` |
| `/admin-opd/surveys` | `GET /surveys`, `PATCH /surveys/:id/status`, `POST /surveys/:id/duplicate`, `DELETE /surveys/:id` |
| `/admin-opd/surveys/builder/[id]` | `GET/PATCH /surveys/:id`, `GET/POST /surveys/:id/questions`, `.../template`, `.../reorder`, `PATCH/DELETE /questions/:id`, `PATCH /surveys/:id/status` |
| `/admin-opd/surveys/[id]/responses(/[responseId])` | `GET /surveys/:id`, `GET /surveys/:id/questions`, `GET /surveys/:id/responses` |
| `/admin-opd/analytics` | `GET /surveys`, `GET /surveys/:id/results`, `GET /surveys/:id/results/export` |
| `/admin-opd/complaints(/[id])` | `GET /complaints`, `GET /complaints/:ticketNo`, `PATCH /complaints/:id/status`, `GET/POST /complaints/:id/replies` |
| `/admin-kab/opd` | `GET /opd`, `POST /opd/sync` |
| `/admin-opd/dashboard` | `GET /dashboard/opd(?opdId=)`, `GET /surveys`, `GET /complaints` |
| `/admin-kab/users(/create)` | `GET/POST /users`, `GET/PATCH /users/:id`, `PATCH /users/:id/status`, `DELETE /users/:id` |
| `/pilih-peran` | `GET /auth/me` |
| `/admin-kab/complaints(/[id])` | `GET /complaints`, `GET /complaints/:ticketNo`, `GET /complaints/:id/replies` |
| `/admin-kab/audit-logs(/[id])` | `GET /audit-logs`, `GET /audit-logs/:id` |

---

## Catatan Implementasi

- **Proteksi route frontend**: `apps/web/src/proxy.js` (Next.js 16, bukan lagi `middleware.js`) cek cookie sesi — `token` (jalur dev-login, ditulis JavaScript) **atau** `session` (jalur SSO, ditulis backend sebagai HttpOnly; proxy berjalan di edge/server sehingga HttpOnly tak menghalanginya) — plus cookie `role`/`area`/`opd` untuk menentukan area yang boleh dibuka. Sifatnya penjaga **navigasi**, bukan penjaga data: yang menegakkan hak akses tetap `RolesGuard` + pemeriksaan di dalam service.
- **Konsistensi penamaan:** route API memakai bahasa Inggris (konvensi REST), sedangkan route frontend memakai Bahasa Indonesia untuk *label halaman* tapi path URL bahasa Inggris (`/complaints`, `/surveys`, bukan `/pengaduan`, `/survei` seperti draf v1.0) — frontend memanggil API lewat *service layer* (`features/*/services/*.api.js`), bukan pemetaan 1:1 URL.
- **`ticketNo` vs `id`:** pengaduan pakai `ticketNo` (format `PGD{YYYYMMDD}{4 acak}`) sebagai identifier di route/URL publik; `id` numerik tetap primary key internal, dipakai untuk aksi admin (`PATCH .../:id/status`, `POST .../:id/replies`).
- **Dokumentasi hidup:** implementasi API dilengkapi Swagger di `/api/docs` sebagai kontrak yang selalu sinkron dengan kode — rujuk ke sana untuk skema request/response detail per endpoint (DTO, entity, enum).
- Lihat `docs/Rencana-Integrasi-Frontend-Backend.md` untuk daftar keputusan bisnis yang masih menunggu (D12/D14) dan alasan tiap halaman "❌ dummy" di atas belum bisa diwiring.
