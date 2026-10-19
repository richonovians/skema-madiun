-- Kotak masuk notifikasi dipisah per peran (16 September 2026, pertanyaan
-- pengguna soal akun berperan jamak).
--
-- Sampai migrasi ini `notifications` hanya mengenal `user_id`. Pengiriman
-- menyasar KEPEMILIKAN peran (`roles: { has }`), sedangkan navigasi dikurung
-- per peran yang SEDANG DIPAKAI, sehingga akun berperan jamak melihat
-- notifikasi pekerjaan admin saat memakai peran warga -- lengkap dengan tautan
-- yang dipantulkan kembali oleh proxy, dan lencana yang menghitung hal yang tak
-- dapat ditindaklanjuti di sesi itu.

-- 1) Kolomnya ditambahkan DULU tanpa NOT NULL. Baris lama belum punya nilai,
--    dan menambahkan kolom wajib-isi tanpa baku akan ditolak selama tabelnya
--    tidak kosong.
ALTER TABLE "notifications" ADD COLUMN "untuk_peran" "user_role";

-- 2) Baris lama disimpulkan dari awalan `link`, satu-satunya jejak yang tersisa
--    tentang area tujuannya. Ketiga awalan itu sudah memisahkan area dengan
--    rapi sejak notifikasi pertama dibuat.
--
--    Penyimpulan ini HANYA untuk baris lama. Baris baru mendapat nilainya dari
--    aplikasi saat dibuat, sebab awalan tautan cuma kebetulan sejalan dan akan
--    salah golong begitu ada notifikasi tanpa tautan.
UPDATE "notifications" SET "untuk_peran" = 'kabupaten'::"user_role"
 WHERE "link" LIKE '/admin-kab/%';

UPDATE "notifications" SET "untuk_peran" = 'opd'::"user_role"
 WHERE "link" LIKE '/admin-opd/%';

-- Sisanya milik warga: tautan warga (`/complaints/...`) maupun baris tanpa
-- tautan sama sekali. Jatuh ke `responden` disengaja, bukan baku malas --
-- notifikasi yang ditujukan ke pelapor adalah satu-satunya jenis yang pernah
-- dibuat tanpa awalan admin.
UPDATE "notifications" SET "untuk_peran" = 'responden'::"user_role"
 WHERE "untuk_peran" IS NULL;

-- 3) Baru sesudah semuanya terisi, kolomnya dikunci wajib-isi. Urutan ini yang
--    membuat migrasinya aman dijalankan pada basis data yang sudah berisi.
ALTER TABLE "notifications" ALTER COLUMN "untuk_peran" SET NOT NULL;

-- 4) Hitungan belum-dibaca dipanggil pada setiap penyegaran lonceng, dan kini
--    menyaring tiga kolom sekaligus.
CREATE INDEX "notifications_user_id_untuk_peran_is_read_idx"
    ON "notifications" ("user_id", "untuk_peran", "is_read");
