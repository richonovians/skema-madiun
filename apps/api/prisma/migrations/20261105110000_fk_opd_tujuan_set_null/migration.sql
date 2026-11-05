-- Aksi referensial `complaint_status_history.opd_tujuan_id` (5 November 2026,
-- hasil tinjauan cabang).
--
-- Migrasi 20261105093000 menulis FK-nya INLINE tanpa klausa `ON DELETE` /
-- `ON UPDATE`, sehingga Postgres memakai `NO ACTION` -- terukur:
-- `confdeltype='a'`, `confupdtype='a'`, sementara kedua saudaranya di tabel
-- yang sama berbunyi `SET NULL` dan `CASCADE`.
--
-- Itu MENYIMPANG dari `schema.prisma`: relasi `opdTujuan Opd?` bersifat
-- opsional, dan Prisma menyiratkan `SetNull` untuk relasi semacam itu. Basis
-- data yang tak sepakat dengan skemanya akan terbaca sebagai drift oleh
-- `migrate diff`, dan menghapus baris `opd` yang pernah menjadi tujuan
-- pengalihan gagal dengan pelanggaran FK alih-alih mengosongkan kolomnya.
--
-- MENGAPA `SET NULL`, BUKAN `RESTRICT`. Perlakuannya disamakan dengan
-- `actor_id` di tabel yang sama: baris riwayat harus tetap hidup meski baris
-- yang ditunjuknya hilang. Kehilangan nama instansi tujuan lebih baik
-- daripada riwayat yang tak dapat dibaca sama sekali, dan jejak yang wajib
-- utuh tinggal di `audit_logs`, bukan di sini.
--
-- Migrasi 20261105093000 TIDAK disunting: ia sudah diterapkan, dan mengubah
-- isinya akan mematahkan checksum Prisma pada setiap basis data yang sudah
-- menjalankannya.
ALTER TABLE "complaint_status_history"
  DROP CONSTRAINT "complaint_status_history_opd_tujuan_id_fkey";

ALTER TABLE "complaint_status_history"
  ADD CONSTRAINT "complaint_status_history_opd_tujuan_id_fkey"
  FOREIGN KEY ("opd_tujuan_id") REFERENCES "opd"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
