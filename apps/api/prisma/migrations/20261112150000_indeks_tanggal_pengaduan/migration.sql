-- BUG-069 (12 November 2026): `GET /complaints` milik Admin Kabupaten
-- menjalankan `ORDER BY created_at DESC LIMIT 20` tanpa penyaring. Tanpa indeks
-- yang diawali `created_at`, Postgres memindai seluruh tabel lalu mengurutkannya
-- di setiap permintaan: di `skm_beban` 28,6 ms (Parallel Seq Scan + top-N
-- heapsort) pada 62.000 pengaduan, menjadi 0,14 ms (Index Scan) dengan indeks.
--
-- Tanpa CONCURRENTLY: perintah itu tak dapat berjalan di dalam transaksi, dan
-- tabel ini masih berukuran puluhan baris saat go-live, jadi kunci tulis
-- selama pembuatannya hanya sekejap.
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at" DESC);
