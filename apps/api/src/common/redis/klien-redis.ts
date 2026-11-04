import Redis from 'ioredis';

/**
 * Batas tunggu satu perintah Redis, milidetik.
 *
 * Satu perintah Redis lazimnya selesai jauh di bawah satu milidetik, jadi satu
 * detik hanya terlewati ketika Redis memang bermasalah. Penghitung laju menunggu
 * Redis pada SETIAP permintaan, karena itu nilai ini sekaligus tambahan latensi
 * per perintah selama Redis padam. Sengaja tak disetel lewat env, sama seperti
 * singgahan sesi lima detik di `PenyimpanSesiRedis`.
 */
export const BATAS_PERINTAH_MS = 1_000;

/**
 * Satu-satunya tempat koneksi Redis aplikasi dibuat.
 *
 * MENGAPA ADA (BUG-071, 4 November 2026). Tanpa `commandTimeout`, perintah pada
 * Redis yang hang menunggu tanpa batas: sambungannya terbuka, tak ada galat, dan
 * gagal terbuka di penghitung laju tak pernah terpicu. Terukur dengan
 * `docker pause`: 0 dari 300 permintaan terjawab, termasuk `/health`. Batas yang
 * sama juga memendekkan penantian saat Redis mati, yang sebelumnya bergantung
 * pada jatah coba ulang dan terukur p50 6,6 detik pada `/health`.
 *
 * Opsinya disatukan karena pernah menyimpang: koneksi pencabutan lampiran memakai
 * jatah coba ulang bawaan ioredis (20), sehingga tautan lampiran melewati 30 detik
 * saat koneksi lain sudah menjawab.
 */
export function buatKlienRedis(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: 2, commandTimeout: BATAS_PERINTAH_MS });
}

/**
 * Menutup koneksi tanpa melempar. `QUIT` menempuh batas waktu yang sama, jadi pada
 * Redis yang padam ia ditolak, dan penolakan itu tak boleh menggagalkan penutupan
 * aplikasi. Sambungannya tetap diputus dari sisi klien.
 */
export async function tutupKlienRedis(klien: Redis): Promise<void> {
  try {
    await klien.quit();
  } catch {
    klien.disconnect();
  }
}
