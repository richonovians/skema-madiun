-- Role `superuser` digabung ke `kabupaten` (2026-08-05, atas permintaan user):
-- Admin Kabupaten kini SEKALIGUS superuser -- bukan dihapus datanya, melainkan
-- disatukan (kebalikan dari 20260727000000_add_superuser_role).
BEGIN;

-- Data fix DULU (selagi enum lama masih berlaku): pindahkan baris ber-role
-- superuser (mis. seed) ke kabupaten, sebelum nilai enum-nya dibuang.
UPDATE "users" SET "role" = 'kabupaten' WHERE "role" = 'superuser';

-- AlterEnum: Postgres tidak mendukung DROP VALUE langsung -- buat ulang tipe
-- enum tanpa 'superuser', pindahkan kolom, lalu ganti nama tipe.
CREATE TYPE "user_role_new" AS ENUM ('kabupaten', 'opd', 'responden');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role_new" USING ("role"::text::"user_role_new");
ALTER TYPE "user_role" RENAME TO "user_role_old";
ALTER TYPE "user_role_new" RENAME TO "user_role";
DROP TYPE "user_role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'responden';

COMMIT;
