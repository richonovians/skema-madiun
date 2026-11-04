-- Tingkat pengaduan, kategori per tingkat, serta tanggal & lokasi kejadian
-- (4 November 2026, permintaan pengguna: "pisahkan pengaduan menjadi tingkat
-- kabupaten dan tingkat kecamatan ... tambahkan form baru untuk tanggal
-- kejadian dan lokasi kejadian di semua tingkatan").
--
-- MENGAPA `tingkat` DISIMPAN, BUKAN DITURUNKAN DARI `opd_id`. Pengaduan boleh
-- dikirim tanpa tujuan ("Lainnya", `opd_id` NULL) -- dan justru pada baris
-- itulah tingkatnya paling dibutuhkan, sebab itu satu-satunya petunjuk ke mana
-- Admin Kabupaten harus meneruskannya. Menurunkannya dari nama OPD juga akan
-- berubah sendiri begitu pengaduan diteruskan lintas tingkat.
--
-- DEFAULT 'kabupaten' DIPERTAHANKAN. CreateComplaintDto mewajibkan `tingkat`,
-- tetapi fixture e2e membuat baris pengaduan langsung lewat Prisma tanpa
-- menyebutnya. 'kabupaten' adalah nilai yang paling tidak mengejutkan: itulah
-- tingkat seluruh 19 pengaduan yang sudah ada.

CREATE TYPE "tingkat_pengaduan" AS ENUM ('kabupaten', 'kecamatan');

ALTER TABLE "complaints" ADD COLUMN "tingkat" "tingkat_pengaduan" NOT NULL DEFAULT 'kabupaten';

-- NULLABLE, meski formulir & DTO mewajibkan keduanya. Pengaduan yang sudah ada
-- dibuat sebelum kedua medan ini lahir; mengisinya dengan `created_at` berarti
-- menuliskan tanggal kejadian yang tak pernah dilaporkan siapa pun, dan
-- mengisinya dengan string kosong berarti berbohong bahwa pelapornya pernah
-- ditanya. NULL berarti "pengaduan lama", dan tampilan menyembunyikan barisnya.
ALTER TABLE "complaints" ADD COLUMN "tanggal_kejadian" DATE;
ALTER TABLE "complaints" ADD COLUMN "lokasi_kejadian" TEXT;

-- BACKFILL `tingkat` dari nama OPD tujuan. Aturan yang sama dengan
-- `tingkatOpd()` di apps/api/src/modules/opd/tingkat-opd.util.ts -- disalin ke
-- sini SEKALI karena migrasi tak dapat memanggil kode aplikasi. Baris tanpa
-- tujuan tetap 'kabupaten': tak ada apa pun yang dapat menunjukkan maksud
-- pelapornya, dan menebak akan menaruh tiket di kotak masuk yang salah.
UPDATE "complaints" AS c
SET "tingkat" = 'kecamatan'
FROM "opd" AS o
WHERE c."opd_id" = o."id"
  AND (o."nama" ~* '^(kecamatan|kelurahan)([[:space:]]|$)');

-- MIGRASI KATEGORI LAMA (keputusan pengguna 4 November 2026). Taksonomi
-- 'aduan'/'lapor'/'lainnya' (4 September 2026) diganti 8 kategori kecamatan +
-- 21 kategori kabupaten. Ketiga kode lama tak lagi ada di COMPLAINT_CATEGORIES,
-- jadi tanpa langkah ini 19 pengaduan yang ada akan menampilkan kode mentahnya
-- dan hilang dari penyaring kategori.
--
-- Dipetakan ke "Lainnya" pada tingkatnya masing-masing, bukan ditebak per
-- judul: ketiga kode lama memang tak membawa informasi topik sama sekali.
UPDATE "complaints"
SET "kategori" = CASE "tingkat"
  WHEN 'kecamatan' THEN 'kec_lainnya'
  ELSE 'kab_lainnya'
END
WHERE "kategori" IN ('aduan', 'lapor', 'lainnya');

CREATE INDEX "complaints_tingkat_idx" ON "complaints"("tingkat");
