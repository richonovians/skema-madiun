-- Jenis pengguna (ASN atau warga) dari Helpdesk (6 Oktober 2026, permintaan
-- pengguna: "perketat opsi jadikan admin opd hanya untuk user type asn").
--
-- MENGAPA KOLOM BARU. Klaim `identity.user_type` sudah dibaca saat login sejak
-- 28 September 2026, tetapi hanya untuk memetakan peran lewat
-- HELPDESK_SSO_ROLE_MAP, lalu dibuang. Akibatnya SKEMA tak punya satu pun cara
-- menjawab "apakah orang ini ASN" di luar detik login itu -- dan gerbang yang
-- diminta pengguna justru ditanyakan jauh sesudahnya, saat Admin Kabupaten
-- menyunting peran sebuah akun.
--
-- APA YANG MENGGANTIKANNYA SEBELUM INI, DIUKUR. Satu-satunya penjaga yang ada
-- adalah UsersService: peran `opd` ditolak bila `opd_id` kosong. Itu mirip
-- tetapi bukan hal yang sama, dan pesan galatnya tak pernah menyebut ASN.
--
-- BACKFILL, DAN ALASANNYA. Hitungan pada basis data lokal 6 Oktober 2026:
--
--   akun total              : 10
--   punya opd_id            :  6
--   memegang peran opd      :  5
--   peran opd tanpa opd_id  :  0
--
-- `opd_id` hanya pernah ditulis oleh satu penulis -- SsoService.acceptLogin,
-- dari klaim OPD Helpdesk (lihat migrasi 20260908... dan UpdateUserDto yang
-- menolak medan itu). Klaim itu hanya dibawa akun ASN. Karena itu
-- `opd_id IS NOT NULL` adalah bukti terukur bahwa Helpdesk pernah memperlakukan
-- akun tersebut sebagai ASN, dan keenam baris itu diisi `asn`.
--
-- Tanpa backfill ini, kelima pemegang peran `opd` yang ada akan kehilangan
-- kemampuan DIBERI ulang peran itu -- bukan kehilangan perannya, melainkan
-- kehilangan jalan mengembalikannya -- sebab empat di antaranya akun
-- `seed-*`/`pending:*` yang masuk lewat dev-login dan tak pernah melewati SSO,
-- sehingga kolom ini tak akan pernah terisi dari Helpdesk.
--
-- SISA EMPAT BARIS DIBIARKAN NULL, dan `null` TIDAK berarti warga. Ia berarti
-- belum diberitahu. Gerbang di UsersService menuntut `asn` tersurat dan tidak
-- menyimpulkan apa pun dari `null`.
--
-- Dibatalkan dengan DROP COLUMN lalu DROP TYPE. Backfill-nya tak dapat
-- dibatalkan, tetapi juga tak perlu: ia hanya mengisi kolom yang lahir hari ini.
CREATE TYPE "jenis_pengguna" AS ENUM ('asn', 'masyarakat');

ALTER TABLE "users" ADD COLUMN "jenis_pengguna" "jenis_pengguna";

UPDATE "users" SET "jenis_pengguna" = 'asn' WHERE "opd_id" IS NOT NULL;
