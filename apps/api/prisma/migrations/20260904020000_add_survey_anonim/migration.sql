-- Survei yang boleh diisi tanpa login. Baku false: survei yang sudah ada tak
-- berubah perilakunya.
ALTER TABLE "surveys" ADD COLUMN "izinkan_anonim" BOOLEAN NOT NULL DEFAULT false;

-- Disiapkan untuk persetujuan UU PDP pengirim anonim (BELUM DIAKTIFKAN --
-- menunggu konfirmasi Diskominfo). Selalu NULL sampai saat itu.
ALTER TABLE "survey_responses" ADD COLUMN "consent_at" TIMESTAMP(3);

-- Respons anonim tak punya pemilik. Pelonggaran, bukan penghapusan: kunci asing
-- ke users tetap ada untuk baris yang bersesi.
ALTER TABLE "survey_responses" ALTER COLUMN "user_id" DROP NOT NULL;
