-- AlterEnum
-- Cadangan harian terjadwal yang GAGAL kini mengabari seluruh Admin Kabupaten
-- (BUG-073, 12 November 2026). Cadangan dijalankan API sendiri tiap malam, dan
-- kegagalan pekerjaan latar yang hanya tercatat di log baru terlihat bila ada
-- yang membaca log.
--
-- Mengikuti pola migrasi 20261007090000_notifikasi_pengaduan_diteruskan: satu
-- nilai enum baru, tanpa dipakai di pernyataan yang sama (aman di luar/ dalam
-- transaksi migrasi).
ALTER TYPE "notification_type" ADD VALUE 'backup_failed';
