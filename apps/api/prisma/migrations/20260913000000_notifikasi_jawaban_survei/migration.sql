-- AlterEnum
-- Jawaban survei masuk (13 September 2026, laporan pengguna: "notifikasi
-- responden saat menjawab survei belum masuk ke admin OPD dan admin
-- kabupaten/superuser"). Mengikuti pola migrasi
-- 20260806051800_add_complaint_created_notification_type.
ALTER TYPE "notification_type" ADD VALUE 'survey_response_created';
