-- Alur status pengaduan tujuh nilai + riwayatnya (4 November 2026, permintaan
-- pengguna). Empat status lama -- diterima/diproses/selesai/ditolak -- diganti
-- Terkirim, Menunggu Verifikasi, Diverifikasi, Sedang Ditindaklanjuti, Selesai,
-- dengan Ditolak dan Perlu Perbaikan sebagai status alternatif.
--
-- MENGAPA TIPE BARU LALU DITUKAR, bukan `ALTER TYPE ... ADD VALUE`. Prisma
-- menjalankan tiap migrasi di DALAM satu transaksi, dan Postgres melarang
-- sebuah nilai enum dipakai pada transaksi yang sama dengan penambahannya
-- ("unsafe use of new value of enum type"). Migrasi ini WAJIB memakainya
-- seketika untuk memetakan 19 baris yang ada, jadi jalan `ADD VALUE` tertutup.
-- Penukaran tipe di bawah melakukan keduanya dalam satu langkah yang atomik.

CREATE TYPE "complaint_status_baru" AS ENUM (
  'terkirim',
  'menunggu_verifikasi',
  'diverifikasi',
  'sedang_ditindaklanjuti',
  'selesai',
  'ditolak',
  'perlu_perbaikan'
);

-- Default lama menunjuk nilai yang sebentar lagi tak ada; ia harus dilepas
-- sebelum tipenya berubah, lalu dipasang kembali di bawah.
ALTER TABLE "complaints" ALTER COLUMN "status" DROP DEFAULT;

-- PEMETAAN DATA LAMA.
--   diterima -> menunggu_verifikasi  (sudah masuk, belum disentuh siapa pun)
--   diproses -> sedang_ditindaklanjuti
--   selesai  -> selesai
--   ditolak  -> ditolak
-- Tak ada baris lama yang menjadi `terkirim`: status itu memang tak pernah
-- menetap. Juga tak ada yang menjadi `diverifikasi` -- alur lama tak punya
-- tahap itu, dan menebak bahwa pengaduan yang sedang diproses pasti pernah
-- diverifikasi berarti mengarang peristiwa yang tak pernah tercatat.
ALTER TABLE "complaints"
  ALTER COLUMN "status" TYPE "complaint_status_baru"
  USING (
    CASE "status"::text
      WHEN 'diterima' THEN 'menunggu_verifikasi'
      WHEN 'diproses' THEN 'sedang_ditindaklanjuti'
      WHEN 'selesai'  THEN 'selesai'
      WHEN 'ditolak'  THEN 'ditolak'
    END
  )::"complaint_status_baru";

ALTER TABLE "complaints"
  ALTER COLUMN "status" SET DEFAULT 'menunggu_verifikasi'::"complaint_status_baru";

DROP TYPE "complaint_status";
ALTER TYPE "complaint_status_baru" RENAME TO "complaint_status";

-- =====================================================================
-- RIWAYAT STATUS
-- =====================================================================

CREATE TABLE "complaint_status_history" (
  "id"           SERIAL NOT NULL,
  "complaint_id" INTEGER NOT NULL,
  "status"       "complaint_status" NOT NULL,
  -- Terenkripsi at-rest (`enc:v1:`), satu perlakuan dengan
  -- `complaint_replies.pesan`.
  "catatan"      TEXT,
  -- NULL berarti SISTEM, bukan "tak diketahui". Baris `terkirim` tak punya
  -- petugas, dan baris warisan di bawah tak pernah mencatat pelakunya.
  "actor_id"     INTEGER,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "complaint_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "complaint_status_history_complaint_id_created_at_idx"
  ON "complaint_status_history"("complaint_id", "created_at");

ALTER TABLE "complaint_status_history"
  ADD CONSTRAINT "complaint_status_history_complaint_id_fkey"
  FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "complaint_status_history"
  ADD CONSTRAINT "complaint_status_history_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- BACKFILL, dan batasnya tersurat. Riwayat sungguhan tak pernah dikumpulkan
-- sebelum hari ini, jadi yang dapat direka ulang hanya dua titik yang memang
-- tersimpan di baris pengaduannya: kapan ia dibuat, dan kapan ia terakhir
-- berubah. Tahap-tahap di antaranya TIDAK dikarang.

-- 1) Baris pertama untuk SETIAP pengaduan: peristiwa pengirimannya.
INSERT INTO "complaint_status_history" ("complaint_id", "status", "actor_id", "created_at")
SELECT "id", 'terkirim', NULL, "created_at" FROM "complaints";

-- 2) Baris kedua hanya bila statusnya sudah bergerak dari titik awal.
--    `actor_id` NULL: alur lama tak menyimpan siapa yang mengubahnya.
--    `updated_at` adalah perubahan TERAKHIR, bukan tentu perubahan status --
--    itu perkiraan terbaik yang tersedia, dan satu-satunya.
INSERT INTO "complaint_status_history" ("complaint_id", "status", "actor_id", "created_at")
SELECT "id", "status", NULL, "updated_at"
FROM "complaints"
WHERE "status" <> 'menunggu_verifikasi';
