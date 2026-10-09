/**
 * Singgahan nilai terkomputasi (7 Oktober 2026).
 *
 * ALASAN KEBERADAANNYA: beberapa jawaban mahal dihitung ulang dari nol pada
 * SETIAP permintaan walau datanya tak berubah tiap detik -- yang pertama adalah
 * statistik publik (`GET /statistics`), yang tanpa autentikasi dan terekspos
 * langsung ke poster/QR. Singgahan ber-TTL memangkas hitungan itu tanpa logika
 * invalidasi: nilai basi beberapa menit dapat diterima untuk ringkasan publik.
 *
 * BUKAN URUSANNYA: apa pun yang menuntut kebenaran seketika. Status akun, peran,
 * dan isolasi OPD dibaca ULANG dari basis data tiap permintaan dengan sengaja
 * (lihat SessionAuthProvider) -- menaruhnya di singgahan berarti pencabutan baru
 * berlaku setelah TTL lewat. Singgahan ini hanya untuk angka ringkasan yang
 * boleh tertinggal sejenak.
 *
 * Antarmuka, bukan kelas Redis langsung: uji unit tak menuntut Redis hidup, dan
 * tanpa `REDIS_URL` pemakainya mendapat implementasi NONAKTIF yang selalu
 * meleset -- sehingga perilakunya persis seperti sebelum singgahan ada. Pola
 * yang sama dipakai `PenyimpanSesi`.
 *
 * GAGAL TERBUKA (fail-open): pembacaan yang galat dilaporkan sebagai MELESET,
 * penulisan yang galat diabaikan. Singgahan yang tak terjangkau hanya membuat
 * jawabannya dihitung ulang dari basis data -- lebih lambat, tak pernah salah.
 * Ini kebalikan dari PenyimpanSesi yang gagal tertutup, dan bedanya disengaja:
 * sesi menyangkut akses, singgahan hanya menyangkut kecepatan.
 */
export interface PenyimpanSinggahan {
  /** Nilai tersimpan, atau `null` bila tak ada / tak terjangkau. */
  ambil<T>(kunci: string): Promise<T | null>;

  /** Simpan nilai dengan umur `ttlDetik`. Galat ditelan: singgahan bukan sumber kebenaran. */
  simpan<T>(kunci: string, nilai: T, ttlDetik: number): Promise<void>;

  /** Batalkan satu kunci. Galat ditelan, sama seperti `simpan`. */
  hapus(kunci: string): Promise<void>;
}

export const PENYIMPAN_SINGGAHAN = Symbol('PENYIMPAN_SINGGAHAN');
