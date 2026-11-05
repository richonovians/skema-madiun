-- Pengalihan pengaduan antar-instansi (5 November 2026).
--
-- `dialihkan` adalah status TAMBAHAN di luar alur lima tahap: ia menetap
-- sebagai antrean masuk OPD tujuan sampai OPD itu memverifikasinya. Tak ada
-- data lama yang perlu dipetakan -- nilai ini baru seluruhnya.
ALTER TYPE "complaint_status" ADD VALUE 'dialihkan';

-- Tujuan setiap pengalihan, satu per baris riwayat.
--
-- MENGAPA KOLOM, BUKAN NAMA INSTANSI DISISIPKAN KE DALAM `catatan`.
-- `complaints.opd_id` hanya menyimpan pemilik TERAKHIR. Tanpa kolom ini,
-- pengaduan yang dialihkan dua kali kehilangan tujuan pertamanya bagi pelapor
-- -- ia hanya tersisa di `audit_logs`, yang memang tak boleh dibacanya.
--
-- NULL pada setiap baris berstatus selain `dialihkan`, termasuk seluruh baris
-- yang sudah ada: hanya perpindahan inilah yang punya tujuan.
ALTER TABLE "complaint_status_history"
  ADD COLUMN "opd_tujuan_id" INTEGER NULL
  REFERENCES "opd"("id");
