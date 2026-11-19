# Regresi Menyeluruh dan Verifikasi Perbaikan Bug

**Item roadmap:** `QA-REGRESSION` — "Regression seluruh modul setelah Fase 3 +
verifikasi perbaikan bug" (`docs/Roadmap-Timeline-AllRoles-ClickUp.csv`).
**Tanggal pelaksanaan:** 28 Oktober 2026
**Kode yang diuji:** `main` di `9000688`, pohon kerja bersih
**Cabang:** catatan ini hanya ada di `tester`.

---

## 1. Ringkasan

**Tidak ada regresi.** Ketujuh langkah gerbang verifikasi lulus dalam satu jalan,
termasuk e2e API dan Playwright:

| Lapisan                         | Suite | Uji   | Hasil                                    |
| ------------------------------- | ----- | ----- | ---------------------------------------- |
| Unit API (Jest)                 | 86    | 1.413 | 1.413 lulus                              |
| e2e API (Postgres sungguhan)    | 42    | 473   | 473 lulus                                |
| Komponen web (Jest + RTL + MSW) | 237   | 1.941 | 1.941 lulus                              |
| E2E web (Playwright, Chrome)    | 22    | 158   | 154 lulus, 2 goyah, 2 dilewati, 0 gagal  |
| ESLint seluruh repo             | —     | —     | kode 0                                   |
| Prettier                        | —     | —     | kode 0 (tidak berlaku untuk `apps/web`)  |

**Seluruh 48 temuan di `BUG_REPORTS.md` terverifikasi tetap tertutup.** 46 di
antaranya terkunci uji otomatis yang ikut lulus pada jalan di atas; dua sisanya
(BUG-003, BUG-009) ditutup dengan membuang kodenya, dan kodenya memang sudah
tidak ada di `main`. Empat catatan yang tidak mengubah status ada di akhir §5.

Perintah yang dijalankan, dari akar repo:

```bash
E2E_IDENTIFIER=seed-admin-kabupaten \
  node .claude/skills/verifikasi-penuh/scripts/verifikasi.mjs --e2e-api --e2e-web
```

## 2. Lingkungan

| Hal                 | Nilai                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Origin              | `http://skema.local` (nginx → web :3000, api :3001)                   |
| Basis data          | Playwright → `skm_db`; e2e API → `skm_uji` (dipisah sejak 12 Okt)     |
| Server yang menjawab | Postgres kontainer `skm-db` (172.18.0.2), dicek sebelum menulis       |
| Kontainer           | `skm-db` healthy, `skm-redis` healthy, `skm-proxy` hidup              |
| Peramban            | Chrome terpasang (`channel: 'chrome'`), satu pekerja                  |
| Akun                | `seed-admin-kabupaten` (tiga peran, ber-OPD) + akun seed per email    |

Data uji dibersihkan sesudahnya dengan `bersihkan-data-uji.mjs`: 8 survei,
3 pengaduan, 3 respons, 7 notifikasi berpenanda `[UJI `. `audit_logs` tidak
disentuh.

## 3. Cakupan per modul

Jumlah di bawah adalah berkas uji, bukan uji; semuanya ikut jalan di §1.

**Backend (`apps/api`)** — uji unit per modul:

| Modul         | Berkas | Modul         | Berkas |
| ------------- | ------ | ------------- | ------ |
| auth          | 23     | ikm           | 4      |
| surveys       | 7      | audit         | 3      |
| complaints    | 4      | opd           | 3      |
| dokumentasi   | 2      | questions     | 2      |
| reference     | 2      | users         | 2      |
| dashboard     | 1      | notifications | 1      |
| responses     | 1      | turnstile     | 1      |
| `common/`     | 21     | e2e (`test/`) | 42     |

**Frontend (`apps/web`)** — uji komponen per fitur:

| Fitur           | Berkas | Fitur           | Berkas |
| --------------- | ------ | --------------- | ------ |
| surveys         | 66     | complaints      | 22     |
| analytics       | 10     | authentication  | 9      |
| dokumentasi-api | 9      | notifications   | 6      |
| profile         | 6      | dashboard       | 5      |
| about           | 4      | users           | 4      |
| audit-logs      | 3      | dashboards      | 3      |
| opd             | 3      | statistics      | 3      |
| `app/` (halaman) | 30    | `components/`   | 38     |
| lainnya         | 16     | Playwright      | 22 spec |

## 4. Uji goyah dan uji yang dilewati

**Dua goyah** — gagal pada percobaan pertama, lulus saat diulang. Keduanya
karena halaman belum siap dalam 30 detik, bukan asersi yang salah:

| Uji | Sebab percobaan pertama |
| --- | ----------------------- |
| `kerangka-unsur-tata-letak` — modal Buat Survei, ponsel 320x568 | tombol "Buat Survei" tak dapat ditekan dalam 30 detik |
| `responsif-komponen` — panel notifikasi di 320px | panel tak pernah terbuka |

Pola yang sama tercatat sejak 23 September 2026: kegoyahan suite ini berpindah
uji tiap jalan dan tidak hilang dengan build produksi.

**Dua dilewati** — "konfirmasi hapus permanen di Sampah" di 320px dan 390px.
Sah: Sampah memang kosong, dicocokkan ke basis data (0 survei ber-`deleted_at`).

## 5. Verifikasi perbaikan bug

Cara verifikasi: untuk tiap temuan, pagarnya diambil dari berkas uji yang
diubah commit perbaikan yang disebut seksinya, ditambah berkas uji yang
disebut namanya. Setiap pagar dipastikan ada di `main` dan termasuk suite yang
lulus di §1. Temuan yang tak menghasilkan pagar lewat cara itu diperiksa satu
per satu (kolom Keterangan).

| Temuan | Severity | Pagar (contoh) | Jumlah berkas | Hasil | Keterangan |
| ------ | -------- | -------------- | ------------- | ----- | ---------- |
| [BUG-001](BUG_REPORTS.md#bug-001) | High | `AdminNavbarIdentitas.test.jsx` | 1 | tetap tertutup | pagar ada; seksinya basi (lihat catatan) |
| [BUG-002](BUG_REPORTS.md#bug-002) | Low | `NotificationDropdown.test.jsx` | 1 | tetap tertutup |  |
| [BUG-003](BUG_REPORTS.md#bug-003) | Low | — | — | tetap tertutup | kode dibuang: `MapSection.jsx` tidak ada di `main` (0 berkas) |
| [BUG-004](BUG_REPORTS.md#bug-004) | Low | `QuestionCard.test.jsx`, `BuilderSatuLayar.test.jsx` | 2 | tetap tertutup | pilihan ganda kini didukung sungguhan |
| [BUG-005](BUG_REPORTS.md#bug-005) | Critical | `QuestionCard.test.jsx`, `surveys.e2e-spec.ts` … | 3 | tetap tertutup |  |
| [BUG-006](BUG_REPORTS.md#bug-006) | High | `session-cookie.service.spec.ts`, `session.service.spec.ts` | 2 | tetap tertutup | modul sesi backend |
| [BUG-007](BUG_REPORTS.md#bug-007) | Low | `AdminResolutionWorkspace.test.jsx`, `ChatReplyForm.test.jsx` … | 3 | tetap tertutup |  |
| [BUG-008](BUG_REPORTS.md#bug-008) | Medium | `CreateComplaintForm.test.jsx` | 1 | tetap tertutup |  |
| [BUG-009](BUG_REPORTS.md#bug-009) | Medium | — | — | tetap tertutup | kode dibuang: `admin-kab/users/create` tidak ada di `main` (0 berkas) |
| [BUG-010](BUG_REPORTS.md#bug-010) | Low | `NotificationDropdown.test.jsx`, `NotificationHistoryScreen.test.jsx` … | 18 | tetap tertutup |  |
| [BUG-011](BUG_REPORTS.md#bug-011) | Low | `page.test.jsx` | 1 | tetap tertutup |  |
| [BUG-012](BUG_REPORTS.md#bug-012) | Low | `page.test.jsx` | 1 | tetap tertutup |  |
| [BUG-013](BUG_REPORTS.md#bug-013) | High | `dashboard.e2e-spec.ts`, `dashboard.service.spec.ts` … | 3 | tetap tertutup |  |
| [BUG-014](BUG_REPORTS.md#bug-014) | Medium | `notifications.service.spec.ts`, `notifikasi-siklus.spec.js` … | 3 | tetap tertutup |  |
| [BUG-015](BUG_REPORTS.md#bug-015) | Medium | `GantiJenisModal.test.jsx`, `ModalKirimSurvei.test.jsx` … | 6 | tetap tertutup |  |
| [BUG-016](BUG_REPORTS.md#bug-016) | Medium | `ModalKirimSurvei.test.jsx`, `isi-survei-anonim.spec.ts` … | 3 | tetap tertutup |  |
| [BUG-017](BUG_REPORTS.md#bug-017) | Medium | `Dropdown.test.jsx`, `pagar-bug-015-dialog-konfirmasi.test.jsx` … | 5 | tetap tertutup |  |
| [BUG-018](BUG_REPORTS.md#bug-018) | Low | `complaints.service.spec.ts`, `notifications.e2e-spec.ts` … | 4 | tetap tertutup |  |
| [BUG-019](BUG_REPORTS.md#bug-019) | Medium | `auth.controller.spec.ts`, `sso-galat.spec.js` … | 5 | tetap tertutup |  |
| [BUG-020](BUG_REPORTS.md#bug-020) | Low | `complaints.e2e-spec.ts`, `complaints.service.spec.ts` | 2 | tetap tertutup | celah tercatat (lihat catatan) |
| [BUG-021](BUG_REPORTS.md#bug-021) | Medium | `AdminNavbarIdentitas.test.jsx`, `AuthCallbackLoader.test.jsx` … | 42 | tetap tertutup | satu sebutan sudah dihapus sebelum temuannya ada |
| [BUG-022](BUG_REPORTS.md#bug-022) | High | `isi-survei-anonim.spec.ts` | 1 | tetap tertutup |  |
| [BUG-023](BUG_REPORTS.md#bug-023) | Medium | `pagar-detektor-responsif.spec.ts`, `percakapan-pengaduan-responsif.spec.ts` … | 3 | tetap tertutup |  |
| [BUG-024](BUG_REPORTS.md#bug-024) | Medium | `pagar-detektor-responsif.spec.ts`, `percakapan-pengaduan-responsif.spec.ts` … | 3 | tetap tertutup |  |
| [BUG-025](BUG_REPORTS.md#bug-025) | Low | `pagar-detektor-responsif.spec.ts`, `percakapan-pengaduan-responsif.spec.ts` … | 3 | tetap tertutup |  |
| [BUG-026](BUG_REPORTS.md#bug-026) | Medium | `isi-survei-anonim.spec.ts` | 1 | tetap tertutup |  |
| [BUG-027](BUG_REPORTS.md#bug-027) | Medium | `auth.controller.spec.ts`, `isi-survei-anonim.spec.ts` … | 7 | tetap tertutup |  |
| [BUG-028](BUG_REPORTS.md#bug-028) | Medium | `multer-galat.util.spec.ts`, `all-exceptions.filter.spec.ts` | 2 | tetap tertutup | tanpa penanda `<a id>` |
| [BUG-029](BUG_REPORTS.md#bug-029) | Medium | `sso-galat.util.spec.ts`, `sso-unconfigured.e2e-spec.ts` | 2 | tetap tertutup | lanjutan terbuka (lihat catatan) |
| [BUG-030](BUG_REPORTS.md#bug-030) | Medium | `proteksi-route.spec.js` | 1 | tetap tertutup | pagar 502 palsu di akhir berkas |
| [BUG-031](BUG_REPORTS.md#bug-031) | Medium | `KitUiBersama.test.jsx` | 1 | tetap tertutup |  |
| [BUG-032](BUG_REPORTS.md#bug-032) | Low | `KitUiBersama.test.jsx` | 1 | tetap tertutup |  |
| [BUG-033](BUG_REPORTS.md#bug-033) | Low | `KitUiBersama.test.jsx` | 1 | tetap tertutup |  |
| [BUG-034](BUG_REPORTS.md#bug-034) | Low | `KitUiBersama.test.jsx` | 1 | tetap tertutup |  |
| [BUG-035](BUG_REPORTS.md#bug-035) | Medium | `BuilderLebarSidebar.test.jsx`, `LebarSidebarVariabel.test.jsx` … | 6 | tetap tertutup |  |
| [BUG-036](BUG_REPORTS.md#bug-036) | Low | `nama-terakses.spec.ts`, `poster-qr-survei.spec.ts` … | 3 | tetap tertutup |  |
| [BUG-037](BUG_REPORTS.md#bug-037) | Low | `ShareSurveyModal.test.jsx`, `responsif-komponen.spec.ts` | 2 | tetap tertutup |  |
| [BUG-038](BUG_REPORTS.md#bug-038) | Low | `AuthCallbackLoader.test.jsx`, `ConsentGate.test.jsx` … | 19 | tetap tertutup |  |
| [BUG-039](BUG_REPORTS.md#bug-039) | Low | `SurveyFormModalDialog.test.jsx` | 1 | tetap tertutup |  |
| [BUG-040](BUG_REPORTS.md#bug-040) | Low | `AdminSurveyCardUtama.test.jsx`, `SurveyMonitoringTable.test.jsx` … | 3 | tetap tertutup |  |
| [BUG-041](BUG_REPORTS.md#bug-041) | Low | `AdminSurveyCardUtama.test.jsx`, `BadgeClassName.test.jsx` … | 5 | tetap tertutup |  |
| [BUG-042](BUG_REPORTS.md#bug-042) | Low | `TombolSidebarAria.test.jsx` | 1 | tetap tertutup |  |
| [BUG-043](BUG_REPORTS.md#bug-043) | Medium | `FAQSectionAria.test.jsx`, `FilterPonselAria.test.jsx` … | 5 | tetap tertutup |  |
| [BUG-044](BUG_REPORTS.md#bug-044) | Low | `FAQSectionAria.test.jsx`, `FilterPonselAria.test.jsx` … | 5 | tetap tertutup |  |
| [BUG-045](BUG_REPORTS.md#bug-045) | Low | `FAQSectionAria.test.jsx` | 1 | tetap tertutup |  |
| [BUG-046](BUG_REPORTS.md#bug-046) | Low | `BadgeClassName.test.jsx`, `BadgeJarakBaris.test.js` | 2 | tetap tertutup |  |
| [BUG-047](BUG_REPORTS.md#bug-047) | Medium | `NilaiSurvei.test.jsx`, `NilaiSurveiDiKartuDanRingkasan.test.jsx` … | 3 | tetap tertutup |  |
| [BUG-048](BUG_REPORTS.md#bug-048) | Low | `AksiTabelPengaduan.test.jsx` | 1 | tetap tertutup |  |

**Catatan dari verifikasi ini:**

- **BUG-001 sudah terkunci, dokumennya belum tahu.** Seksinya masih berbunyi
  "belum terkunci uji otomatis", padahal
  `components/layouts/__tests__/AdminNavbarIdentitas.test.jsx` (TC-FE-028)
  mengunci kedua navbar admin dan lulus pada jalan ini.
- **BUG-021**: satu berkas yang disebut seksinya,
  `PemilihPeranDanCallback.test.jsx`, sudah dihapus 15 September (`8bb3701`)
  sebelum temuan ini ada. Bukan pagar yang hilang; 42 berkas lain menjaganya.
- **BUG-020 masih punya celah yang ditulis seksinya sendiri:** keempat medan
  boolean yang ada berpagar, tetapi tak ada yang mencegah bentuk cacat yang
  sama tersalin ke DTO boolean berikutnya.
- **BUG-029 masih punya lanjutan terbuka yang ditulis seksinya:** memagari
  pesan 5xx dengan `app.nodeEnv === 'production'`. Penutupannya sah; lanjutannya
  belum dikerjakan.
- **BUG-028, BUG-029, BUG-030 tak punya penanda `<a id>`** di `BUG_REPORTS.md`,
  jadi tautan `#bug-028` dan seterusnya di tabel ringkasan tidak mengarah ke
  mana pun.

## 6. Yang tidak dicakup

- **Uji beban** ada di `TEST_BEBAN.md` dan tidak diulang di sini.
- **Jalur SSO Helpdesk sungguhan** tidak dijalankan; Playwright masuk lewat
  dev-login. Pemetaan klaim SSO dijaga uji unit dan e2e API.
- **Playwright tidak berjalan di CI.** Regresi lapisan ini hanya terukur saat
  dijalankan dengan tangan seperti di sini; tiga cacat yang ditemukan
  27 Oktober (BUG-047, BUG-048, dua spec basi) lolos lebih dari sehari karena itu.

---

## 7. Regresi ulang 12 November 2026 (QA-FINAL-UAT)

**Kode yang diuji:** `main` di `6e84a4b` (sama dengan `origin/main`), pohon
kerja bersih. Alasan diulang: sembilan PR masuk ke `main` sesudah pengukuran
terakhir, 9 sampai 11 November:

| PR  | Merge     | Isi                                                              |
| --- | --------- | ---------------------------------------------------------------- |
| #26 | `b756b81` | fragment galat SSO membawa kode, bukan kalimat                   |
| #27 | `1892fde` | halaman galat SSO tidak lagi mengakhiri sesi                     |
| #28 | `b0a6172` | galat callback SSO tak lagi dapat memalsukan baris log           |
| #29 | `29f02f9` | daftar OPD tidak lagi mengirim agregat admin ke semua peran      |
| #30 | `29d8a85` | Redis putus dicatat sekali                                       |
| #31 | `615f643` | tambalan keamanan dependensi dalam mayor yang sama               |
| #32 | `ffb6f96` | README diselaraskan                                              |
| #33 | `5cd8357` | teks antarmuka tanpa tanda pisah                                 |
| #34 | `6e84a4b` | tata letak hero, kartu statistik, dan label sumbu chart tren     |

### 7.1 Hasil

**Tidak ada regresi.** Ketujuh langkah gerbang lulus dalam satu jalan:

| Lapisan                         | Suite | Uji   | Hasil                                   | 28 Okt (§1) |
| ------------------------------- | ----- | ----- | --------------------------------------- | ----------- |
| Unit API (Jest)                 | 99    | 1.584 | 1.584 lulus                             | 86 / 1.413  |
| e2e API (Postgres sungguhan)    | 53    | 777   | 777 lulus                               | 42 / 473    |
| Komponen web (Jest + RTL + MSW) | 269   | 2.219 | 2.219 lulus                             | 237 / 1.941 |
| E2E web (Playwright, Chrome)    | 24    | 167   | 164 lulus, 3 goyah, 0 dilewati, 0 gagal | 22 / 158    |
| ESLint seluruh repo             | —     | —     | kode 0                                  | kode 0      |
| Prettier                        | —     | —     | kode 0 (tidak berlaku untuk `apps/web`) | kode 0      |

Durasi: unit API 60 dtk, e2e API 249 dtk, komponen web 153 dtk, Playwright
19 menit. Perintahnya sama dengan §1:

```bash
E2E_IDENTIFIER=seed-admin-kabupaten \
  node .claude/skills/verifikasi-penuh/scripts/verifikasi.mjs --e2e-api --e2e-web
```

**Nol dilewati, berbeda dengan 28 Oktober.** Dua uji "hapus permanen di
Sampah" yang dulu dilewati kini jalan dan lulus.

### 7.2 Lingkungan

Sama dengan §2, dengan dua perbedaan. Server yang menjawab dicek sebelum
menulis: `DATABASE_URL` menunjuk `localhost:5432/skm_db`, dan yang menjawab
Postgres 18.4 di kontainer `skm-db` (kini 172.18.0.3). Akun
`seed-admin-kabupaten` (id 1) dicek punya `{kabupaten,responden,opd}`, ber-OPD,
aktif, tidak terhapus.

### 7.3 Uji goyah

Ketiganya gagal pada percobaan pertama, lalu lulus saat diulang. Sebabnya
halaman yang belum siap, bukan asersi yang salah. Polanya sama dengan §4.

| Uji | Sebab percobaan pertama |
| --- | ----------------------- |
| `nilai-survei-tata-letak.spec.ts:25` — ponsel, memilih Custom | kartu jenis survei tak dapat diklik dalam 30 detik |
| `pengaduan-tata-letak.spec.js:44` — tabel sidebar ciut | `beforeEach`: `waitForURL` ke `/admin-kab/dashboard` habis waktu sesudah `domcontentloaded` |
| `responsif-komponen.spec.ts:170` — menu akun di 390px | penjaga fixture berhenti: lembar gaya belum berlaku (`--spacing-xs` kosong) |

Uji ketiga gagal dengan sengaja: penjaganya menolak mengukur halaman tanpa CSS,
supaya tidak melaporkan cacat palsu.

### 7.4 Data uji

Dibersihkan sesudahnya dengan `bersihkan-data-uji.mjs` (sasaran `skm_db`,
lolos palang): 5 pengaduan, 8 survei, 3 respons, 25 notifikasi, dan 1 berkas
unggahan tak tertaut (71 byte). Penyapuan `--tanpa-induk --dry` sesudahnya
menemukan 0 notifikasi tanpa induk. `audit_logs` tidak disentuh.

### 7.5 Yang tidak dicakup

- **Tabel verifikasi perbaikan bug seperti §5 tidak diulang.** Ada 21 temuan
  yang lahir dan ditutup sesudah 28 Oktober: BUG-049 s.d. 062, 064, 070, 071,
  076, 079, 080, dan 081. Pagarnya ada di suite yang ikut lulus di §7.1,
  tetapi belum dicocokkan satu per satu ke berkas ujinya. Yang masih terbuka
  ada 16 temuan, tiga di antaranya Medium (BUG-073, 077, 078).
  **Diperbarui 12 November 2026:** dikerjakan di §7.6, bersama tiga Medium
  yang ditutup pada hari yang sama.
- **SSO Helpdesk sungguhan dan sinkron OPD nyata** tidak dijalankan. Sinkron
  OPD masih ditolak Helpdesk (401 `invalid api key`) sejak 9 November.
- **Uji beban** tidak diulang; lihat `TEST_BEBAN.md` §15.
- Catatan §6 tentang Playwright di CI sudah usang: sejak 30 Oktober 2026 job
  `e2e-web` jalan pada setiap push dan PR, tetapi masih `continue-on-error`,
  jadi belum menjadi gerbang.

### 7.6 Verifikasi perbaikan bug sesudah 28 Oktober

Menjawab butir pertama §7.5. Caranya sama dengan §5: untuk tiap temuan, commit
perbaikannya dicari di `main` lewat `git log --grep`, lalu berkas uji yang
diubah commit itu dipastikan masih ada di `main` `d6b3beb`. Karena satu commit
kadang memperbaiki beberapa temuan sekaligus (`f3d5659` lima, `938a4b0` tiga),
tiap berkas dicocokkan lagi dengan keterangan penutupan di `BUG_REPORTS.md`
dan dengan asersi di dalamnya. Pagar yang berupa pemindai seluruh kode (BUG-054,
BUG-057) diperiksa memang membaca berkas yang diperbaiki.

Sumber "lulus": 21 temuan pertama ditutup sebelum `6e84a4b`, jadi pagarnya ikut
lulus di §7.1. BUG-073, 077, dan 078 ditutup sesudahnya; pagarnya lulus di CI
3 dari 3 job pada `d6b3beb`.

| Temuan | Severity | Pagar | Jumlah berkas | Hasil | Keterangan |
| ------ | -------- | ----- | ------------- | ----- | ---------- |
| [BUG-049](BUG_REPORTS.md#bug-049) | Medium | `ikm-export.service.spec.ts`, `CsvSatuPintu.test.js`, `unduh.test.js` | 3 | tetap tertutup |  |
| [BUG-050](BUG_REPORTS.md#bug-050) | Low | `sqli-asap.e2e-spec.ts` | 1 | tetap tertutup | uji `startDate`/`endDate` |
| [BUG-051](BUG_REPORTS.md#bug-051) | Low | `sqli-asap.e2e-spec.ts`, `pola-like.spec.ts`, `sso.service.spec.ts` | 3 | tetap tertutup |  |
| [BUG-052](BUG_REPORTS.md#bug-052) | Medium | `csrf-origin.e2e-spec.ts` | 1 | tetap tertutup |  |
| [BUG-053](BUG_REPORTS.md#bug-053) | Medium | `NilaiSurveiDiKartuDanRingkasan.test.jsx` | 1 | tetap tertutup | pagarnya suite itu sendiri: 0 penanda konflik di `main`, dan suitenya jalan |
| [BUG-054](BUG_REPORTS.md#bug-054) | Medium | `tanpaMaxWTokenSpasi.test.js` | 1 | tetap tertutup | pemindai seluruh kode tampilan |
| [BUG-055](BUG_REPORTS.md#bug-055) | Medium | `GerbangPengisianPublik.test.jsx` | 1 | tetap tertutup | asersi "nama, nomor HP, jenis kelamin, dan kelompok umur" |
| [BUG-056](BUG_REPORTS.md#bug-056) | Low | `SurveyProgressJudul.test.jsx` | 1 | tetap tertutup |  |
| [BUG-057](BUG_REPORTS.md#bug-057) | Low | `BadgeJarakBaris.test.js` | 1 | tetap tertutup | pemindai; ukuran di Chrome tak pernah diukur |
| [BUG-058](BUG_REPORTS.md#bug-058) | Medium | `headerKeamananWeb.test.js` | 1 | tetap tertutup |  |
| [BUG-059](BUG_REPORTS.md#bug-059) | Low | `all-exceptions.filter.spec.ts` | 1 | tetap tertutup |  |
| [BUG-060](BUG_REPORTS.md#bug-060) | Low | — | 0 | tetap tertutup | **tanpa pagar otomatis.** `server_tokens off;` masih ada di `dev.conf` dan `prod.conf` (baris 40); header tidak diukur ulang |
| [BUG-061](BUG_REPORTS.md#bug-061) | Low | `ConfirmStatusModalDialog.test.jsx`, `DropdownFokusSesudahMemilih.test.jsx`, `StatusFokusKembali.test.jsx` | 3 | tetap tertutup |  |
| [BUG-062](BUG_REPORTS.md#bug-062) | Low | `ForwardComplaintModalDialog.test.jsx` | 1 | tetap tertutup |  |
| [BUG-064](BUG_REPORTS.md#bug-064) | Low | `audit.interceptor.spec.ts`, `audit.e2e-spec.ts`, `auditLog.adapter.test.js`, `AuditChanges.test.jsx` | 4 | tetap tertutup |  |
| [BUG-070](BUG_REPORTS.md#bug-070) | Medium | `session-auth.provider.spec.ts`, `redis-macet.e2e-spec.ts` | 2 | tetap tertutup | jalur cookie SSO tetap belum diuji |
| [BUG-071](BUG_REPORTS.md#bug-071) | Medium | `klien-redis.spec.ts`, `redis-macet.e2e-spec.ts` | 2 | tetap tertutup |  |
| [BUG-073](BUG_REPORTS.md#bug-073) | Medium | `cadangan-terjadwal.service.spec.ts`, `cadangan.spec.ts`, `notifications.service.spec.ts`, `notificationJenis.test.js` | 4 | tertutup 12 Nov | syarat server di luar kode, lihat seksinya |
| [BUG-076](BUG_REPORTS.md#bug-076) | Medium | `AdminResolutionWorkspace.test.jsx` | 1 | tetap tertutup |  |
| [BUG-077](BUG_REPORTS.md#bug-077) | Medium | `alihkan-pengaduan.e2e-spec.ts`, `complaints.service.spec.ts`, `ForwardComplaintModalLintasTingkat.test.jsx` | 3 | tertutup 12 Nov |  |
| [BUG-078](BUG_REPORTS.md#bug-078) | Medium | `complaints-balapan.e2e-spec.ts`, `complaints.service.spec.ts` | 2 | tertutup 12 Nov |  |
| [BUG-079](BUG_REPORTS.md#bug-079) | Medium | `CreateComplaintForm.test.jsx`, `ajukan-pengaduan.spec.js` | 2 | tetap tertutup |  |
| [BUG-080](BUG_REPORTS.md#bug-080) | Medium | `CreateComplaintForm.test.jsx`, `AlihkanComplaintModal.test.jsx`, `api.test.js` | 3 | tetap tertutup |  |
| [BUG-081](BUG_REPORTS.md#bug-081) | Low | `lencanaStatusPengaduan.test.jsx` | 1 | tetap tertutup |  |

**Hasil: 24 dari 24 tetap tertutup. 23 punya pagar otomatis di `main`, dan
semua berkasnya ada.** Satu-satunya tanpa pagar adalah BUG-060, perbaikan
konfigurasi nginx yang dulu dibuktikan lewat header jawaban server hidup.
Kalau `server_tokens off;` terhapus, tak ada uji yang memerah.

Batas cara ini: ia membuktikan pagarnya ada dan lulus, bukan bahwa pagarnya
masih akan memerah bila cacatnya kembali. Uji mutasi hanya dijalankan saat
temuan ditutup (dicatat di seksi masing-masing), tidak diulang di sini.

Sesudah §7.6, temuan terbuka tinggal 14, semuanya Low.

---

## 8. Regresi ulang 19 November 2026 (QA-FINAL-UAT)

**Kode yang diuji:** `main` di `0401009` (sama dengan `origin/main`), pohon
kerja bersih. Alasan diulang: 28 merge masuk ke `main` sesudah §7, dari
`faeaee8` (#34, `fix/survey-ui`) sampai `0401009` (#61, BUG-094). Isinya
perbaikan temuan yang ditutup sesudah §7 beserta pagarnya, cadangan harian terjadwal,
`GET /health/siap`, indeks dan agregasi statistik, serta uji baru TC-IKM-011/012
dan TC-FE-008. Daftar lengkapnya:
`git log --merges --first-parent 6e84a4b..0401009`.

### 8.1 Hasil

**Tidak ada regresi.** Enam dari tujuh langkah lulus. Langkah Playwright keluar
dengan kode 1 karena satu uji gagal pada kedua percobaannya, tetapi uji itu
lulus ketika berkasnya dijalankan ulang sendiri (§8.3), jadi ia dinilai goyah,
bukan regresi.

| Lapisan                         | Suite | Uji   | Hasil                                             | 12 Nov (§7) |
| ------------------------------- | ----- | ----- | ------------------------------------------------- | ----------- |
| Unit API (Jest)                 | 106   | 1.649 | 1.649 lulus                                       | 99 / 1.584  |
| e2e API (Postgres sungguhan)    | 58    | 807   | 807 lulus                                         | 53 / 777    |
| Komponen web (Jest + RTL + MSW) | 271   | 2.258 | 2.258 lulus                                       | 269 / 2.219 |
| E2E web (Playwright, Chrome)    | 29    | 176   | 168 lulus, 6 goyah, 1 dilewati, **1 gagal**       | 24 / 167    |
| ESLint seluruh repo             | —     | —     | kode 0                                            | kode 0      |
| Prettier                        | —     | —     | kode 0 (tidak berlaku untuk `apps/web`)           | kode 0      |

Durasi: unit API 70 dtk, e2e API 273 dtk, komponen web 150 dtk, Playwright
23 menit. Perintahnya sama dengan §1 dan §7:

```bash
E2E_IDENTIFIER=seed-admin-kabupaten \
  node .claude/skills/verifikasi-penuh/scripts/verifikasi.mjs --e2e-api --e2e-web
```

Satu uji Playwright dilewati. Reporter `list` yang berjalan tanpa terminal
tidak mencetak penanda per uji, jadi uji mana yang dilewati tidak tercatat di
keluaran. CI `main` `0401009` juga mencatat tepat satu dilewati.

### 8.2 Lingkungan

Sama dengan §7.2. Sebelum menulis apa pun: `DATABASE_URL` menunjuk
`localhost:5432/skm_db`, dan yang menjawab Postgres 18.4 di kontainer `skm-db`.
Ketiga kontainer hidup (`skm-db` dan `skm-redis` sehat). Akun
`seed-admin-kabupaten` (id 1) memegang `{kabupaten,responden,opd}`, ber-OPD,
aktif, tidak terhapus. Server dev menjawab 200 di `http://skema.local` dan
`/api/v1/health`.

### 8.3 Uji yang gagal

| Uji | Sebab |
| --- | ----- |
| `nilai-survei-alur.spec.ts:256` — membuat survei custom lewat UI builder | `locator.click` habis waktu 30 detik menunggu pemilih jenis survei (`radiogroup` "jenis survei") di `/admin-opd/surveys/builder/new`. Tak ada cuplikan halaman yang terekam |

Berkasnya dijalankan ulang sendiri sesudah suite penuh selesai:

```bash
E2E_IDENTIFIER=seed-admin-kabupaten \
  pnpm --filter @skm-spm/web exec playwright test e2e/nilai-survei-alur.spec.ts
```

Hasilnya **6 dari 6 lulus dalam 22,9 detik, tanpa percobaan ulang.** Uji lain di
berkas yang sama (`:175`) juga goyah pada jalan penuh. Polanya sama dengan §4
dan §7.3: halaman lambat siap di tengah suite penuh, bukan asersi yang salah.
Bukti ini terbatas pada satu jalan ulang; ia tidak menyingkirkan kemungkinan
uji itu goyah lagi di jalan berikutnya.

### 8.4 Uji goyah

Keenamnya gagal pada percobaan pertama lalu lulus saat diulang.

| Uji | Sebab percobaan pertama |
| --- | ----------------------- |
| `dokumentasi-api.spec.ts:124` — unduh dokumen OpenAPI | peristiwa `download` tak datang dalam 90 detik |
| `nilai-survei-alur.spec.ts:175` — panel Nilai Survei di builder | `page.goto` habis waktu 30 detik |
| `pengaduan-tata-letak.spec.js:97` — kasus terburuk sidebar lebar | `beforeEach` habis waktu 30 detik |
| `proteksi-route.spec.js:158` — matriks admin OPD | server menjawab `HTTP 504` untuk `/admin-kab/dashboard` di tengah sapuan; spec menghentikan dirinya karena hasil sapuan tak dapat dipercaya |
| `responsif-komponen.spec.ts:447` — sasaran sentuh beranda 390px | navbar masih menampilkan tombol masuk sesudah 10 detik walau token dan peran sudah ada di penyimpanan |
| `sso-galat.spec.js:85` — fragment berteks bebas | `page.goto` habis waktu 30 detik |

Lima dari enam berpola waktu habis. Yang keenam, `504` dari proxy, juga
waktu habis tetapi di sisi nginx. Jumlah goyah naik dari tiga (§7.3) menjadi
enam, dan suite tumbuh dari 167 menjadi 176 uji. Sebabnya belum diselidiki.

**Pembaruan 19 November 2026 (sore):** sebabnya kini diselidiki dan dicatat
sebagai [BUG-095](BUG_REPORTS.md#bug-095). Penerusan Docker Desktop sesekali
menelan sambungan TCP baru dari `skm-proxy` ke server dev, dan nginx menunggu
60 detik sebelum menjawab 504. Ini juga menjelaskan `504` pada
`proteksi-route.spec.js:158`. Perbaikannya commit `99e8ed5` di cabang
`fix/nginx-dev-sambungan-goyah`, hanya `infra/nginx/dev.conf`. Ia masuk
`main` lewat PR #62 (merge `018b3ba`), dan CI `main` hijau 3 dari 3 job.
Playwright penuh dengan konfigurasi itu: 176 lulus, 0 goyah, 13,4 menit.
Itu satu jalan dan belum tren. Tabel di atas tetap rekaman regresi pada
`0401009`.

**Jalan kedua, 19 November 2026 (sore), `main` `018b3ba`:** 174 lulus, 1
goyah, 1 gagal, 15,3 menit. Sebelum jalan, `skm-proxy` dipastikan memuat
konfigurasi baru: `grep -c 'keepalive 16'` di dalam kontainer menjawab 2,
tetapi worker nginx lebih tua dari berkas konfigurasinya, jadi pengguna
menjalankan `nginx -s reload` dan worker baru berumur 30 detik saat suite
dimulai.

| Jalan                   | Goyah | Gagal | Durasi     |
| ----------------------- | ----- | ----- | ---------- |
| §8.1, sebelum perbaikan | 6     | 1     | 23 menit   |
| Pertama sesudah BUG-095 | 0     | 0     | 13,4 menit |
| Kedua sesudah BUG-095   | 1     | 1     | 15,3 menit |

Kedua uji yang tidak lulus berada di `xss-tersimpan.spec.js`, spec terakhir,
yang berjalan `serial`. `:168` (Admin Kabupaten) gagal pada percobaan pertama
karena data pengaduan tak pernah tiba di halaman, lalu seluruh grup diulang;
ulangan `:142` (warga) gagal karena `POST /auth/dev-login` dijawab `HTTP 502`.
Karena `:142` lulus pada percobaan pertama, Playwright menghitungnya goyah.

**Sebabnya bukan pola BUG-095.** Sepanjang 15 menit log `skm-proxy` tidak
memuat satu pun `504` atau `upstream timed out`. Kesepuluh jawaban 5xx jatuh
di 07:10:14 sampai 07:10:21 UTC, semuanya `connect() failed (111: Connection
refused)` ke `:3001`: proses API berhenti mendengarkan, bukan sambungannya yang
tertelan. Sampai 07:10:12 API masih menjawab 200. `nest start --watch` tetap
hidup dan menyalakan proses API baru pada 07:11:19 UTC; Nest CLI 11.0.24 hanya
melakukannya sesudah kompilasi ulang berhasil. Tidak ada berkas di repo (di
luar `node_modules`, `.next`, dan `.git`) yang berubah antara 14:09:30 dan
14:11:30 WIB, dan log peristiwa Windows kosong.
Keluaran terminal `pnpm dev` pada jam itu tidak terbaca, jadi **sebab API
berhenti belum diketahui** dan tidak dicatat sebagai temuan. Bila terulang,
baca terminal `pnpm dev` lebih dulu.

Dengan begitu dua jalan sesudah perbaikan sama-sama tanpa jejak BUG-095. Itu
masih dua sampel, belum tren. Data uji sesudah jalan ini dibersihkan: 10
pengaduan, 9 survei, 3 respons, 37 notifikasi; `--tanpa-induk` menemukan 0.

### 8.5 Data uji

Dibersihkan dua kali dengan `bersihkan-data-uji.mjs` (sasaran `skm_db`, lolos
palang). Sesudah suite penuh: 10 pengaduan, 8 survei, 4 respons, dan 40
notifikasi. Sesudah jalan ulang §8.3: 3 survei, 1 respons, dan 3 notifikasi.
Penyapuan `--tanpa-induk` sesudahnya menemukan 0 notifikasi tanpa induk.
`audit_logs` tidak disentuh.

### 8.6 Yang tidak dicakup

- **Tabel verifikasi perbaikan bug seperti §7.6 tidak diulang** untuk temuan
  yang ditutup sesudah 12 November. Pagarnya ikut lulus di §8.1, tetapi belum
  dicocokkan satu per satu ke berkas ujinya.
- **SSO Helpdesk sungguhan** tidak dijalankan di sini; hasil login sungguhan
  dicatat di charter C-09 (`TEST_EXPLORATORY.md`).
- **Sinkron OPD nyata** tidak dijalankan. Helpdesk masih menolak token API
  (401 `invalid api key`) per 18 November.
- **Uji beban** tidak diulang; lihat `TEST_BEBAN.md` §15.
- **UAT stakeholder dan sign-off go-live** di luar dokumen ini dan belum pernah
  dijalankan (`TEST_KEAMANAN.md` §6).

Temuan terbuka per 19 November (sore): 0 dari 95.
