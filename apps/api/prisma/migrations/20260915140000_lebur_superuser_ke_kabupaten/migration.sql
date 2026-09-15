-- Peran `superuser` dilebur ke `kabupaten` (15 September 2026, permintaan pengguna).
--
-- Sampai migrasi ini `superuser` satu-satunya peran yang boleh menyentuh
-- manajemen pengguna dan log aktivitas. Kuasa itu pindah ke `kabupaten`, dan
-- nilai enumnya dihapus supaya tak ada jalan tersisa untuk membuatnya lagi.

-- 1) JANGAN sampai ada akun kehilangan seluruh perannya. Invarian "minimal satu
--    peran" ditegakkan APLIKASI, bukan basis data, jadi tak ada yang akan
--    menolak baris berperan kosong saat migrasi berjalan -- akun itu baru
--    ketahuan rusak ketika pemiliknya gagal masuk. Penggantinya ditambahkan
--    LEBIH DULU, sebelum apa pun dibuang.
UPDATE "users"
   SET "roles" = array_append("roles", 'kabupaten'::"user_role")
 WHERE 'superuser' = ANY("roles")
   AND NOT ('kabupaten' = ANY("roles"));

UPDATE "users"
   SET "roles" = array_remove("roles", 'superuser'::"user_role")
 WHERE 'superuser' = ANY("roles");

-- 2) PostgreSQL tak dapat membuang satu nilai dari tipe enum, jadi tipenya
--    dibuat ulang. Baku kolomnya menyebut tipe lama (`'{}'::user_role[]`),
--    sehingga ia harus dilepas dulu -- tanpa itu ALTER TYPE ditolak karena
--    masih ada yang bergantung padanya.
ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT;

ALTER TYPE "user_role" RENAME TO "user_role_lama";
CREATE TYPE "user_role" AS ENUM ('kabupaten', 'opd', 'responden');

ALTER TABLE "users"
  ALTER COLUMN "roles" TYPE "user_role"[] USING "roles"::text[]::"user_role"[];

ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT '{}'::"user_role"[];

DROP TYPE "user_role_lama";
