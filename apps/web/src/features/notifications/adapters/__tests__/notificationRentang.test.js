import { RENTANG_BAWAAN, RENTANG_WAKTU, batasRentang } from '../notificationRentang';

/**
 * Saring rentang waktu (permintaan pengguna 13 September 2026: "kalau filter
 * notif berdasarkan waktu").
 *
 * Batasnya dihitung DI SINI, bukan di backend, supaya "30 hari terakhir"
 * berarti 30 hari di tempat penggunanya berada. Karena itu yang diuji adalah
 * komponen tanggal LOKAL, bukan bunyi string ISO-nya -- string itu berubah
 * mengikuti zona waktu mesin yang menjalankan uji.
 */
const SEKARANG = new Date(2026, 8, 13, 15, 30); // 13 September 2026, 15.30 lokal

const lokal = (iso) => {
  const d = new Date(iso);
  return {
    tahun: d.getFullYear(),
    bulan: d.getMonth(),
    tanggal: d.getDate(),
    jam: d.getHours(),
    menit: d.getMinutes(),
  };
};

describe('batasRentang', () => {
  it('"semua" tidak memasang batas apa pun', () => {
    expect(batasRentang('semua', SEKARANG)).toEqual({});
  });

  /**
   * Nilai asing bisa datang dari keadaan lama yang tersimpan di URL atau dari
   * salah ketik saat komponen dipanggil. Ia harus jatuh ke "tanpa batas", bukan
   * menjatuhkan halaman atau diam-diam menyembunyikan semua baris.
   */
  it('nilai yang tak dikenal jatuh ke tanpa batas, bukan melempar', () => {
    expect(batasRentang('entah-apa', SEKARANG)).toEqual({});
    expect(batasRentang(undefined, SEKARANG)).toEqual({});
  });

  /**
   * "30 hari terakhir" mencakup HARI INI ditambah 29 hari sebelumnya -- itu 30
   * tanggal kalender. Mundur 30 hari penuh akan mencakup 31 tanggal.
   */
  it('"30 hari terakhir" mulai dari 29 hari sebelum hari ini', () => {
    const { from } = batasRentang('30hari', SEKARANG);

    expect(lokal(from)).toMatchObject({ tahun: 2026, bulan: 7, tanggal: 15 });
  });

  /**
   * Batasnya tengah malam, bukan "jam yang sama 29 hari lalu". Kalau memakai
   * jam, notifikasi pagi pada hari tertua justru terbuang padahal tanggalnya
   * masih masuk hitungan -- dan hasilnya berubah menurut jam berapa halaman
   * itu dibuka.
   */
  it('batasnya tengah malam, bukan jam saat halaman dibuka', () => {
    const { from } = batasRentang('30hari', SEKARANG);

    expect(lokal(from)).toMatchObject({ jam: 0, menit: 0 });
  });

  it('"3 bulan terakhir" mundur tiga bulan kalender', () => {
    const { from } = batasRentang('3bulan', SEKARANG);

    expect(lokal(from)).toMatchObject({ tahun: 2026, bulan: 5, tanggal: 13 });
  });

  /**
   * 31 Mei mundur tiga bulan jatuh pada "31 Februari" yang tak ada. Aritmetika
   * Date bawaan akan meluber ke 3 Maret -- mempersempit rentangnya diam-diam.
   * Tanggalnya dijepit ke hari terakhir bulan tujuan.
   */
  it('tanggal yang tak ada di bulan tujuan dijepit, bukan meluber ke bulan berikutnya', () => {
    const { from } = batasRentang('3bulan', new Date(2026, 4, 31, 9, 0));

    // 2026 bukan tahun kabisat, jadi Februari berakhir di tanggal 28.
    expect(lokal(from)).toMatchObject({ tahun: 2026, bulan: 1, tanggal: 28 });
  });

  it('"tahun ini" mulai dari 1 Januari tahun berjalan', () => {
    const { from } = batasRentang('tahunIni', SEKARANG);

    expect(lokal(from)).toMatchObject({ tahun: 2026, bulan: 0, tanggal: 1, jam: 0 });
  });

  it('batasnya berupa string ISO, siap dikirim sebagai query', () => {
    const { from } = batasRentang('30hari', SEKARANG);

    expect(typeof from).toBe('string');
    expect(Number.isNaN(new Date(from).getTime())).toBe(false);
  });

  /**
   * Tak ada preset yang memasang batas atas: semuanya berakhir "sampai
   * sekarang". Memasang `to` berarti menyembunyikan notifikasi yang datang
   * sedetik setelah halaman dimuat.
   */
  it('tak ada preset yang memasang batas atas', () => {
    for (const { value } of RENTANG_WAKTU) {
      expect(batasRentang(value, SEKARANG).to).toBeUndefined();
    }
  });
});

describe('RENTANG_WAKTU', () => {
  it('bawaannya ada di dalam daftar pilihan', () => {
    expect(RENTANG_WAKTU.some((r) => r.value === RENTANG_BAWAAN)).toBe(true);
  });

  /**
   * Labelnya sengaja LEBIH KASAR daripada kepala kelompok tanggal ("Hari ini",
   * "Kemarin", "7 hari terakhir"). Kalau keduanya memakai kata yang sama,
   * menyaring ke "7 hari terakhir" akan disambut kepala kelompok bernama sama
   * -- membingungkan tanpa memberi apa-apa.
   */
  it('labelnya tidak menggemakan kepala kelompok tanggal', () => {
    const label = RENTANG_WAKTU.map((r) => r.label);

    expect(label).not.toContain('Hari ini');
    expect(label).not.toContain('Kemarin');
    expect(label).not.toContain('7 hari terakhir');
  });

  it('tiap pilihan punya nilai yang unik', () => {
    const nilai = RENTANG_WAKTU.map((r) => r.value);
    expect(new Set(nilai).size).toBe(nilai.length);
  });
});
