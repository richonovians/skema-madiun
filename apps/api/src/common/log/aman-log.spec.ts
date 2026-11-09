import { amankanLog } from './aman-log';

describe('amankanLog', () => {
  it('teks biasa lewat apa adanya, termasuk spasi dan huruf non-ASCII', () => {
    expect(amankanLog('access_denied Pengguna membatalkan — é ü')).toBe(
      'access_denied Pengguna membatalkan — é ü',
    );
  });

  it('LF dan CR menjadi escape yang terlihat, bukan baris baru', () => {
    const hasil = amankanLog('x\n[Nest] 1  - 01/01/2027     LOG [SsoService] palsu\r\ny');

    expect(hasil).not.toMatch(/[\r\n]/);
    expect(hasil).toBe('x\\u000a[Nest] 1  - 01/01/2027     LOG [SsoService] palsu\\u000d\\u000ay');
  });

  it('ESC dan seluruh kendali C0, DEL, serta C1 dinetralkan', () => {
    expect(amankanLog('\u001b[2J')).toBe('\\u001b[2J');
    expect(amankanLog('a\u0000b\tc\u007fd\u009be')).toBe('a\\u0000b\\u0009c\\u007fd\\u009be');
  });

  it('pemisah baris Unicode dan kendali arah teks ikut dinetralkan', () => {
    expect(amankanLog('a\u2028b\u2029c')).toBe('a\\u2028b\\u2029c');
    expect(amankanLog('\u202eabc\u2066d\u2069\u200f\u061c')).toBe(
      '\\u202eabc\\u2066d\\u2069\\u200f\\u061c',
    );
  });

  /**
   * Tanpa ini hasilnya tak dapat dibaca balik: masukan yang sudah berisi teks
   * `\u000a` (enam karakter) akan tampak sama persis dengan LF yang
   * dinetralkan, dan pengarang tautan dapat meniru keduanya sesuka hati.
   */
  it('garis miring terbalik digandakan sehingga escape palsu terbedakan', () => {
    expect(amankanLog('\\u000a')).toBe('\\\\u000a');
    expect(amankanLog('\n')).toBe('\\u000a');
  });

  it('tanda kutip ganda di-escape supaya batas nilai berkutip tak dapat ditutup dari dalam', () => {
    expect(amankanLog('x" palsu="y')).toBe('x\\" palsu=\\"y');
  });

  it('string kosong tetap kosong', () => {
    expect(amankanLog('')).toBe('');
  });
});
