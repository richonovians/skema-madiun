import {
  buildPeriodeFilter,
  buildTahunOptions,
  cocokPeriode,
  formatPeriodeLabel,
  parsePeriodeFilter,
} from '../survey.adapter';

/**
 * PENYARING PERIODE DIPISAH (6 Oktober 2026, permintaan pengguna: "ubah dropdown
 * periode menjadi pisah antara triwulan dan tahun berbeda dropdown").
 *
 * Satu dropdown gabungan "Triwulan I - 2026" diganti sepasang: Tahun (wajib) dan
 * Triwulan (boleh "Semua"). Nilainya TETAP SATU STRING, sebab seluruh state
 * halaman, parameter API, dan penyaringan klien sudah berbentuk begitu --
 * memecahnya menjadi dua nilai akan menyentuh belasan tempat tanpa menambah
 * kemampuan apa pun.
 *
 * Dua bentuk yang sah:
 *   `2026-Q2`  satu triwulan      (bentuk kanonik lama, tak berubah)
 *   `2026`     setahun penuh      (bentuk baru, "Semua Triwulan")
 */
describe('penyaring periode: tahun + triwulan', () => {
  describe('parsePeriodeFilter', () => {
    it('membaca bentuk kanonik satu triwulan', () => {
      expect(parsePeriodeFilter('2026-Q2')).toEqual({ tahun: 2026, triwulan: 2 });
    });

    it('membaca tahun saja sebagai triwulan `null`', () => {
      // `null` berarti "semua triwulan", dan sengaja BUKAN 0 atau '' --
      // keduanya dapat terbaca sebagai triwulan yang sah di tempat lain.
      expect(parsePeriodeFilter('2026')).toEqual({ tahun: 2026, triwulan: null });
    });

    it('nilai kosong menjadi null, bukan tahun karangan', () => {
      expect(parsePeriodeFilter('')).toBeNull();
      expect(parsePeriodeFilter(undefined)).toBeNull();
    });

    it('bentuk asing ditolak, bukan ditebak sebagian', () => {
      expect(parsePeriodeFilter('2026-Q9')).toBeNull();
      expect(parsePeriodeFilter('triwulan-2')).toBeNull();
    });
  });

  describe('buildPeriodeFilter', () => {
    it('triwulan terpilih menghasilkan bentuk kanonik', () => {
      expect(buildPeriodeFilter(2026, 3)).toBe('2026-Q3');
    });

    it('triwulan `null` menghasilkan tahun saja', () => {
      expect(buildPeriodeFilter(2026, null)).toBe('2026');
    });
  });

  describe('cocokPeriode', () => {
    it('tanpa penyaring: semuanya cocok', () => {
      expect(cocokPeriode('2026-Q1', '')).toBe(true);
    });

    it('penyaring satu triwulan hanya cocok persis', () => {
      expect(cocokPeriode('2026-Q1', '2026-Q1')).toBe(true);
      expect(cocokPeriode('2026-Q2', '2026-Q1')).toBe(false);
    });

    it('penyaring setahun cocok untuk SELURUH triwulan tahun itu', () => {
      expect(cocokPeriode('2026-Q1', '2026')).toBe(true);
      expect(cocokPeriode('2026-Q4', '2026')).toBe(true);
      expect(cocokPeriode('2025-Q4', '2026')).toBe(false);
    });

    it('tahun yang berawalan sama TIDAK ikut tercocok', () => {
      // Penjaga pencocokan awalan yang naif: `'20261-Q1'.startsWith('2026')`
      // benar, padahal itu tahun yang sama sekali lain.
      expect(cocokPeriode('20261-Q1', '2026')).toBe(false);
    });
  });

  describe('buildTahunOptions', () => {
    it('berpusat pada tahun berjalan, terbaru di atas', () => {
      // Dari Mei 2026 (Q2): satu triwulan ke depan masih 2026-Q3, dan tujuh ke
      // belakang berhenti di 2024-Q3. Jadi rentangnya 2024-2026, TANPA 2027 --
      // harapan pertama uji ini keliru di titik itu, bukan kodenya.
      const opsi = buildTahunOptions({ from: new Date('2026-05-10T00:00:00Z') });

      expect(opsi.map((o) => o.value)).toEqual(['2026', '2025', '2024']);
    });

    it('tak ada tahun kembar', () => {
      const nilai = buildTahunOptions({ from: new Date('2026-05-10T00:00:00Z') }).map((o) => o.value);

      expect(new Set(nilai).size).toBe(nilai.length);
    });
  });

  describe('formatPeriodeLabel terhadap bentuk bertahun', () => {
    it('nilai bertahun terbaca sebagai setahun penuh, bukan angka telanjang', () => {
      // Label ini dipakai di beberapa layar yang menggemakan penyaring aktif
      // (IkmLeaderboard, KabFilterScopeNote). Sejak penyaringnya dapat berupa
      // tahun saja, "2026" sendirian terbaca seperti potongan data, bukan
      // seperti periode yang sedang dipilih.
      expect(formatPeriodeLabel('2026')).toBe('Tahun 2026');
    });

    it('bentuk kanonik TIDAK berubah', () => {
      expect(formatPeriodeLabel('2026-Q2')).toBe('Triwulan II - 2026');
    });
  });
});
