-- Jenis survei (8 Oktober 2026, permintaan pengguna: "survei dengan 9 unsur baku
-- masih berupa template soal fix, perbaiki supaya pertanyaannya tetap bisa
-- dirubah, namun admin tetap harus mengikuti 9 unsur").
--
-- MENGAPA KOLOM, BUKAN TEBAKAN DARI ISI. Kerangka 9 unsur hanya dapat dijaga
-- bila sistem tahu survei mana yang berkerangka. Menurunkannya dari "punya
-- pertanyaan unsur" gagal tepat pada saat dibutuhkan: survei yang unsurnya
-- sudah dihapus tak lagi terbaca sebagai berkerangka, padahal rumus IKM
-- membagi bobot dengan jumlah unsur yang tersisa.
--
-- BACKFILL. Survei yang sudah punya minimal satu pertanyaan unsur
-- (`is_ikm_unsur`) menjadi `skm_permenpanrb`; sisanya `umum`. Survei yang
-- unsurnya sudah tak lengkap TIDAK diperbaiki di sini -- data lama tidak
-- diubah, aturan kerangka berlaku untuk survei baru dan untuk perubahan
-- berikutnya.
--
-- DEFAULT 'umum' DIPERTAHANKAN. Pembuat survei lewat API wajib menyatakan
-- jenisnya (CreateSurveyDto), tetapi puluhan fixture e2e membuat baris survei
-- langsung lewat Prisma tanpa menyebutnya. 'umum' adalah nilai yang paling
-- longgar: tanpa kerangka, tanpa penjaga unsur.

CREATE TYPE "jenis_survei" AS ENUM ('skm_permenpanrb', 'umum');

ALTER TABLE "surveys" ADD COLUMN "jenis" "jenis_survei" NOT NULL DEFAULT 'umum';

UPDATE "surveys"
SET "jenis" = 'skm_permenpanrb'
WHERE EXISTS (
  SELECT 1 FROM "questions" q
  WHERE q."survey_id" = "surveys"."id" AND q."is_ikm_unsur" = true
);
