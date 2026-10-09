/**
 * Pencabutan tautan lampiran per akun (9 Oktober 2026).
 *
 * ALASAN KEBERADAANNYA. Tanda tangan lampiran kini mengikat `sub`, tetapi
 * mengikat saja belum mencabut apa pun: tautan yang terlanjur dipegang
 * seseorang tetap sah sampai `exp` lewat, walau perannya sudah dicabut atau ia
 * sudah menekan `POST /auth/logout-semua`. Penyimpan inilah yang menutup
 * jendela itu.
 *
 * BENTUKNYA SATU CAP WAKTU PER AKUN, bukan daftar tautan. "Seluruh tautan milik
 * akun ini yang diterbitkan SEBELUM detik ini batal" dapat dinyatakan satu
 * angka, dan angka itu tak tumbuh mengikuti jumlah lampiran. Daftar per tautan
 * akan tumbuh tanpa batas dan tak ada yang tahu kapan boleh dipangkas.
 *
 * TTL-NYA SELAMA UMUR TAUTAN TERPANJANG. Sesudah itu seluruh tautan terbitan
 * lama sudah kedaluwarsa dengan sendirinya, sehingga catatan pencabutannya tak
 * lagi punya pekerjaan dan boleh hilang.
 *
 * GAGAL TERTUTUP, sama dengan `PenyimpanSesi` dan sengaja BERBEDA dari
 * `PenyimpanSinggahan`. Yang dijaga di sini adalah akses ke lampiran pengaduan,
 * data paling sensitif di sistem ini; pencabutan yang dapat dilewati dengan
 * menjatuhkan Redis bukan pencabutan. `hidup()` karena itu MELEMPAR bila
 * penyimpannya tak dapat menjawab, dan pemanggilnya wajib membaca lemparan itu
 * sebagai penolakan.
 */
export interface PenyimpanCabutLampiran {
  /**
   * Batalkan seluruh tautan milik `uid` yang diterbitkan sebelum `padaDetik`.
   * Memanggilnya dua kali tidak merugikan: yang tersimpan selalu cap waktu
   * terbaru.
   */
  cabut(uid: number, padaDetik: number): Promise<void>;

  /**
   * Detik epoch pencabutan terakhir milik `uid`, atau `null` bila tak pernah
   * dicabut.
   *
   * MELEMPAR bila penyimpannya tak dapat menjawab. Lihat catatan gagal-tertutup
   * di atas: pemanggil WAJIB memperlakukan lemparan sebagai penolakan.
   */
  dicabutPada(uid: number): Promise<number | null>;
}

export const PENYIMPAN_CABUT_LAMPIRAN = Symbol('PENYIMPAN_CABUT_LAMPIRAN');
