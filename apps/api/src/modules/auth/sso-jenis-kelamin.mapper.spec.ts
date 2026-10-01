import { JenisKelamin } from '@prisma/client';
import { petakanJenisKelamin } from './sso-jenis-kelamin.mapper';

/**
 * Pemetaan jenis kelamin dari klaim Helpdesk (1 Oktober 2026).
 *
 * DUA PENGKODEAN UNTUK SATU MEDAN, dan itu terukur bukan dikira. Dua payload
 * sungguhan dari penyedia yang sama mengirim nilai yang berbeda bentuk:
 *
 *   GET /api/oauth/userinfo -> demographics.jenis_kelamin = "Laki-laki"
 *   GET /api/me             -> jenis_kelamin             = "L"
 *
 * Inilah sebabnya kedua API itu tak boleh diperlakukan sebagai dua potret dari
 * satu bentuk. Pemeta ini menerima keduanya dan menolak sisanya.
 */
describe('petakanJenisKelamin', () => {
  it('menerima bentuk panjang dari userinfo', () => {
    expect(petakanJenisKelamin('Laki-laki')).toBe(JenisKelamin.laki_laki);
    expect(petakanJenisKelamin('Perempuan')).toBe(JenisKelamin.perempuan);
  });

  it('menerima bentuk satu huruf dari /api/me', () => {
    expect(petakanJenisKelamin('L')).toBe(JenisKelamin.laki_laki);
    expect(petakanJenisKelamin('P')).toBe(JenisKelamin.perempuan);
  });

  it('menerima bentuk enum milik SKEMA sendiri', () => {
    expect(petakanJenisKelamin('laki_laki')).toBe(JenisKelamin.laki_laki);
    expect(petakanJenisKelamin('perempuan')).toBe(JenisKelamin.perempuan);
  });

  it('tidak peduli besar-kecil huruf maupun spasi di tepi', () => {
    expect(petakanJenisKelamin('  LAKI-LAKI  ')).toBe(JenisKelamin.laki_laki);
    expect(petakanJenisKelamin('p')).toBe(JenisKelamin.perempuan);
  });

  /**
   * MENOLAK, BUKAN MENEBAK. Nilai yang tak dikenali menjadi `null` dan barisnya
   * disembunyikan di tampilan. Menebak berarti mencatat jenis kelamin yang
   * salah pada data seseorang, dan kesalahan itu tak terlihat oleh siapa pun --
   * berbeda dengan medan kosong, yang terlihat.
   */
  it.each([
    ['kosong', ''],
    ['spasi saja', '   '],
    ['tak dikenali', 'Lainnya'],
    ['huruf lain', 'X'],
    ['angka sebagai teks', '1'],
  ])('menolak nilai %s', (_label, nilai) => {
    expect(petakanJenisKelamin(nilai)).toBeNull();
  });

  it('menolak null, undefined, dan yang bukan string', () => {
    expect(petakanJenisKelamin(null)).toBeNull();
    expect(petakanJenisKelamin(undefined)).toBeNull();
    expect(petakanJenisKelamin(1)).toBeNull();
    expect(petakanJenisKelamin(['L'])).toBeNull();
  });
});
