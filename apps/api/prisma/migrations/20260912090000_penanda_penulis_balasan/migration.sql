-- Penanda penulis balasan pengaduan, 12 September 2026.
--
-- DITULIS TANGAN, bukan hasil `prisma migrate dev`. Perintah itu dilarang di
-- repo ini: ia ikut membalik complaints_opd_id_fkey & survey_responses_user_id_fkey
-- dari RESTRICT menjadi SET NULL, dan membuang default users.roles.
--
-- SEBABNYA: frontend menentukan penulis balasan dengan membandingkan author_id
-- terhadap complaints.user_id. Satu akun di sistem ini lazim memegang beberapa
-- peran sekaligus, sehingga akun yang melaporkan pengaduan lalu menanganinya
-- sebagai petugas memiliki id yang sama persis dengan pelapor -- dan seluruh
-- balasan petugasnya digolongkan sebagai balasan pelapor. Yang menentukan
-- adalah peran yang SEDANG DIPAKAI saat menulis, dan itu hanya diketahui
-- backend pada saat balasan dibuat.
--
-- TANPA DEFAULT, dan itu disengaja: setiap penulis balasan wajib menyatakan
-- nilainya. Baris yang lupa menyebutkannya lebih baik gagal keras daripada
-- diam-diam tercatat sebagai balasan pelapor.
ALTER TABLE "complaint_replies" ADD COLUMN "dari_pelapor" BOOLEAN;

-- Pengisian baris lama memakai aturan yang berlaku sampai hari ini. Ia benar
-- untuk setiap baris yang akun penulisnya berbeda dari akun pelapor. Untuk
-- baris yang kedua akunnya sama, peran yang dipakai saat menulis memang sudah
-- tak dapat dipulihkan -- baris itu mengikuti tampilan yang selama ini terlihat.
UPDATE "complaint_replies" AS r
SET "dari_pelapor" = (r."author_id" = c."user_id")
FROM "complaints" AS c
WHERE c."id" = r."complaint_id";

ALTER TABLE "complaint_replies" ALTER COLUMN "dari_pelapor" SET NOT NULL;
