import { awalHariWib, awalTanggalWib, jedaKeJamWib, tanggalWib } from './hari-wib';

/**
 * AWAL HARI MENURUT WIB (23 November 2026, batas harian pengaduan).
 *
 * Semua masukan dan harapan ditulis sebagai INSTAN UTC (`...Z`), bukan jam
 * dinding, supaya berkas ini membaca hal yang sama di mesin mana pun. Awal hari
 * 23 November WIB adalah 2026-11-22T17:00:00Z.
 *
 * MENGAPA ADA UJI PAGAR ZONA. Di laptop yang berzona Asia/Jakarta, logika lama
 * (`setHours(0, 0, 0, 0)`) memberi jawaban yang BENAR untuk ketiga kasus nilai
 * di bawah, sehingga uji nilai saja tak dapat merah di sana -- cacatnya hanya
 * muncul di server UTC. Mengubah `process.env.TZ` dari dalam uji pun tak
 * menolong: terukur 23 November 2026 di Jest 29 Windows, perubahannya diabaikan
 * (hanya `TZ` yang disetel sebelum proses mulai yang berlaku). Yang dapat
 * diperiksa di zona mana pun adalah SEBABNYA: metode `Date` berwaktu lokal
 * adalah satu-satunya jalan zona proses masuk ke hitungan.
 */
describe('awalHariWib', () => {
  const AWAL_23_NOV_WIB = new Date('2026-11-22T17:00:00.000Z');

  it('23.59 WIB masih hari yang sama', () => {
    expect(awalHariWib(new Date('2026-11-23T16:59:00.000Z'))).toEqual(AWAL_23_NOV_WIB);
  });

  it('00.00 WIB tepat sudah hari baru', () => {
    expect(awalHariWib(new Date('2026-11-22T17:00:00.000Z'))).toEqual(AWAL_23_NOV_WIB);
  });

  it('06.59 WIB (= 23.59 UTC hari sebelumnya) ikut hari WIB, bukan hari UTC', () => {
    expect(awalHariWib(new Date('2026-11-22T23:59:00.000Z'))).toEqual(AWAL_23_NOV_WIB);
  });

  it('tidak mengubah tanggal masukan', () => {
    const sekarang = new Date('2026-11-22T23:59:00.000Z');
    awalHariWib(sekarang);
    expect(sekarang.toISOString()).toBe('2026-11-22T23:59:00.000Z');
  });

  describe('awalTanggalWib (tanggal kalender WIB -> instan awal harinya)', () => {
    it('23 November 2026 dimulai 2026-11-22T17:00Z', () => {
      expect(awalTanggalWib(2026, 11, 23)).toEqual(AWAL_23_NOV_WIB);
    });

    it('bulan ditulis 1-12, dan pergantian tahun tetap benar', () => {
      expect(awalTanggalWib(2027, 1, 1)).toEqual(new Date('2026-12-31T17:00:00.000Z'));
    });
  });

  describe('tanggalWib (instan -> tanggal kalender WIB)', () => {
    it('06.59 WIB (= 23.59 UTC hari sebelumnya) sudah bertanggal WIB berikutnya', () => {
      expect(tanggalWib(new Date('2026-03-14T23:59:00.000Z'))).toEqual({
        tahun: 2026,
        bulan: 3,
        tanggal: 15,
      });
    });

    it('00.00 WIB 1 Januari sudah tahun baru, padahal UTC masih 31 Desember', () => {
      expect(tanggalWib(new Date('2026-12-31T17:00:00.000Z'))).toEqual({
        tahun: 2027,
        bulan: 1,
        tanggal: 1,
      });
    });
  });

  describe('jedaKeJamWib (tugas terjadwal harian, BUG-102)', () => {
    const JAM = 60 * 60 * 1000;

    it('02.00 WIB menuju 03.00 WIB hari yang sama: 1 jam', () => {
      expect(jedaKeJamWib(new Date('2026-11-25T19:00:00.000Z'), 3)).toBe(1 * JAM);
    });

    it('sudah lewat jamnya: menuju jam itu besok', () => {
      // 26 November 10.00 WIB -> 27 November 03.00 WIB
      expect(jedaKeJamWib(new Date('2026-11-26T03:00:00.000Z'), 3)).toBe(17 * JAM);
    });

    it('tepat pada jamnya: sehari penuh, bukan nol', () => {
      expect(jedaKeJamWib(new Date('2026-11-25T20:00:00.000Z'), 3)).toBe(24 * JAM);
    });

    it('23.30 WIB (16.30 UTC) menuju 03.00 WIB besok, bukan 03.00 UTC', () => {
      expect(jedaKeJamWib(new Date('2026-11-25T16:30:00.000Z'), 3)).toBe(3.5 * JAM);
    });
  });

  describe('pagar zona waktu proses', () => {
    const METODE_WAKTU_LOKAL = [
      'getFullYear',
      'getMonth',
      'getDate',
      'getDay',
      'getHours',
      'getMinutes',
      'getTimezoneOffset',
      'setFullYear',
      'setMonth',
      'setDate',
      'setHours',
      'setMinutes',
      'setSeconds',
      'setMilliseconds',
    ] as const;

    afterEach(() => jest.restoreAllMocks());

    it('tak memanggil satu pun metode Date berwaktu lokal', () => {
      const mata = METODE_WAKTU_LOKAL.map((m) => [m, jest.spyOn(Date.prototype, m)] as const);

      awalHariWib(new Date('2026-11-22T23:59:00.000Z'));
      awalTanggalWib(2026, 11, 23);
      tanggalWib(new Date('2026-11-22T23:59:00.000Z'));
      jedaKeJamWib(new Date('2026-11-25T19:00:00.000Z'), 3);

      const terpanggil = mata.filter(([, s]) => s.mock.calls.length > 0).map(([m]) => m);
      expect(terpanggil).toEqual([]);
    });
  });
});
