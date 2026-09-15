-- Survei utama per OPD (15 September 2026).
--
-- Tombol "Lanjut Isi Survei" pada halaman sukses pengaduan mengarah ke survei
-- utama milik OPD yang diadukan. Tiap OPD boleh menunjuk paling banyak SATU.
ALTER TABLE "surveys" ADD COLUMN "is_utama" BOOLEAN NOT NULL DEFAULT false;

-- Batas "paling banyak satu" ditegakkan DI SINI, bukan hanya di service.
-- Penulisan dari luar jalur service -- skrip pemeliharaan, migrasi data, atau
-- service yang kelak diubah -- tetap tertahan.
--
-- `WHERE "deleted_at" IS NULL` bukan hiasan: tanpa itu, survei utama yang sudah
-- dibuang ke Sampah terus mengunci OPD-nya, sehingga urutan yang paling wajar
-- dilakukan admin (buang yang lama, tunjuk yang baru) justru yang gagal.
--
-- Indeks parsial tak dapat dinyatakan di schema.prisma; ia hidup hanya di
-- berkas ini. Catatan penandanya ada di schema agar tak lenyap dari pembacaan.
CREATE UNIQUE INDEX "surveys_opd_utama_unik"
  ON "surveys" ("opd_id")
  WHERE "is_utama" AND "deleted_at" IS NULL;
