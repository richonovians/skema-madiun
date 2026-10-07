/**
 * Daftar sesi yang masih berlaku.
 *
 * ALASAN KEBERADAANNYA (7 Oktober 2026): sesi SKEMA adalah JWT tanpa penyimpan
 * di server, sehingga tak ada yang dapat dicabut sebelum kedaluwarsa.
 * `POST /auth/logout` hanya menghapus cookie di peramban yang memanggilnya, dan
 * salinan cookie yang terlanjur keluar tetap sah sampai pagu `abs` lewat.
 *
 * YANG BUKAN URUSANNYA: penonaktifan akun, soft-delete, dan pencabutan peran.
 * Ketiganya sudah berlaku seketika karena dibaca ulang dari basis data pada
 * setiap permintaan di `SessionAuthProvider.bacaSesi()`. Menambahkannya ke sini
 * berarti dua sumber kebenaran untuk satu aturan.
 *
 * Antarmuka, bukan kelas Redis langsung, supaya uji unit tak menuntut Redis
 * hidup. Pola yang sama dipakai `OpdSource` / `StubOpdSource`.
 */
export interface CatatanSesi {
  /** Pemilik sesi. */
  uid: number;
  /** Pagu mutlak sesi, detik epoch. Sama dengan klaim `abs` pada tokennya. */
  abs: number;
  /** Keterangan perangkat, apa adanya dari header. Boleh kosong. */
  ua?: string;
  /** Alamat yang terlihat server. Boleh kosong. */
  ip?: string;
}

/** Keterangan perangkat untuk daftar sesi aktif. Tak pernah menentukan hak akses. */
export interface PerangkatSesi {
  ua?: string;
  ip?: string;
}

export interface SesiTerdaftar extends CatatanSesi {
  sid: string;
}

export interface PenyimpanSesi {
  /** Catat sesi baru. TTL-nya mengikuti `abs`. */
  simpan(sid: string, catatan: CatatanSesi): Promise<void>;

  /**
   * Sesi ini masih berlaku?
   *
   * MELEMPAR bila penyimpannya tak dapat menjawab. Pemanggil WAJIB
   * memperlakukan lemparan itu sebagai penolakan, bukan sebagai izin: daftar
   * pencabutan yang dapat dilewati dengan menjatuhkan penyimpannya bukan daftar
   * pencabutan sama sekali.
   */
  hidup(sid: string): Promise<boolean>;

  /** Cabut satu sesi. Sid yang tak dikenal bukan galat. */
  cabut(sid: string): Promise<void>;

  /** Cabut seluruh sesi milik satu akun. Akun lain tak tersentuh. */
  cabutSemua(uid: number): Promise<void>;

  /** Sesi yang masih berlaku milik satu akun. Yang basi tidak ikut. */
  daftar(uid: number): Promise<SesiTerdaftar[]>;
}

/** Token terbitan lama tak punya `sid`; lihat catatan di SessionService. */
export const PENYIMPAN_SESI = Symbol('PENYIMPAN_SESI');
