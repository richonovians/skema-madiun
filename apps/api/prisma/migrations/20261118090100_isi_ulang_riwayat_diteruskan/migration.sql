-- Isi ulang baris riwayat `diteruskan` untuk penerusan yang terjadi sebelum
-- 18 November 2026 (BUG-086, keputusan pengguna: diisi ulang).
--
-- Sumbernya `audit_logs`, yang hanya DIBACA di sini. Setiap penerusan
-- tercatat dua kali di sana: oleh `@Audit('complaint', 'forward')` di
-- controller (`{body, params}`) dan oleh `ComplaintsService.forward()`
-- (`{complaintId, opdId, ...}`). Yang dipakai hanya bentuk service, karena
-- hanya ia yang menyebut id pengaduan dan OPD tujuannya sebagai angka.
--
-- Waktu dan pelakunya diambil dari baris audit itu. Waktunya beberapa
-- milidetik sesudah penerusannya sendiri, sebab audit ditulis sesudah
-- pembaruan -- cukup untuk mengurutkan linimasa dengan benar.
--
-- `catatan` NULL: penerusan memang tak pernah membawa catatan.
--
-- Pengaduan dan OPD yang sudah tiada dilewati lewat JOIN, dan pengaduan yang
-- sudah punya baris `diteruskan` tidak diisi dua kali. Satu pengaduan hanya
-- dapat diteruskan sekali (tujuannya harus masih kosong), tetapi DISTINCT ON
-- tetap menjaga bila audit memuat lebih dari satu baris untuknya.
INSERT INTO "complaint_status_history"
  ("complaint_id", "status", "catatan", "actor_id", "opd_tujuan_id", "created_at")
SELECT DISTINCT ON (c."id")
  c."id",
  'diteruskan'::"complaint_status",
  NULL,
  a."actor_id",
  o."id",
  a."timestamp"
-- CASE, bukan `jsonb_typeof(...) = 'number' AND (...)::int`: Postgres tak
-- menjamin urutan evaluasi AND, dan pengubahan ke int atas nilai bukan angka
-- di baris audit mana pun akan menggagalkan seluruh migrasi.
FROM "audit_logs" a
JOIN "complaints" c
  ON c."id" = CASE
    WHEN jsonb_typeof(a."detail" -> 'complaintId') = 'number'
      THEN (a."detail" ->> 'complaintId')::int
  END
JOIN "opd" o
  ON o."id" = CASE
    WHEN jsonb_typeof(a."detail" -> 'opdId') = 'number'
      THEN (a."detail" ->> 'opdId')::int
  END
WHERE a."aksi" = 'forward'
  AND a."entitas" = 'complaint'
  AND NOT EXISTS (
    SELECT 1
    FROM "complaint_status_history" h
    WHERE h."complaint_id" = c."id"
      AND h."status" = 'diteruskan'
  )
ORDER BY c."id", a."timestamp" ASC;
