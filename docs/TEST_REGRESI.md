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
