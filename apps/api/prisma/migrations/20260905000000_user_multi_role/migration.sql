-- Satu akun, beberapa role (5 September 2026).
--
-- SEBARAN SEBELUM MIGRASI, dibaca dari basis data ini tepat sebelum dijalankan
-- (total 7 akun):
--   responden  = 2
--   opd        = 3
--   superuser  = 1
--   kabupaten  = 1
--
-- Setiap akun berpindah dari SATU role ke himpunan beranggota satu, jadi tak
-- ada kehilangan data sama sekali. Yang berubah adalah BENTUKNYA.
--
-- TIDAK DAPAT DIBALIK OTOMATIS. Mengembalikan kolom tunggal berarti memilih
-- SATU role dari himpunan yang mungkin berisi beberapa, dan pilihan itu bukan
-- milik migrasi -- ia milik manusia yang tahu maksudnya.

-- Baku '{}' hanya berlaku selama migrasi ini (supaya NOT NULL dapat dipasang
-- pada tabel yang sudah berisi baris). Baris yang benar-benar kosong tak pernah
-- tercipta: UPDATE di bawah mengisi semuanya, dan sesudah itu keharusan
-- "minimal satu role" ditegakkan aplikasi (CreateUserDto/UpdateUserDto +
-- UsersService.normalisasiRoles).
ALTER TABLE "users" ADD COLUMN "roles" "user_role"[] NOT NULL DEFAULT '{}';

UPDATE "users" SET "roles" = ARRAY["role"];

-- Indeks ikut hilang bersama kolomnya, tanpa pengganti. Alasannya ada di
-- schema.prisma: tabel ini berisi 7 baris.
DROP INDEX IF EXISTS "users_role_idx";

ALTER TABLE "users" DROP COLUMN "role";
