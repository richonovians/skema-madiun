-- BUG-014: memusnahkan survei meninggalkan notifikasi yang menunjuk survei
-- yang sudah tiada, dan halaman tujuannya sejak itu menjawab 404.
--
-- Sebelumnya `notifications` sama sekali tidak mengenal survei: satu-satunya
-- tautannya kolom teks `link` berisi `/admin-opd/surveys/<id>/responses`.
-- `operasiPemusnahanSurvei` karena itu tak punya apa pun untuk dihapus, dan
-- menghapus berdasarkan pola teks akan mati tanpa suara begitu rute itu
-- berganti nama.
--
-- ON DELETE CASCADE dipilih, bukan penghapusan tersurat di dalam transaksi
-- pemusnahan: dengan cascade, jalur penghapusan survei MANA PUN di masa depan
-- tak dapat lupa. Penghapusan tersurat hanya menjaga satu jalur yang kebetulan
-- sudah ada hari ini.

ALTER TABLE "notifications" ADD COLUMN "survey_id" INTEGER;

-- Baris lama diisi dari `link`, TETAPI hanya yang surveinya masih ada.
-- Baris yang menunjuk survei yang sudah dimusnahkan dibiarkan NULL: ia memang
-- sudah tanpa induk sejak sebelum migrasi ini, dan menghapusnya di sini berarti
-- memutuskan nasib notifikasi milik pengguna sungguhan di dalam sebuah migrasi.
-- Keputusan itu bukan milik berkas ini.
UPDATE "notifications" n
SET "survey_id" = s."id"
FROM "surveys" s
WHERE n."link" ~ '^/admin-(opd|kab)/surveys/[0-9]+/'
  AND s."id" = (substring(n."link" from '/surveys/([0-9]+)/'))::INTEGER;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_survey_id_fkey"
  FOREIGN KEY ("survey_id") REFERENCES "surveys"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "notifications_survey_id_idx" ON "notifications"("survey_id");
