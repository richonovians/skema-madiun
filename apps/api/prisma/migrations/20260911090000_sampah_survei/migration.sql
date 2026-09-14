-- Sampah survei (soft delete), 11 September 2026.
--
-- DITULIS TANGAN, bukan hasil `prisma migrate dev`. Perintah itu dilarang di
-- repo ini: ia ikut membalik complaints_opd_id_fkey & survey_responses_user_id_fkey
-- dari RESTRICT menjadi SET NULL, dan membuang default users.roles.
--
-- ON DELETE SET NULL pada deleted_by_id: menghapus akun admin tidak boleh
-- mengunci baris sampah yang pernah ia buang. Yang hilang hanya keterangan
-- "dibuang oleh siapa", bukan surveinya.
ALTER TABLE "surveys" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "surveys" ADD COLUMN "deleted_by_id" INTEGER;

ALTER TABLE "surveys" ADD CONSTRAINT "surveys_deleted_by_id_fkey"
  FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seluruh pembacaan survei kini menyertakan `deleted_at IS NULL`.
CREATE INDEX "surveys_deleted_at_idx" ON "surveys"("deleted_at");
