import { periksaDevLogin } from './gerbang-dev-login';

/**
 * Gerbang boot dev-login (7 November 2026).
 *
 * Di produksi saklar `DEV_LOGIN_ENABLED` diabaikan oleh konfigurasi, jadi
 * rutenya tetap 404. Gerbang ini membuat kesalahan konfigurasi itu NYARING:
 * seseorang yang menyalakan dev-login di produksi hampir pasti salah menyalin
 * `.env` pengembangan, dan berkas yang sama kemungkinan membawa kunci serta
 * alamat yang juga salah.
 */
describe('periksaDevLogin', () => {
  it('produksi dengan DEV_LOGIN_ENABLED=true -> menolak menyala', () => {
    expect(() => periksaDevLogin('production', 'true')).toThrow(/DEV_LOGIN_ENABLED/);
  });

  it('produksi tanpa saklar -> lolos', () => {
    expect(() => periksaDevLogin('production', undefined)).not.toThrow();
  });

  it('produksi dengan saklar bukan "true" -> lolos, karena memang tak menyalakan apa pun', () => {
    expect(() => periksaDevLogin('production', 'false')).not.toThrow();
  });

  it('pengembangan dengan saklar hidup -> lolos', () => {
    expect(() => periksaDevLogin('development', 'true')).not.toThrow();
  });
});
