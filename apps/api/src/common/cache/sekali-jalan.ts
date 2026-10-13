/**
 * PENAHAN CACHE STAMPEDE: satu hitungan untuk banyak permintaan yang tiba
 * bersamaan dengan kunci yang sama.
 *
 * TERUKUR, bukan dijaga-jaga. Uji beban 13 Oktober 2026 pada 744 survei dan
 * 6,7 juta baris `answers`: sepuluh koneksi yang tiba bersamaan ke singgahan
 * KOSONG menghasilkan 0 permintaan tuntas dan 10 galat, karena kesepuluhnya
 * menjalankan agregat yang sama lalu berebut kolam koneksi Prisma yang berisi
 * sembilan. Singgahan ber-TTL tidak menolong di sini: justru pada saat ia
 * kosong, semua permintaan masuk serentak ke jalur hitung.
 *
 * BUKAN SINGGAHAN, dan bedanya penting. Kelas ini tidak menyimpan nilai apa
 * pun: entrinya hidup hanya selama hitungannya berjalan, lalu hilang. Yang
 * menyimpan tetap `PenyimpanSinggahan` dengan TTL dan pembatalannya. Menambah
 * penyimpanan di sini berarti membuat singgahan kedua yang tak ber-TTL dan tak
 * dapat dibatalkan -- dan ia akan menyajikan angka basi tanpa ada yang tahu.
 *
 * BATASNYA PER PROSES, dan itu harus disebut bersama manfaatnya. Petanya ada di
 * memori satu proses Node, jadi N instansi berarti N hitungan dingin, bukan
 * satu. Hari ini instansinya satu, dan penskalaan mendatar tetap terpalang
 * lampiran yang disimpan di cakram lokal. Kunci terdistribusi di Redis akan
 * menutup sisanya, tetapi ia menuntut metode baru pada antarmuka singgahan dan
 * menambah mode kegagalan yang hari ini tak dapat terjadi: kunci yang dipegang
 * proses yang mati.
 *
 * GAGAL TERBUKA, seperti singgahannya. Hitungan yang menolak diteruskan ke
 * SELURUH penunggu lalu entrinya dibersihkan, sehingga permintaan berikutnya
 * mencoba lagi. Entri yang tak dibersihkan akan membuat satu kegagalan sesaat
 * dipakai ulang sebagai jawaban selamanya.
 */
export class SekaliJalan {
  private readonly berjalan = new Map<string, Promise<unknown>>();

  /**
   * Jalankan `hitung` untuk `kunci`, atau ikut menunggu hitungan yang sudah
   * berjalan untuk kunci itu.
   *
   * `hitung` dibungkus fungsi async supaya galat yang dilemparnya SERENTAK ikut
   * menjadi penolakan. Tanpa itu, satu lemparan serentak melompati `finally`
   * dan entrinya tak pernah terdaftar -- jalur yang berbeda perilakunya dari
   * galat asinkron tanpa alasan yang dapat dijelaskan ke pemanggilnya.
   */
  jalankan<T>(kunci: string, hitung: () => Promise<T>): Promise<T> {
    const berjalan = this.berjalan.get(kunci);
    if (berjalan !== undefined) {
      return berjalan as Promise<T>;
    }
    const janji = (async () => hitung())().finally(() => {
      this.berjalan.delete(kunci);
    });
    this.berjalan.set(kunci, janji);
    return janji;
  }
}
