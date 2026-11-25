import { buildPeriode, isValidPeriode, periodeFromDate, periodeLabel } from './periode.util';

describe('periode.util', () => {
  describe('isValidPeriode', () => {
    it.each(['2026-Q1', '2026-Q4', '1999-Q2'])('%s valid', (value) => {
      expect(isValidPeriode(value)).toBe(true);
    });

    it.each(['2026', '2026-Q0', '2026-Q5', 'TRIWULAN II - 2026', '26-Q1', '2026-Q1 '])(
      '%s tidak valid',
      (value) => {
        expect(isValidPeriode(value)).toBe(false);
      },
    );
  });

  describe('buildPeriode', () => {
    it('menyusun tahun+triwulan jadi format kanonik', () => {
      expect(buildPeriode(2026, 2)).toBe('2026-Q2');
    });
  });

  describe('periodeFromDate', () => {
    it.each([
      [new Date(2026, 0, 15), '2026-Q1'],
      [new Date(2026, 3, 1), '2026-Q2'],
      [new Date(2026, 6, 31), '2026-Q3'],
      [new Date(2026, 11, 31), '2026-Q4'],
    ])('%s -> %s', (date, expected) => {
      expect(periodeFromDate(date)).toBe(expected);
    });

    /**
     * BUG-100 (25 November 2026): triwulan dibagi menurut WIB, bukan zona
     * proses. Masukan ditulis sebagai instan UTC supaya berkas ini membaca hal
     * yang sama di mesin mana pun; di laptop berzona Asia/Jakarta logika lama
     * pun memberi jawaban benar, jadi merahnya hanya tampak di bawah `TZ=UTC`.
     * Pagar zona di bawahnya merah di zona mana pun.
     */
    it.each([
      ['2026-03-31T17:30:00.000Z', '2026-Q2'], // 1 April 00.30 WIB
      ['2026-10-31T17:30:00.000Z', '2026-Q4'], // 1 November 00.30 WIB
      ['2026-12-31T20:00:00.000Z', '2027-Q1'], // 1 Januari 2027 03.00 WIB
      ['2026-06-30T16:59:00.000Z', '2026-Q2'], // 30 Juni 23.59 WIB, masih Q2
    ])('BUG-100: %s ikut triwulan WIB -> %s', (instan, expected) => {
      expect(periodeFromDate(new Date(instan))).toBe(expected);
    });

    it('BUG-100: tak memanggil satu pun metode Date berwaktu lokal', () => {
      const mata = (['getFullYear', 'getMonth', 'getDate', 'getHours'] as const).map(
        (m) => [m, jest.spyOn(Date.prototype, m)] as const,
      );
      try {
        periodeFromDate(new Date('2026-12-31T20:00:00.000Z'));
        const terpanggil = mata.filter(([, s]) => s.mock.calls.length > 0).map(([m]) => m);
        expect(terpanggil).toEqual([]);
      } finally {
        jest.restoreAllMocks();
      }
    });
  });

  describe('periodeLabel', () => {
    it('menerjemahkan ke label romawi ramah-baca', () => {
      expect(periodeLabel('2026-Q1')).toBe('Triwulan I - 2026');
      expect(periodeLabel('2026-Q4')).toBe('Triwulan IV - 2026');
    });

    it('data tak dikenal -> dikembalikan apa adanya (bukan error)', () => {
      expect(periodeLabel('2026')).toBe('2026');
    });
  });
});
