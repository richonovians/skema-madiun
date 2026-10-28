# Rencana dan Matriks Uji Keamanan

**Item roadmap:** `QA-SECURITY-UAT` — "Uji OWASP (SQLi/XSS/CSRF), rate limit,
otorisasi tiap endpoint, UAT stakeholder awal", 27 Oktober - 2 November 2026.
**Disusun:** 28 Oktober 2026, terhadap `main` di `9000688`.
**Cabang:** catatan ini hanya ada di `tester`.

Dokumen ini PETA KERJA sekaligus catatan hasilnya. Setiap baris "belum
diuji" berarti persis itu; hasil yang sudah ada dicatat di §8 dan seterusnya. Hasil
ditulis ke dokumen ini begitu tiap bagian dikerjakan, dan temuan dicatat ke
`BUG_REPORTS.md` seperti biasa.

---

## 1. Batas pengujian

- **Hanya terhadap lingkungan lokal** (`http://skema.local`, `skm_db` di
  kontainer `skm-db`). Tidak ada satu permintaan pun ke produksi atau ke host
  Helpdesk. Server yang menjawab diperiksa sebelum menulis apa pun.
- **Data uji berpenanda `[UJI `** dan dibersihkan sesudah tiap jalan dengan
  `bersihkan-data-uji.mjs --tanpa-induk`. Akun pengguna sungguhan tidak disentuh.
- Uji beban dan ketersediaan tidak di sini; itu `QA-PERF`.
- Jalur SSO Helpdesk sungguhan tidak di sini; itu `QA-FINAL-UAT`.

## 2. Model akses yang diuji

Diukur dari kode, bukan dari dokumen (`apps/api/src/**/*.controller.ts`):

| Lapisan | Aturan | Sumber |
| ------- | ------ | ------ |
| `@Public()` | tanpa autentikasi | `RolesGuard` |
| tanpa `@Roles` | siapa pun yang sudah masuk; isolasi data DI SERVICE | `RolesGuard` (`requiredRoles` kosong) |
| `@Roles(...)` | hanya `actingRole` yang tercantum, selain itu 403 | `RolesGuard` |
| isolasi OPD | `opdWhereFilter` (daftar) dan `assertOpdAccess` (by-id); `targetOpdId === null` hanya peran berhak penuh | `common/auth/` |
| batas laju global | 100 permintaan / 60 detik; dikunci per pengguna bila bersesi, per IP bila tidak | `ThrottlePenggunaGuard.getTracker` |
| batas laju khusus | dev-login 30/menit, SSO 60/menit, isi survei publik 20/menit, kirim respons 10/menit | `@Throttle` |

**68 endpoint**: 7 publik, 17 terbuka bagi semua yang
sudah masuk (isolasinya bergantung service), 44 dibatasi `@Roles`.

## 3. Fakta permukaan serangan

| Hal | Keadaan di kode | Akibat bagi rencana |
| --- | --------------- | ------------------- |
| Kueri mentah | nol `$queryRaw`/`$executeRaw`; seluruh akses lewat Prisma terparametri | SQLi cukup diuji asap pada medan teks dan parameter pencarian |
| HTML mentah di web | satu `dangerouslySetInnerHTML`, isinya `<style>` statis (`FloatingStatus.jsx`) | XSS tersimpan diuji pada PENAYANGAN teks pengguna, bukan pada React |
| Cookie `session` (SSO) | `HttpOnly`, `SameSite=Lax`, `Secure` hanya di produksi | CSRF lintas situs tertahan `Lax`; diuji pada semua mutasi |
| Token dev-login | Bearer dari `localStorage` (`services/api.js`) | XSS akan mencuri token di jalur ini; jalur ini mati di produksi |
| Header | `helmet` dengan CSP bawaan; CORS daftar origin + `credentials` | diuji header dan origin asing |
| Ekspor CSV/Excel | tak ditemukan penetralan sel berawalan `= + - @` (`ikm-export.service.ts`) | **kandidat injeksi rumus**, prioritas diuji |
| Berkas unggahan | AES-256-GCM, URL bertanda tangan `?exp=&sig=` | diuji kedaluwarsa, tanda tangan palsu, jenis berkas |

## 4. Rencana per kategori

Urutan di bawah adalah urutan pengerjaan.

| # | Kategori (OWASP 2021) | Yang diuji | Cara | Status |
| - | --------------------- | ---------- | ---- | ------ |
| 1 | A01 Broken Access Control | 17 endpoint "semua yang masuk": akses silang pengguna dan OPD (IDOR) — tiket pengaduan orang lain, balasannya, notifikasi orang lain, OPD lain | permintaan HTTP langsung dengan sesi peran berbeda | **selesai 28 Okt — nol celah**, lihat §8 |
| 2 | A01 | 44 endpoint berperan: tanpa sesi 401, peran salah 403, OPD lain 403/404, sumber daya tanpa tujuan | lengkapi `peran-matriks-rbac.e2e-spec.ts`, yang kini menyentuh 16 endpoint | belum diuji |
| 3 | A03 Injection — rumus | ekspor CSV/Excel hasil survei dan laporan berisi sel `=HYPERLINK(...)`, `+cmd`, `@SUM` | buat jawaban/judul uji, unduh ekspor, buka bentuk mentahnya | belum diuji |
| 4 | A03 XSS tersimpan | `<script>`, `<img onerror>`, `javascript:` pada judul/uraian pengaduan, balasan, judul survei, teks pertanyaan, nama | kirim lewat API, buka setiap halaman yang menayangkannya di Chrome | belum diuji |
| 5 | A03 SQLi | `' OR 1=1--` dan sejenisnya pada `search`, `q`, penyaring, `:id` | permintaan langsung; harapan 400/hasil kosong, bukan 500 | belum diuji |
| 6 | CSRF | semua mutasi bercookie dari origin asing; GET yang mengubah keadaan | halaman uji lokal di origin lain | belum diuji |
| 7 | A07 Auth & sesi | atribut cookie, logout dan `logout-semua` benar-benar mencabut, token kedaluwarsa, ganti peran | permintaan langsung + Chrome | belum diuji |
| 8 | Batas laju | tiap `@Throttle` dan batas global benar-benar memukul 429 di angkanya | rentetan permintaan lokal | belum diuji |
| 9 | A05 Misconfiguration | header keamanan, CORS origin asing, `/api/docs` dan `x-powered-by`, pesan galat 5xx | permintaan langsung | belum diuji |
| 10 | Unggahan | jenis berkas palsu, ukuran, URL `/uploads` bertanda tangan palsu atau kedaluwarsa | permintaan langsung | belum diuji |
| 11 | UAT awal | skenario stakeholder, lihat §6 | dengan pemangku kepentingan | belum dijadwalkan |

## 5. Matriks endpoint

Kolom "spec" menghitung berkas uji e2e (`apps/api/test`, `apps/web/e2e`) yang
menyebut jalurnya — itu tanda tersentuh, BUKAN bukti otorisasinya diuji.
"RBAC" berarti jalurnya ada di `peran-matriks-rbac.e2e-spec.ts`.
Prioritas: **P1** = terbuka bagi semua yang masuk (isolasi di service),
**P2** = berperan dan menulis, **P3** = sisanya.

| # | Metode | Jalur | Akses | Batas laju | Catatan | spec | RBAC | Prioritas |
| - | ------ | ----- | ----- | ---------- | ------- | ---- | ---- | --------- |
| 1 | GET | `/health` | publik | global |  | 4 |  | P3 |
| 2 | GET | `/audit-logs` | kabupaten | global |  | 5 |  | P3 |
| 3 | GET | `/audit-logs/retensi` | kabupaten | global |  | 1 |  | P3 |
| 4 | GET | `/audit-logs/:id` | kabupaten | global |  | 2 |  | P3 |
| 5 | POST | `/auth/dev-login` | publik | 30/menit |  | 6 |  | P3 |
| 6 | GET | `/auth/sso/login` | publik | 60/menit |  | 3 |  | P3 |
| 7 | GET | `/auth/sso/callback` | publik | 60/menit |  | 4 |  | P3 |
| 8 | POST | `/auth/logout` | semua yang masuk | global |  | 3 |  | P1 |
| 9 | POST | `/auth/logout-semua` | semua yang masuk | global |  | **0** |  | P1 |
| 10 | GET | `/auth/sesi` | semua yang masuk | global |  | **0** |  | P1 |
| 11 | POST | `/auth/consent` | semua yang masuk | global |  | 1 |  | P1 |
| 12 | GET | `/auth/roles` | semua yang masuk | global | tanpa peran dipilih | 2 |  | P1 |
| 13 | POST | `/auth/acting-role` | semua yang masuk | global | tanpa peran dipilih | 5 |  | P1 |
| 14 | GET | `/auth/me` | semua yang masuk | global |  | 8 |  | P1 |
| 15 | PATCH | `/auth/profile` | semua yang masuk | global | diaudit | 2 |  | P1 |
| 16 | POST | `/complaints` | responden | global | unggahan, diaudit | 20 | ya | P2 |
| 17 | GET | `/complaints` | semua yang masuk | global |  | 20 | ya | P1 |
| 18 | GET | `/complaints/:ticketNo` | semua yang masuk | global |  | 12 |  | P1 |
| 19 | PATCH | `/complaints/:id/status` | kabupaten, opd | global | diaudit | 3 |  | P2 |
| 20 | PATCH | `/complaints/:id/opd` | kabupaten | global | diaudit | 3 |  | P2 |
| 21 | GET | `/complaints/:id/replies` | semua yang masuk | global |  | 4 |  | P1 |
| 22 | POST | `/complaints/:id/replies` | kabupaten, opd, responden | global | unggahan, diaudit | 4 |  | P2 |
| 23 | GET | `/dashboard/opd` | opd | global |  | 2 |  | P3 |
| 24 | GET | `/statistics` | publik | global |  | 3 |  | P3 |
| 25 | GET | `/dokumentasi/openapi` | kabupaten | global |  | 1 |  | P3 |
| 26 | GET | `/surveys/:surveyId/results` | kabupaten, opd | global |  | 7 | ya | P3 |
| 27 | GET | `/surveys/:surveyId/results/export` | kabupaten, opd | global |  | 2 |  | P3 |
| 28 | GET | `/dashboard/ikm` | kabupaten | global |  | 3 |  | P3 |
| 29 | GET | `/notifications` | semua yang masuk | global |  | 4 |  | P1 |
| 30 | GET | `/notifications/unread-count` | semua yang masuk | global |  | 2 |  | P1 |
| 31 | PATCH | `/notifications/:id/read` | semua yang masuk | global |  | 1 |  | P1 |
| 32 | PATCH | `/notifications/read-all` | semua yang masuk | global |  | 2 |  | P1 |
| 33 | GET | `/opd` | semua yang masuk | global |  | 10 | ya | P1 |
| 34 | POST | `/opd/sync` | kabupaten | global | diaudit | 3 | ya | P2 |
| 35 | GET | `/opd/:id` | kabupaten, opd | global |  | 4 | ya | P3 |
| 36 | GET | `/surveys/:surveyId/questions` | kabupaten, opd | global |  | 8 |  | P3 |
| 37 | POST | `/surveys/:surveyId/questions` | kabupaten, opd | global | diaudit | 8 |  | P2 |
| 38 | PATCH | `/surveys/:surveyId/questions/reorder` | kabupaten, opd | global | diaudit | 1 |  | P2 |
| 39 | PATCH | `/questions/:id` | kabupaten, opd | global | diaudit | 3 |  | P2 |
| 40 | DELETE | `/questions/:id` | kabupaten, opd | global | diaudit | 3 |  | P2 |
| 41 | GET | `/ref/unsur` | kabupaten, opd | global |  | 1 |  | P3 |
| 42 | GET | `/ref/complaint-categories` | semua yang masuk | global |  | 1 |  | P1 |
| 43 | GET | `/public/surveys/:surveyId/fill` | publik | 20/menit |  | 4 |  | P3 |
| 44 | POST | `/public/surveys/:surveyId/responses` | publik | 20/menit |  | 5 |  | P3 |
| 45 | GET | `/surveys/:surveyId/fill` | responden | global |  | 11 |  | P3 |
| 46 | POST | `/surveys/:surveyId/responses` | responden | 10/menit | diaudit | 18 | ya | P2 |
| 47 | GET | `/me/survey-responses` | responden | global |  | **0** |  | P3 |
| 48 | GET | `/surveys/:surveyId/responses` | kabupaten, opd | global |  | 18 | ya | P3 |
| 49 | GET | `/surveys` | kabupaten, opd | global |  | 33 | ya | P3 |
| 50 | POST | `/surveys` | kabupaten, opd | global | diaudit | 33 | ya | P2 |
| 51 | GET | `/surveys/active` | responden | global |  | 4 | ya | P3 |
| 52 | GET | `/surveys/trash` | kabupaten, opd | global |  | 3 |  | P3 |
| 53 | GET | `/surveys/trash/retensi` | kabupaten, opd | global |  | 2 |  | P3 |
| 54 | GET | `/surveys/:id` | kabupaten, opd | global |  | 30 | ya | P3 |
| 55 | PATCH | `/surveys/:id` | kabupaten, opd | global | diaudit | 30 | ya | P2 |
| 56 | DELETE | `/surveys/:id` | kabupaten, opd | global | diaudit | 30 | ya | P2 |
| 57 | POST | `/surveys/:id/restore` | kabupaten, opd | global | diaudit | 1 |  | P2 |
| 58 | DELETE | `/surveys/:id/purge` | kabupaten, opd | global | diaudit | 4 |  | P2 |
| 59 | PATCH | `/surveys/:id/status` | kabupaten, opd | global | diaudit | 13 |  | P2 |
| 60 | PATCH | `/surveys/:id/jenis` | kabupaten, opd | global | diaudit | 3 |  | P2 |
| 61 | POST | `/surveys/:id/duplicate` | kabupaten, opd | global | diaudit | 2 |  | P2 |
| 62 | GET | `/users` | kabupaten | global |  | 7 | ya | P3 |
| 63 | POST | `/users` | kabupaten | global | diaudit | 7 | ya | P2 |
| 64 | GET | `/users/stats` | kabupaten | global |  | 1 |  | P3 |
| 65 | GET | `/users/:id` | kabupaten | global |  | 2 |  | P3 |
| 66 | PATCH | `/users/:id` | kabupaten | global | diaudit | 2 |  | P2 |
| 67 | PATCH | `/users/:id/status` | kabupaten | global | diaudit | 1 |  | P2 |
| 68 | DELETE | `/users/:id` | kabupaten | global | diaudit | 2 |  | P2 |

## 6. UAT awal

Belum dijadwalkan; menuntut pemangku kepentingan. Usulan skenario, satu per
peran, dijalankan di lingkungan lokal yang sama:

| Peran | Skenario |
| ----- | -------- |
| Warga | masuk, isi survei, kirim pengaduan berlampiran, ikuti balasannya sampai selesai |
| Admin OPD | buat survei SKM dan Custom, terbitkan, tanggapi pengaduan, ekspor hasil |
| Admin Kabupaten | pantau survei dan pengaduan semua OPD, teruskan pengaduan tanpa tujuan, kelola pengguna, baca log audit |
| Publik | isi survei tanpa akun lewat tautan/QR, buka statistik |

Yang dicatat per skenario: berhasil/tidak, langkah yang membingungkan, dan
waktu yang dibutuhkan.

## 7. Jadwal

| Hari | Bagian |
| ---- | ------ |
| 28 Okt | rencana ini; mulai #1 |
| 29 Okt | #1, #2 |
| 30 Okt | #3, #4, #5 |
| 31 Okt | #6, #7, #8 |
| 1 Nov | #9, #10, rangkum temuan |
| 2 Nov | UAT awal bila stakeholder tersedia; tutup laporan |

## 8. Hasil #1 — IDOR pada endpoint "semua yang masuk"

**Dijalankan:** 28 Oktober 2026, terhadap `main` di `46dae74`
(`ba4632c` menambah suitenya). **Hasil: nol celah.**

Suite: `apps/api/test/idor-semua-yang-masuk.e2e-spec.ts`, 24 uji, berjalan di
`skm_uji` lewat `pnpm --filter @skm-spm/api test:e2e`. Masuk lewat
SessionAuthProvider SUNGGUHAN (dev-login -> Bearer), bukan header `x-dev-*`:
di bawah StubAuthProvider identitas ditentukan header milik pemanggil
sendiri, sehingga menyamar adalah fitur uji, bukan serangan. Penyerang di sini
hanya memegang tokennya dan mengutak-atik jalur, kueri, dan badan permintaan.

Fixture: OPD A dan B; warga A dan B; Admin OPD A dan B; pengaduan warga A ke
OPD A, warga B ke OPD B, dan warga A tanpa tujuan, masing-masing berbalasan;
satu notifikasi warga A.

| Endpoint | Serangan | Hasil |
| -------- | -------- | ----- |
| `GET /complaints` | warga B dan Admin OPD B dengan `?opdId=<OPD A>` dan `?tanpaOpd=true` | tak satu pun pengaduan orang lain muncul; penyaring hanya mempersempit |
| `GET /complaints/:ticketNo` | warga B ke tiket warga A, warga A ke tiket warga B, Admin OPD B ke tiket OPD A, Admin OPD A ke tiket tanpa tujuan | 403, badan tanpa isi pengaduan |
| `GET /complaints/:id/replies` | ketiga silang yang sama lewat id angka | 403, badan tanpa isi balasan |
| `GET /notifications`, `/unread-count` | warga B | notifikasi warga A tak terlihat dan tak terhitung |
| `PATCH /notifications/:id/read` | warga B dengan id notifikasi warga A | 404, barisnya tetap belum dibaca |
| `PATCH /notifications/read-all` | warga B | notifikasi warga A tak tersentuh |
| `PATCH /auth/profile` | badan berisi `roles`, `opdId`, `email`, `id` | 400, akun tak berubah |
| `POST /auth/acting-role` | warga ke `kabupaten` | 403 |
| `GET /auth/me` | token warga B + header `x-dev-user-id` warga A + `x-dev-role: kabupaten` | header diabaikan, identitas tetap warga B |
| `GET /auth/sesi` | warga B | tak memuat sid warga A |
| `POST /auth/logout-semua` | warga B | sesi warga B putus, sesi warga A tetap hidup |

Sisa dari 17 endpoint tak berparameter sasaran sama sekali:
`POST /auth/logout`, `POST /auth/consent`, dan `GET /auth/roles` memakai
identitas dari token saja; `GET /opd` dan `GET /ref/complaint-categories`
adalah data rujukan yang sama bagi semua orang.

**Bukti suitenya tidak hampa.** Enam mutasi di service, satu per satu, lalu
dipulihkan:

| Mutasi | Uji yang memerah |
| ------ | ---------------- |
| `ownershipWhere` responden mengembalikan `{}` | 1 (daftar pengaduan) |
| `assertAccess` responden selalu lolos | 3 (tiket dan balasan) |
| `assertAccess` OPD selalu lolos | 4 (tiket dan balasan) |
| `markAsRead` tanpa saring `userId` | 2 |
| `markAllAsRead` tanpa saring `userId` | 1 |
| `findMine` tanpa saring `userId` | 1 |

Blok profil, peran, dan sesi bersandar pada `ValidationPipe` global
(`forbidNonWhitelisted`) dan penyimpan sesi; keduanya TIDAK dimutasi.

Gerbang penuh sesudahnya: API unit 1413/1413, API e2e 497/497 (43 suite,
termasuk suite ini), web komponen 1941/1941, eslint dan prettier kode 0.
Playwright tidak dijalankan; perubahannya hanya berkas uji `apps/api`.

**Pengamatan, bukan celah (rendah):**

- `GET /complaints/:ticketNo` menjawab **403** untuk tiket orang lain dan
  **404** untuk tiket yang tak ada, jadi keberadaan sebuah nomor tiket dapat
  ditebak. Notifikasi sengaja memakai 404 untuk keduanya. Isi tak bocor, dan
  `complaints.e2e-spec.ts` menetapkan 403 itu tersurat, jadi ini keputusan
  rancangan yang perlu dikonfirmasi pemilik produk, bukan cacat.
- Bagian acak nomor tiket (`generateTicketNo`) memakai `Math.random`, empat
  karakter base36 per hari (sekitar 1,68 juta kemungkinan). Tidak menjadi
  celah selama nomor tiket bukan kredensial — dan memang bukan, karena setiap
  pembacaan tetap diperiksa `assertAccess`.
