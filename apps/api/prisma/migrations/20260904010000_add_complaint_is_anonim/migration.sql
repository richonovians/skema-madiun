-- Pengiriman pengaduan anonim. Aditif & berbaku false, jadi seluruh pengaduan
-- yang sudah ada tidak berubah perilakunya sedikit pun.
ALTER TABLE "complaints" ADD COLUMN "is_anonim" BOOLEAN NOT NULL DEFAULT false;
