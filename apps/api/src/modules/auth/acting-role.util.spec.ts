import { Role } from '@prisma/client';
import { resolveActingRole } from './acting-role.util';

/**
 * Inti keamanan seluruh fitur multi-role: menentukan peran mana yang sedang
 * dipakai dari (a) klaim `act` di token dan (b) himpunan role yang benar-benar
 * dimiliki akun menurut basis data.
 */
describe('resolveActingRole', () => {
  it('act sah & dimiliki -> dipakai', () => {
    const hasil = resolveActingRole({
      roles: [Role.kabupaten, Role.opd],
      act: Role.opd,
      opdId: 1,
    });

    expect(hasil).toEqual({ ok: true, actingRole: Role.opd });
  });

  it('tanpa act & role TUNGGAL -> role itu, tanpa memilih', () => {
    const hasil = resolveActingRole({ roles: [Role.kabupaten], act: null, opdId: null });

    expect(hasil).toEqual({ ok: true, actingRole: Role.kabupaten });
  });

  it('tanpa act & role BANYAK -> wajib memilih', () => {
    const hasil = resolveActingRole({
      roles: [Role.kabupaten, Role.opd],
      act: null,
      opdId: null,
    });

    expect(hasil).toEqual({ ok: false, reason: 'SELECTION_REQUIRED' });
  });

  /**
   * Cabang yang menegakkan sifat "cabut role langsung berlaku": tokennya masih
   * menyebut `kabupaten`, tapi role itu sudah dicabut dari basis data. Hasilnya
   * HARUS memilih ulang -- bukan diam-diam turun ke role lain, karena itu berarti
   * hak seseorang berubah tanpa ia memutuskan apa pun.
   */
  it('act sudah TIDAK dimiliki lagi -> wajib memilih ulang, BUKAN jatuh ke role lain', () => {
    const hasil = resolveActingRole({ roles: [Role.opd], act: Role.kabupaten, opdId: 1 });

    expect(hasil).toEqual({ ok: false, reason: 'SELECTION_REQUIRED' });
  });

  it('act=opd tanpa opdId -> ditolak dengan sebab yang khas', () => {
    const hasil = resolveActingRole({ roles: [Role.opd], act: Role.opd, opdId: null });

    expect(hasil).toEqual({ ok: false, reason: 'OPD_WITHOUT_OPDID' });
  });

  /**
   * KONTROL untuk cabang "role tunggal langsung dipakai": role tunggal `opd`
   * TANPA opdId juga harus ditolak. Tanpa uji ini, jalan pintas itu bisa
   * melewati pemeriksaan opdId sama sekali dan cacatnya tak terlihat.
   */
  it('role TUNGGAL opd tanpa opdId -> tetap ditolak', () => {
    const hasil = resolveActingRole({ roles: [Role.opd], act: null, opdId: null });

    expect(hasil).toEqual({ ok: false, reason: 'OPD_WITHOUT_OPDID' });
  });

  it('roles kosong -> wajib memilih (tak ada yang bisa dipakai)', () => {
    const hasil = resolveActingRole({ roles: [], act: null, opdId: null });

    expect(hasil).toEqual({ ok: false, reason: 'SELECTION_REQUIRED' });
  });

  /**
   * Uji ini SEMPAT ditulis dengan harapan sebaliknya (jatuh ke role tunggalnya),
   * dan itu keliru: jatuh otomatis bisa menjadi KENAIKAN hak. Akun `[kabupaten]`
   * yang tokennya menyebut `act=opd` -- karena role `opd`-nya baru dicabut --
   * akan diam-diam memperoleh log aktivitas & manajemen pengguna, sementara
   * pemiliknya menyangka dirinya sedang menjadi Admin OPD.
   *
   * Karena itu "act ADA tapi tak dimiliki" selalu menuntut memilih ulang, tanpa
   * memandang berapa sisa rolenya. Yang boleh dipakai tanpa memilih hanyalah
   * keadaan "act TIDAK ADA sama sekali" (uji di atas).
   */
  it('act ADA tapi tak dimiliki, walau sisa role tunggal -> tetap wajib memilih', () => {
    const hasil = resolveActingRole({ roles: [Role.kabupaten], act: Role.opd, opdId: null });

    expect(hasil).toEqual({ ok: false, reason: 'SELECTION_REQUIRED' });
  });
});
