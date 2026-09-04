# Desain — Pengiriman anonim & penyederhanaan kategori pengaduan

| Butir               | Isi                                                                    |
| ------------------- | ---------------------------------------------------------------------- |
| **Tanggal**         | 4 September 2026                                                       |
| **Status**          | Disetujui pengguna (desain), **belum diimplementasikan**               |
| **Cakupan**         | `apps/api` (Prisma, DTO, entity, controller) + `apps/web`              |
| **Dokumen terkait** | [PRD](../../PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md) butir **OQ-3** |

Dokumen ini menjawab **OQ-3** pada PRD — _"Apakah pengaduan boleh anonim, atau
wajib login? (PRD ini mengasumsikan wajib login.)"_ — sekaligus menyederhanakan
taksonomi kategori pengaduan.

---

## 1. Keputusan yang sudah diambil

Empat keputusan berikut diambil pengguna sebelum desain disusun. Dicatat beserta
alasannya supaya pembaca berikutnya tak perlu menebak.

| #  | Keputusan                                                                                                                                                                        |
| -- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | **Anonim berbeda per alur.** Survei: dapat diisi **tanpa login**. Pengaduan: **tetap login**, dengan centang "kirim sebagai anonim" yang menyembunyikan identitas dari admin OPD. |
| 2  | **Kategori diganti total** menjadi `Aduan`, `Lapor`, `Lainnya`. Sub-kategori (18 kode) dibuang.                                                                                   |
| 3  | **Data pengaduan lama dipetakan ke `aduan`** lewat migrasi, bukan dihapus.                                                                                                        |
| 4  | **Persetujuan UU PDP untuk pengiriman anonim ditunda** — dirancang di sini, tetapi tidak diaktifkan sampai dikonfirmasi tim Diskominfo.                                            |

Alasan keputusan 1 dipilih di atas dua alternatifnya: mengisi survei tanpa login
adalah kasus pakai SKM yang paling wajar (memindai QR di loket layanan),
sedangkan pengaduan tanpa login akan kehilangan pemantauan status, kehilangan
tujuan notifikasi, dan membuka pintu penyalahgunaan yang tak dapat ditelusuri.

---

## 2. Temuan yang membentuk desain

Enam hal berikut ditemukan dengan membaca kode, dan masing-masing mengubah bentuk
desain. Dicatat karena tanpanya keputusan di bawah tampak sewenang-wenang.

**Survei sudah anonim — tetapi hanya di satu arti.** Identitas pengisi memang
sudah tidak pernah diperlihatkan ke admin OPD: `response.entity.ts` sengaja tak
mengirimkannya, kolom Responden/Email/Telepon sudah dihapus dari
`SurveyResponsesTable.jsx`, dan `SurveyResponseDetailScreen.jsx` berbunyi
_"Respons anonim"_. Yang belum ada adalah mengisi **tanpa sesi** —
`ShareSurveyModal.jsx` menyatakannya: _"SKM tak menerima jawaban anonim tanpa
sesi"_. Karena itu pekerjaan survei di sini adalah soal **akses**, bukan soal
menyembunyikan.

**`RespondentProfile` tidak dipakai IKM maupun laporan apa pun** — hanya oleh alur
profil (`auth.service.ts`, `me.entity.ts`). Jadi responden anonim yang tak punya
data demografi **tidak merusak satu laporan pun**. Ini menghapus kebutuhan
mengumpulkan demografi pada formulir anonim.

**Identitas pelapor bocor lewat TIGA jalur, bukan satu.** Selain
`ComplaintEntity.reporterNama`, ada `ComplaintEntity.userId` dan
`ComplaintReplyEntity.authorId`. Menyamarkan nama saja tidak cukup: dua pengaduan
anonim dengan `userId` sama memberi tahu admin bahwa keduanya dari orang yang
sama — dan bila salah satunya tidak anonim, namanya ikut terbuka.

**Kategori punya satu sumber, dengan satu pengecualian.** `reference.constants.ts`
adalah sumbernya, dan lima tempat di frontend mengambilnya lewat
`GET /ref/complaint-categories`. Pengecualiannya `AnalyticsHeader.jsx:27`, yang
menyalin daftarnya secara hardcode — bila tak diperbaiki, penyaring analitik akan
menawarkan kategori yang sudah tidak ada.

**`proxy.js` menjaga `/surveys` khusus peran `responden`.** Tautan bagikan
sekarang `/surveys/:id`, sehingga pengunjung anonim yang memindai QR akan
dipantulkan ke `/`. Survei tanpa login **tidak mungkin** tanpa rute publik baru.

**Anti-duplikat survei bergantung pada `dedupeUserId`.** Aturannya
`@@unique([surveyId, dedupeUserId])`; tanpa login, mekanisme itu tak punya
pegangan sama sekali.

---

## 3. Bagian 1 — Kategori: Aduan / Lapor / Lainnya

### Bentuk data

```ts
export const COMPLAINT_CATEGORIES: readonly ComplaintCategory[] = [
  { kode: 'aduan', nama: 'Aduan' },
  { kode: 'lapor', nama: 'Lapor' },
  { kode: 'lainnya', nama: 'Lainnya' },
];
```

`COMPLAINT_SUB_CATEGORIES` beserta antarmuka `ComplaintSubCategory` dihapus.

### Berkas yang disentuh

| Berkas                                            | Perubahan                                            |
| ------------------------------------------------- | ---------------------------------------------------- |
| `reference.constants.ts`                          | 7 kategori → 3; sub-kategori dihapus                 |
| `create-complaint.dto.ts`                         | field `subKategori` + validasinya dihapus            |
| `reference.controller.ts`, `reference.service.ts` | endpoint `GET /ref/complaint-sub-categories` dihapus |
| `complaints.service.ts` (≈325)                    | pencarian nama sub-kategori dibuang                  |
| `complaint.entity.ts`                             | field `subKategori` dihapus                          |
| `CreateComplaintForm.jsx`                         | pilihan sub-kategori dibuang                         |
| `AnalyticsHeader.jsx` (27)                        | daftar hardcode → ambil dari API                     |
| `complaint.adapter.js`, filter bar, layar detail  | rujukan sub-kategori dibersihkan                     |

### Migrasi

1. `UPDATE complaints SET kategori = 'aduan'` untuk **semua** nilai lama.
2. `ALTER TABLE complaints DROP COLUMN sub_kategori`.

Langkah 2 dipilih karena kolom yang tak pernah diisi maupun dibaca hanya
menyesatkan pembaca skema berikutnya. **Konsekuensi yang dinyatakan terus
terang:** nilai sub-kategori pada baris lama hilang permanen, dan kategori
topiknya pun sudah hilang karena semuanya menjadi `aduan`.

### Konsekuensi yang diterima

`dashboard.service.ts:277` mengagregasi `groupBy(['kategori'])`, sehingga rincian
dashboard tinggal tiga batang. Laporan tak lagi dapat menjawab _"pengaduan
terbanyak soal apa"_. Ini konsekuensi keputusan 2, bukan cacat.

---

## 4. Bagian 2 — Pengaduan: centang "Kirim sebagai anonim"

### Skema

```prisma
model Complaint {
  isAnonim Boolean @default(false) @map("is_anonim")
}
```

`userId` **tetap NOT NULL**. Tidak ada perubahan autentikasi; pemantauan status,
notifikasi, dan penelusuran penyalahgunaan tetap utuh.

### Penyamaran — di lapisan entity, bukan di basis data

Basis data tetap menyimpan `userId` sebenarnya. Yang berubah adalah apa yang
dikirim ke antarmuka:

| Jalur                           | Perlakuan saat `isAnonim`                                    |
| ------------------------------- | ------------------------------------------------------------ |
| `ComplaintEntity.reporterNama`  | field dihilangkan; UI admin menampilkan "Anonim"             |
| `ComplaintEntity.userId`        | field **dihilangkan sama sekali** dari respons admin (bukan `null`/`0`) |
| `ComplaintReplyEntity.authorId` | dihilangkan pada balasan yang ditulis pelapor; balasan admin tetap membawa `authorId` |

Balasan pelapor anonim diberi label **"Pelapor (anonim)"** di antarmuka admin —
tanpa label, percakapan tampak seolah ditulis pihak yang tak dikenal.

**Pemilik pengaduan tetap melihat pengaduannya sendiri** pada daftarnya — itu
miliknya — disertai label **"Dikirim anonim"** supaya ia tahu OPD tidak melihat
namanya.

### Kebijakan: siapa yang boleh melihat identitas di balik anonim

**Tidak seorang pun melalui antarmuka**, termasuk Admin Kabupaten. Tautan `userId`
tetap ada di basis data dan `audit_logs` untuk eskalasi resmi bila memang
diperlukan. Alasannya: begitu ada satu tombol "lihat identitas" di UI, janji
anonim bergantung pada disiplin pemakainya, bukan pada sistem.

### Kriteria terima

- Pengaduan anonim tampil sebagai "Anonim" di daftar & detail admin OPD dan Admin
  Kabupaten.
- Respons API untuk admin tidak memuat `userId` maupun `reporterNama` pada
  pengaduan anonim.
- Dua pengaduan anonim dari orang yang sama tidak dapat dikorelasikan dari respons
  API.
- Pelapor tetap menerima notifikasi dan melihat status pengaduannya.

---

## 5. Bagian 3 — Survei: pengisian tanpa login

### Skema

```prisma
model Survey {
  izinkanAnonim Boolean @default(false) @map("izinkan_anonim")
}

model SurveyResponse {
  userId    Int?      @map("user_id")    // dulu NOT NULL
  consentAt DateTime? @map("consent_at") // lihat bagian 6 — belum diaktifkan
}
```

`izinkanAnonim` baku `false`, sehingga **seluruh survei yang sudah ada tidak
berubah perilakunya**.

### Endpoint publik dipisah, bukan melonggarkan yang sudah ada

```
GET  /public/surveys/:id/fill       @Public()
POST /public/surveys/:id/responses  @Public()  @Throttle(20/menit)
```

Keduanya menolak kecuali survei itu `izinkanAnonim` **dan** berstatus aktif, dan
selalu menulis `userId: null`. Endpoint berpenjaga yang sekarang
(`@Roles(Role.responden)`) **tidak disentuh sama sekali** — jalur berisiko
diisolasi supaya gerbang yang sudah benar tak mungkin ikut longgar karena
kelalaian di kemudian hari.

Batas laju **20/menit per IP** dipilih longgar dengan sengaja: di loket layanan
seluruh pengunjung berbagi satu WiFi, sehingga **satu IP berarti banyak orang**.
Batas yang ketat akan memblokir responden yang sah sementara satu pengirim
berulang dengan ponsel pribadi tetap lolos.

### Rute halaman `/isi/:id`

Rute baru yang **berada di luar `config.matcher` milik `proxy.js`** — matcher itu
hanya mencantumkan `/`, `/pilih-peran`, `/persetujuan`, `/admin-kab/*`,
`/admin-opd/*`, `/dashboard`, `/complaints`, `/surveys`, dan `/profile`. Karena
`/isi/*` tak termasuk, proxy tidak berjalan untuk rute ini dan **`proxy.js` tak
perlu diubah sama sekali**. Rute ini melayani kedua keadaan:

- **ada sesi** → jawaban tercatat atas nama pengguna; anti-duplikat `dedupeUserId`
  tetap berlaku seperti sekarang;
- **tak ada sesi** → dikirim anonim lewat endpoint publik di atas.

`ShareSurveyModal.jsx` diarahkan ke rute ini, sehingga satu tautan/QR berlaku
untuk semua orang.

### Penanda peramban, beserta batasnya

Peramban yang sudah mengisi survei tertentu diberi penanda di `localStorage`, dan
percobaan kedua ditolak di antarmuka.

**Batasnya dinyatakan terus terang:** menghapus data situs atau berpindah peramban
mengalahkannya. Ini **penghalang kejujuran, bukan penegakan.** Dipilih karena
begitulah survei kepuasan publik memang dijalankan, ia tidak menghukum responden
yang sah, dan bila kelak integritas IKM perlu dijaga ketat, tautan/QR sekali pakai
dapat ditambahkan di atasnya tanpa membongkar apa pun.

### Kriteria terima

- Survei dengan `izinkanAnonim=false` menolak kedua endpoint publik, diuji.
- Pengunjung tanpa sesi dapat membuka `/isi/:id` tanpa dipantulkan ke `/`.
- Pengunjung dengan sesi yang mengisi lewat `/isi/:id` tetap terkena anti-duplikat
  lama.
- Respons anonim tersimpan dengan `userId = null` dan tetap ikut dalam perhitungan
  IKM.
- Identitas pengisi tetap tidak pernah dikirim ke admin (perilaku yang sudah ada,
  tidak boleh berubah).

---

## 6. Persetujuan UU PDP — dirancang, BELUM DIAKTIFKAN

Gerbang persetujuan yang ada sekarang (`ConsentService.assertConsented`) membaca
`users.consentAt`. Pengirim anonim tidak punya baris `users`, sehingga tak ada
tempat mencatat persetujuannya.

**Asumsi yang dipakai desain ini:** formulir survei anonim memuat centang
persetujuan singkat, dan waktu persetujuannya disimpan pada baris respons
(`SurveyResponse.consentAt`).

**Alternatifnya** — melewati gerbang PDP dengan alasan tak ada data pribadi yang
diminta — hanya sah bila formulirnya benar-benar tidak meminta nama, kontak, atau
NIK. Perlu dicatat bahwa isi uraian bebas tetap dapat memuat data pribadi orang
lain.

Ini soal kepatuhan hukum, bukan selera desain. **Bagian ini tidak
diimplementasikan sampai tim Diskominfo mengonfirmasi.** Kolom `consentAt`
disiapkan pada migrasi yang sama agar konfirmasinya tidak menuntut migrasi kedua.

---

## 7. Pengujian

| Lapisan  | Yang diuji                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Jest API | Penyamaran tiga jalur identitas; validasi DTO kategori baru; penolakan endpoint publik saat `izinkanAnonim=false`               |
| Jest web | Centang anonim pada `CreateComplaintForm`; label "Anonim"/"Dikirim anonim"; penanda peramban menolak pengisian kedua            |
| E2E      | Alur `/isi/:id` tanpa sesi sampai respons tersimpan                                                                            |

Uji penyamaran ditulis sebagai uji **korelasi**, bukan hanya "nama tidak tampil":
dua pengaduan anonim dari satu pengguna harus tak dapat dikaitkan dari respons
API.

---

## 8. Di luar cakupan (YAGNI)

- Tautan/QR sekali pakai (opsi integritas terkuat) — ditolak karena QR tunggal di
  dinding adalah cara pakai yang paling lazim.
- Demografi untuk responden anonim — tak ada laporan yang memakainya.
- Memindahkan kategori dari konstanta ke tabel basis data.
- Pengaduan tanpa login.

---

## 9. Risiko

| Risiko                                                                  | Mitigasi                                                                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| IKM digeser oleh pengisian berulang                                     | Diterima secara sadar; penanda peramban + batas laju; jalur peningkatan ke token tersedia                       |
| `userId` nullable membuka jalan bug "respons tanpa pemilik" di kode lain | Telusuri seluruh pemakai `SurveyResponse.userId` sebelum migrasi; uji IKM dengan campuran respons anonim & bersesi |
| Endpoint publik menjadi sasaran spam                                    | Batas laju khusus + `izinkanAnonim` baku `false`                                                                |
| Kategori lama tertinggal di kode frontend                               | `AnalyticsHeader.jsx:27` sudah teridentifikasi; cari ulang string kategori lama sebelum selesai                 |

---

## 10. Urutan pengerjaan

1. **Bagian 1 (kategori)** — tertutup, tak menyentuh autentikasi. Selesaikan &
   verifikasi lebih dulu.
2. **Bagian 2 (pengaduan anonim)** — menyentuh entity & UI, tidak menyentuh skema
   autentikasi.
3. **Bagian 3 (survei tanpa login)** — paling berisiko: skema nullable, rute
   publik, `proxy.js`.
4. **Bagian 6 (PDP)** — hanya setelah konfirmasi Diskominfo.
