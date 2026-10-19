import { kelompokkanNotifikasi } from '../notificationKelompok';

/**
 * Permintaan pengguna 13 September 2026, tahap (3). Halaman ini gunanya
 * menelusuri riwayat panjang, tapi dua puluh baris mengalir tanpa satu pun
 * pegangan: pada potret nyata, "5 jam lalu", "Kemarin", "3 hari lalu", dan
 * "18 Agu 2026" berderet tanpa pemisah apa pun.
 *
 * Waktu dikunci di tiap uji supaya batas harinya pasti, bukan bergantung kapan
 * uji dijalankan -- batas "hari ini" adalah TANGGAL KALENDER, bukan 24 jam
 * terakhir, sebab itulah yang dipahami pembacanya.
 */
const SEKARANG = new Date('2026-09-13T15:00:00+07:00');

const notif = (id, createdAt) => ({ id, createdAt, title: `Notifikasi ${id}` });

/**
 * Stempel waktu pada tanggal kalender LOKAL, digeser dari SEKARANG.
 *
 * Uji batas hari HARUS dibangun begini, bukan dengan offset +07:00 yang
 * ditulis tangan. Pengelompokan memakai tanggal kalender lokal pembacanya,
 * sehingga "13 September 00.30 +07:00" adalah 12 September bagi mesin yang
 * berjalan di UTC. Runner GitHub berjalan di UTC, dan uji di bawah memang
 * merah di sana sementara hijau di mesin pengembang (UTC+7) -- satu-satunya
 * dari 891 uji apps/web yang begitu.
 *
 * Zona waktu CI sengaja TIDAK dipatok ke WIB. Dibiarkan UTC, ia jadi penjaga
 * cuma-cuma untuk asumsi zona waktu yang terselip seperti ini.
 */
const padaHariLokal = (geserHari, jam, menit) => {
  const d = new Date(SEKARANG);
  d.setDate(d.getDate() + geserHari);
  d.setHours(jam, menit, 0, 0);
  return d.toISOString();
};

describe('kelompokkanNotifikasi', () => {
  let nowSpy;
  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(SEKARANG.getTime());
  });
  afterEach(() => nowSpy.mockRestore());

  it('daftar kosong menghasilkan nol kelompok, bukan kelompok kosong', () => {
    expect(kelompokkanNotifikasi([])).toEqual([]);
    expect(kelompokkanNotifikasi(undefined)).toEqual([]);
  });

  it('memisahkan hari ini, kemarin, minggu ini, dan bulan-bulan lama', () => {
    const hasil = kelompokkanNotifikasi([
      notif(1, '2026-09-13T14:00:00+07:00'),
      notif(2, '2026-09-13T08:00:00+07:00'),
      notif(3, '2026-09-12T22:00:00+07:00'),
      notif(4, '2026-09-10T09:00:00+07:00'),
      notif(5, '2026-08-18T09:00:00+07:00'),
      notif(6, '2026-07-13T09:00:00+07:00'),
    ]);

    expect(hasil.map((k) => k.label)).toEqual([
      'Hari ini',
      'Kemarin',
      '7 hari terakhir',
      'Agustus 2026',
      'Juli 2026',
    ]);
    expect(hasil[0].items.map((n) => n.id)).toEqual([1, 2]);
    expect(hasil[1].items.map((n) => n.id)).toEqual([3]);
    expect(hasil[2].items.map((n) => n.id)).toEqual([4]);
  });

  /**
   * "Hari ini" adalah tanggal kalender. Pukul 00:30 hari ini berjarak kurang
   * dari 24 jam dari pukul 15:00 kemarin, tapi keduanya BUKAN hari yang sama --
   * pengelompokan berbasis selisih jam akan menaruhnya bersama.
   */
  it('batasnya tanggal kalender, bukan selisih 24 jam', () => {
    const hasil = kelompokkanNotifikasi([
      notif(1, padaHariLokal(0, 0, 30)),
      notif(2, padaHariLokal(-1, 23, 30)),
    ]);

    expect(hasil.map((k) => k.label)).toEqual(['Hari ini', 'Kemarin']);
  });

  it('tepat 7 hari lalu sudah keluar dari "7 hari terakhir"', () => {
    const hasil = kelompokkanNotifikasi([
      notif(1, '2026-09-07T09:00:00+07:00'),
      notif(2, '2026-09-06T09:00:00+07:00'),
    ]);

    expect(hasil.map((k) => k.label)).toEqual(['7 hari terakhir', 'September 2026']);
  });

  it('menggabungkan baris sebulan walau tanggalnya berjauhan', () => {
    const hasil = kelompokkanNotifikasi([
      notif(1, '2026-08-30T09:00:00+07:00'),
      notif(2, '2026-08-02T09:00:00+07:00'),
    ]);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].label).toBe('Agustus 2026');
    expect(hasil[0].items.map((n) => n.id)).toEqual([1, 2]);
  });

  it('bulan yang sama di tahun berbeda TIDAK digabung', () => {
    const hasil = kelompokkanNotifikasi([
      notif(1, '2026-07-05T09:00:00+07:00'),
      notif(2, '2025-07-05T09:00:00+07:00'),
    ]);

    expect(hasil.map((k) => k.label)).toEqual(['Juli 2026', 'Juli 2025']);
  });

  it('urutan dari backend dipertahankan, tak diurutkan ulang diam-diam', () => {
    const hasil = kelompokkanNotifikasi([
      notif(1, '2026-09-13T08:00:00+07:00'),
      notif(2, '2026-09-13T14:00:00+07:00'),
    ]);

    // Backend sudah mengurutkan terbaru dulu; kalau adapter ikut mengurutkan,
    // halaman berikutnya akan berbeda urutan dari halaman sebelumnya.
    expect(hasil[0].items.map((n) => n.id)).toEqual([1, 2]);
  });

  it('kunci tiap kelompok unik, supaya dapat dipakai sebagai key React', () => {
    const hasil = kelompokkanNotifikasi([
      notif(1, '2026-09-13T08:00:00+07:00'),
      notif(2, '2026-09-12T08:00:00+07:00'),
      notif(3, '2026-08-12T08:00:00+07:00'),
      notif(4, '2025-08-12T08:00:00+07:00'),
    ]);

    const kunci = hasil.map((k) => k.kunci);
    expect(new Set(kunci).size).toBe(kunci.length);
  });

  /**
   * Baris tanpa `createdAt` yang sah tak boleh menjatuhkan seluruh halaman.
   * Ia dikumpulkan terpisah supaya tetap terlihat, bukan dibuang diam-diam.
   */
  it('tanggal yang tak sah tidak menjatuhkan halaman', () => {
    const hasil = kelompokkanNotifikasi([notif(1, 'bukan-tanggal'), notif(2, null)]);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].items.map((n) => n.id)).toEqual([1, 2]);
    expect(hasil[0].label).toMatch(/\S/);
  });

  it('tanggal di masa depan (jam server melenceng) dianggap hari ini', () => {
    const hasil = kelompokkanNotifikasi([notif(1, '2026-09-13T23:59:00+07:00')]);
    expect(hasil[0].label).toBe('Hari ini');
  });
});
