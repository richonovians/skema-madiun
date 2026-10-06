import { adaptUser } from '../user.adapter';

/**
 * `bolehJadiAdminOpd` dari backend (6 Oktober 2026).
 *
 * MENGAPA DILEWATKAN, BUKAN DIHITUNG DI SINI. Aturannya bergantung pada
 * `NODE_ENV` backend -- gerbang ASN hanya hidup di produksi -- dan frontend tak
 * tahu apa pun tentang itu. Menghitungnya ulang di adapter berarti dua salinan
 * aturan, dan yang pasti terjadi adalah kotak centang yang dapat ditekan
 * tetapi ditolak 400.
 *
 * ADAPTER TIDAK MENGARANG NILAI (aturan apps/web/AGENTS.md). Medan yang tak
 * dikirim backend menjadi `null` -- "tak diberitahu" -- bukan `true` atau
 * `false` yang keduanya berarti sesuatu yang belum pernah dinyatakan siapa pun.
 */
describe('adaptUser: bolehJadiAdminOpd', () => {
  const dasar = {
    id: 1,
    nama: 'Budi Santoso',
    email: 'budi@example.go.id',
    roles: ['responden'],
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
  };

  it('melewatkan `false` apa adanya', () => {
    expect(adaptUser({ ...dasar, bolehJadiAdminOpd: false }).bolehJadiAdminOpd).toBe(false);
  });

  it('melewatkan `true` apa adanya', () => {
    expect(adaptUser({ ...dasar, bolehJadiAdminOpd: true }).bolehJadiAdminOpd).toBe(true);
  });

  it('medan yang tak dikirim menjadi null, bukan diterka', () => {
    expect(adaptUser(dasar).bolehJadiAdminOpd).toBeNull();
  });
});
