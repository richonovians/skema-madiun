import { randomBytes } from 'node:crypto';
import {
  dekripsi as dekripsiTs,
  enkripsi as enkripsiTs,
  INFO_CADANGAN,
  INFO_LAMPIRAN,
  PANJANG_HEADER as HEADER_TS,
} from './envelope';

/**
 * UJI SILANG ANTARA DUA IMPLEMENTASI AMPLOP (23 September 2026).
 *
 * `src/common/crypto/envelope.ts` dipakai aplikasi; `scripts/lib/envelope.cjs`
 * dipakai skrip migrasi dan cadangan, yang berjalan di luar kompilasi
 * TypeScript. Dua salinan format yang dapat menyimpang adalah bahaya nyata, dan
 * di sini akibatnya adalah cadangan yang tak dapat dibuka -- kegagalan yang baru
 * ketahuan pada hari terburuk, saat seseorang sedang memulihkan data.
 *
 * Uji ini menutup kemungkinan itu: ia mengenkripsi dengan yang satu lalu
 * mendekripsi dengan yang lain, KEDUA ARAH. Selama ia hijau, kedua berkas itu
 * sepakat. Bila salah satunya diubah sendirian, inilah yang memerah.
 */

interface AmplopSkrip {
  enkripsi: (data: Buffer, kunci: Buffer, info: string) => Buffer;
  dekripsi: (blob: Buffer, kunci: Buffer, info: string) => Buffer;
  terenkripsi: (data: Buffer) => boolean;
  PANJANG_HEADER: number;
}

// `require`, bukan `import`: berkas yang diuji memang CommonJS, dan itulah
// pokok ujinya. Mengubahnya menjadi ESM demi menyenangkan aturan lint akan
// menghilangkan satu-satunya hal yang membuat uji ini dapat berjalan.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const skrip = require('../../../scripts/lib/envelope.cjs') as AmplopSkrip;

const KUNCI = randomBytes(32);
const DATA = randomBytes(5000);

describe('amplop TypeScript dan amplop skrip sepakat', () => {
  it('panjang headernya sama', () => {
    expect(skrip.PANJANG_HEADER).toBe(HEADER_TS);
  });

  it('yang dienkripsi aplikasi dapat dibuka skrip', () => {
    const blob = enkripsiTs(DATA, KUNCI, INFO_LAMPIRAN);
    expect(skrip.dekripsi(blob, KUNCI, INFO_LAMPIRAN).equals(DATA)).toBe(true);
  });

  it('yang dienkripsi skrip dapat dibuka aplikasi', () => {
    const blob = skrip.enkripsi(DATA, KUNCI, INFO_LAMPIRAN);
    expect(dekripsiTs(blob, KUNCI, INFO_LAMPIRAN).equals(DATA)).toBe(true);
  });

  it('pemisah domainnya juga sama, bukan kebetulan cocok pada satu nilai', () => {
    const blob = enkripsiTs(DATA, KUNCI, INFO_CADANGAN);
    expect(skrip.dekripsi(blob, KUNCI, INFO_CADANGAN).equals(DATA)).toBe(true);
    expect(() => skrip.dekripsi(blob, KUNCI, INFO_LAMPIRAN)).toThrow();
  });

  it('pengenalan blob terenkripsi sepakat di kedua arah', () => {
    expect(skrip.terenkripsi(enkripsiTs(DATA, KUNCI, INFO_LAMPIRAN))).toBe(true);
    expect(skrip.terenkripsi(Buffer.from('\x89PNG\r\n\x1a\n'))).toBe(false);
  });
});
