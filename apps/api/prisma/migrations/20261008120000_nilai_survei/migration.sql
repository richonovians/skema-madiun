-- Nilai Survei untuk survei custom (8 Oktober 2026, permintaan pengguna: survei
-- SKM menghasilkan Nilai IKM, survei custom menghasilkan "Nilai Survei" yang
-- labelnya mengikuti tujuan dan metode yang dipilih saat membuat survei).
--
-- 1) Jenis `umum` diganti namanya menjadi `custom`. RENAME VALUE mengubah baris
--    lama tanpa menulis ulang tabel, dan DEFAULT kolom `jenis` ikut menunjuk
--    nilai baru (default tersimpan sebagai referensi nilai enum, bukan teks).
--    Periksa dengan `\d surveys` bila ragu.
--
-- 2) Dua kolom baru, keduanya NULLABLE dan tanpa DEFAULT:
--      tujuan       : kepuasan | evaluasi | penilaian  (kamus kata kategori)
--      metode_nilai : rata_rata | indeks_persen        (cara angka ditampilkan)
--    Metode hanya mengatur tampilan; jawaban yang sama dapat dibaca dengan
--    kedua metode, jadi menggantinya tidak menghitung ulang apa pun.
--
-- 3) CHECK `surveys_nilai_survei_ck`: survei SKM tidak boleh membawa tujuan atau
--    metode (keduanya hanya bermakna untuk custom). SENGAJA tidak menuntut
--    custom wajib memilikinya: puluhan fixture e2e membuat baris survei
--    langsung lewat Prisma tanpa menyebut jenis, sehingga menjadi custom
--    bertujuan NULL. NULL pada custom dibaca sebagai bawaan (kepuasan +
--    rata_rata) oleh hitungNilaiSurvei; kewajiban memilih keduanya ditegakkan
--    SurveysService.create. Prisma tidak dapat menyatakan CHECK, jadi batas ini
--    hanya terlihat di berkas ini.
--
-- BACKFILL. Survei custom yang sudah ada diisi kepuasan + rata_rata: layar
-- "nilai rata-rata" hari ini tampil sama, hanya berganti nama menjadi "Nilai
-- Survei". Survei SKM tetap NULL.

ALTER TYPE "jenis_survei" RENAME VALUE 'umum' TO 'custom';

CREATE TYPE "tujuan_survei" AS ENUM ('kepuasan', 'evaluasi', 'penilaian');

CREATE TYPE "metode_nilai" AS ENUM ('rata_rata', 'indeks_persen');

ALTER TABLE "surveys"
  ADD COLUMN "tujuan" "tujuan_survei",
  ADD COLUMN "metode_nilai" "metode_nilai";

UPDATE "surveys"
SET "tujuan" = 'kepuasan', "metode_nilai" = 'rata_rata'
WHERE "jenis" = 'custom';

ALTER TABLE "surveys"
  ADD CONSTRAINT "surveys_nilai_survei_ck"
  CHECK ("jenis" = 'custom' OR ("tujuan" IS NULL AND "metode_nilai" IS NULL));
