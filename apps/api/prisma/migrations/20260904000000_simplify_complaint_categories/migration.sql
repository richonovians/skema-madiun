-- Petakan SEMUA nilai kategori topik lama ke 'aduan'.
--
-- Keputusan 3 pada desain: data dipetakan, bukan dihapus. Baris berkategori
-- 'lainnya' DIBIARKAN apa adanya -- kode itu sah di taksonomi lama MAUPUN
-- baru, jadi memetakannya ke 'aduan' akan mengubah arti data yang sudah benar.
--
-- Sebaran sebelum migrasi (basis data pengembangan, 4 September 2026):
--   infrastruktur 1, keamanan_ketertiban 1, lainnya 1,
--   pelayanan_administrasi 1, kebersihan_lingkungan 1, pendidikan 1 (total 6)
UPDATE "complaints" SET "kategori" = 'aduan' WHERE "kategori" <> 'lainnya';

-- KEHILANGAN DATA YANG DISENGAJA: nilai sub_kategori baris lama hilang
-- permanen (terisi pada 3 dari 6 baris: rambu, legalisasi, infrastruktur_jalan).
-- Alasannya kolom yang tak pernah diisi maupun dibaca hanya menyesatkan
-- pembaca skema berikutnya.
ALTER TABLE "complaints" DROP COLUMN "sub_kategori";
