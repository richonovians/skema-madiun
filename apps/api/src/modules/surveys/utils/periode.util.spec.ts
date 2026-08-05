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
