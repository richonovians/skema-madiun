import { SekaliJalan } from './sekali-jalan';

/**
 * Janji yang diselesaikan dari luar, supaya pemanggilan serentak dapat disusun
 * dengan tepat. Tanpa ini hitungan pertama sudah selesai sebelum pemanggilan
 * kedua dibuat, dan ujinya lulus walau penahannya tidak ada -- bentuk uji
 * palsu yang paling mudah ditulis di sini.
 */
function tertunda<T>(): {
  janji: Promise<T>;
  selesaikan: (nilai: T) => void;
  tolak: (err: unknown) => void;
} {
  let selesaikan!: (nilai: T) => void;
  let tolak!: (err: unknown) => void;
  const janji = new Promise<T>((res, rej) => {
    selesaikan = res;
    tolak = rej;
  });
  return { janji, selesaikan, tolak };
}

describe('SekaliJalan', () => {
  it('sepuluh pemanggilan serentak berkunci sama hanya menghitung SEKALI', async () => {
    const tunggu = tertunda<string>();
    const hitung = jest.fn(() => tunggu.janji);
    const sekali = new SekaliJalan();

    const semua = Array.from({ length: 10 }, () => sekali.jalankan('kunci', hitung));
    tunggu.selesaikan('nilai');

    await expect(Promise.all(semua)).resolves.toEqual(Array.from({ length: 10 }, () => 'nilai'));
    expect(hitung).toHaveBeenCalledTimes(1);
  });

  /**
   * Kunci berbeda TIDAK boleh saling menunggu. Satu kunci untuk semua akan
   * menyajikan hasil tersaring periode kepada orang yang tak menyaring apa pun
   * -- cacat kebenaran, bukan cacat kecepatan.
   */
  it('kunci berbeda dihitung tersendiri', async () => {
    const hitung = jest.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b');
    const sekali = new SekaliJalan();

    const hasil = await Promise.all([
      sekali.jalankan('satu', hitung),
      sekali.jalankan('dua', hitung),
    ]);

    expect(hasil).toEqual(['a', 'b']);
    expect(hitung).toHaveBeenCalledTimes(2);
  });

  /**
   * HITUNGAN YANG GAGAL TAK BOLEH DIWARISI SELAMANYA. Entri yang tak dibersihkan
   * membuat satu kegagalan sesaat -- Postgres yang sedang penuh, misalnya --
   * dipakai ulang sebagai jawaban bagi setiap permintaan sesudahnya, dan
   * endpoint-nya mati permanen sampai prosesnya dinyalakan ulang.
   */
  it('penolakan diteruskan ke SEMUA penunggu, lalu entrinya dibersihkan', async () => {
    const tunggu = tertunda<string>();
    const hitung = jest
      .fn<Promise<string>, []>()
      .mockReturnValueOnce(tunggu.janji)
      .mockResolvedValueOnce('kedua');
    const sekali = new SekaliJalan();

    const pertama = sekali.jalankan('kunci', hitung);
    const kedua = sekali.jalankan('kunci', hitung);
    tunggu.tolak(new Error('hitungan gagal'));

    await expect(pertama).rejects.toThrow('hitungan gagal');
    await expect(kedua).rejects.toThrow('hitungan gagal');
    await expect(sekali.jalankan('kunci', hitung)).resolves.toBe('kedua');
    expect(hitung).toHaveBeenCalledTimes(2);
  });

  /**
   * INI PENAHAN STAMPEDE, BUKAN SINGGAHAN. Nilainya tidak disimpan: begitu
   * hitungannya tuntas, entrinya hilang dan permintaan berikutnya menghitung
   * ulang. Yang menyimpan nilainya tetap `PenyimpanSinggahan`, dan membuat
   * kelas ini ikut menyimpan akan menambah singgahan kedua tanpa TTL maupun
   * pembatalan.
   */
  it('TIDAK menyimpan nilainya: pemanggilan sesudah selesai menghitung ulang', async () => {
    const hitung = jest.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b');
    const sekali = new SekaliJalan();

    await expect(sekali.jalankan('kunci', hitung)).resolves.toBe('a');
    await expect(sekali.jalankan('kunci', hitung)).resolves.toBe('b');
    expect(hitung).toHaveBeenCalledTimes(2);
  });

  it('galat yang dilempar SERENTAK oleh fungsi hitung menjadi penolakan, bukan lemparan', async () => {
    const sekali = new SekaliJalan();

    await expect(
      sekali.jalankan('kunci', () => {
        throw new Error('meledak seketika');
      }),
    ).rejects.toThrow('meledak seketika');
  });
});
