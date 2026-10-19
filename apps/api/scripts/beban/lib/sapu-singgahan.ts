/**
 * MENYAPU KUNCI SINGGAHAN, dan HANYA kunci singgahan.
 *
 * MENGAPA BUKAN `FLUSHDB`. Versi pertama mode dingin memakainya, dan itu salah
 * secara terukur: basis data logis 1 tak hanya memuat singgahan, ia juga memuat
 * kunci `sesi:` milik Bearer token yang baru diterbitkan pelari itu sendiri dan
 * kunci `laju:` milik penahan laju. Mengosongkannya membuat
 * `GET /api/v1/dashboard/ikm` menjawab 401 dan bebannya tak pernah jalan --
 * ditangkap permintaan penyelidik, yang memang ada untuk itu. Docblock
 * `PenyimpanSinggahanRedis` sudah menyatakannya tersurat sejak awal: awalan
 * `singgahan:` dipisah dari `sesi:` dan `laju:` DI KEYSPACE YANG SAMA.
 *
 * `SCAN` + `UNLINK`, bukan `KEYS` + `DEL`. `KEYS` memblokir Redis selama
 * seluruh pemindaian, dan `DEL` membebaskan memorinya di utas utama. Pada
 * pengukuran beban keduanya akan ikut terhitung sebagai waktu aplikasi.
 */

/** Sebagian kecil antarmuka ioredis yang dibutuhkan penyapu. */
export interface KlienSapu {
  scan(
    kursor: string,
    penandaCocok: 'MATCH',
    pencocok: string,
    penandaHitung: 'COUNT',
    jumlah: number,
  ): Promise<[string, string[]]>;
  unlink(...kunci: string[]): Promise<number>;
}

/** Kunci per putaran `SCAN`. Sekadar petunjuk bagi Redis, bukan jaminan. */
const PER_PUTARAN = 500;

/**
 * Menghapus setiap kunci berawalan `awalan`, lalu mengembalikan jumlahnya.
 *
 * Awalan kosong DITOLAK: ia menjadi pola `*` dan menyapu seluruh basis data
 * logis, yang persis cacat yang fungsi ini ada untuk menghapusnya -- lewat
 * jalan yang lebih sunyi, karena tak lagi memakai nama `FLUSHDB`.
 */
export async function sapuAwalan(klien: KlienSapu, awalan: string): Promise<number> {
  if (awalan.trim() === '') {
    throw new Error(
      'Awalan kunci tak boleh kosong: polanya akan menjadi `*` dan menyapu ' +
        'seluruh basis data logis, termasuk sesi dan penghitung batas laju.',
    );
  }
  let kursor = '0';
  let dihapus = 0;
  do {
    const [berikut, kunci] = await klien.scan(kursor, 'MATCH', `${awalan}*`, 'COUNT', PER_PUTARAN);
    kursor = berikut;
    if (kunci.length > 0) {
      dihapus += await klien.unlink(...kunci);
    }
  } while (kursor !== '0');
  return dihapus;
}
