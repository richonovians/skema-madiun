import { PERAN_BEBAN } from './lib/akun-beban';
import { SKENARIO } from './skenario';

/**
 * Daftar peran skenario dan daftar peran akun beban harus sepakat.
 *
 * `jalankan.ts` menerbitkan satu sesi per nilai `PERAN_BEBAN`, lalu setiap
 * skenario mengambil sesi menurut `peran`-nya (baku `kabupaten`). Peran yang
 * dipakai skenario tetapi tak ada di daftar akun menghasilkan header
 * `authorization: undefined`, dan jawabannya 401 yang terbaca seperti cacat
 * penjaga -- bukan seperti salah susun pelarinya.
 */
describe('SKENARIO uji beban', () => {
  it('setiap peran yang dipakai skenario dimiliki akun beban', () => {
    for (const s of SKENARIO) {
      if (s.publik === true) continue;
      expect(PERAN_BEBAN).toContain(s.peran ?? 'kabupaten');
    }
  });

  it('nama skenario unik, karena --skenario= memilih menurut nama', () => {
    const nama = SKENARIO.map((s) => s.nama);
    expect(new Set(nama).size).toBe(nama.length);
  });

  /**
   * Dashboard Admin OPD tak punya skenario sampai 4 November 2026, padahal
   * QA-PERF meminta "dashboard < 3 detik" dan endpoint ini ikut menerima
   * penyaring Sampah BUG-013 yang memperlambat `/statistics` (BUG-067).
   * `@Roles(opd)` menolak sesi `kabupaten`, jadi ia butuh sesi `opd` sendiri.
   */
  it('dashboard Admin OPD diukur dengan sesi berperan opd', () => {
    const s = SKENARIO.find((x) => x.nama === 'dashboard-opd');
    expect(s).toBeDefined();
    expect(s?.jalur).toBe('/api/v1/dashboard/opd');
    expect(s?.peran).toBe('opd');
  });
});
