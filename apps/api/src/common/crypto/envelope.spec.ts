import { randomBytes } from 'node:crypto';
import { dekripsi, enkripsi, INFO_KOLOM, INFO_LAMPIRAN, terenkripsi } from './envelope';

const KUNCI = randomBytes(32);

describe('envelope', () => {
  it('pulang-pergi mengembalikan byte yang persis sama', () => {
    const asli = Buffer.from('rahasia warga: pungli di loket 3', 'utf8');
    const blob = enkripsi(asli, KUNCI, INFO_LAMPIRAN);
    expect(blob.equals(asli)).toBe(false);
    expect(dekripsi(blob, KUNCI, INFO_LAMPIRAN).equals(asli)).toBe(true);
  });

  it('bekerja pada data biner, bukan hanya teks', () => {
    const asli = randomBytes(64 * 1024);
    expect(dekripsi(enkripsi(asli, KUNCI, INFO_LAMPIRAN), KUNCI, INFO_LAMPIRAN).equals(asli)).toBe(
      true,
    );
  });

  it('satu byte ciphertext yang dibalik membuat dekripsi melempar', () => {
    const blob = enkripsi(Buffer.from('halo dunia yang cukup panjang'), KUNCI, INFO_LAMPIRAN);
    blob[blob.length - 1] ^= 0x01;
    expect(() => dekripsi(blob, KUNCI, INFO_LAMPIRAN)).toThrow();
  });

  it('kunci yang salah membuat dekripsi melempar, bukan menghasilkan sampah', () => {
    const blob = enkripsi(Buffer.from('halo'), KUNCI, INFO_LAMPIRAN);
    expect(() => dekripsi(blob, randomBytes(32), INFO_LAMPIRAN)).toThrow();
  });

  it('pemisah domain yang berbeda membuat dekripsi melempar', () => {
    const blob = enkripsi(Buffer.from('halo'), KUNCI, INFO_LAMPIRAN);
    expect(() => dekripsi(blob, KUNCI, INFO_KOLOM)).toThrow();
  });

  it('dua enkripsi atas data yang sama menghasilkan blob berbeda (garam & iv acak)', () => {
    const data = Buffer.from('sama persis');
    expect(enkripsi(data, KUNCI, INFO_LAMPIRAN).equals(enkripsi(data, KUNCI, INFO_LAMPIRAN))).toBe(
      false,
    );
  });

  it('terenkripsi() mengenali blob sendiri dan menolak data polos', () => {
    expect(terenkripsi(enkripsi(Buffer.from('x'), KUNCI, INFO_LAMPIRAN))).toBe(true);
    expect(terenkripsi(Buffer.from('\x89PNG\r\n\x1a\n'))).toBe(false);
    expect(terenkripsi(Buffer.alloc(0))).toBe(false);
  });

  it('data polos yang kebetulan berawalan SKM1 tetap ditolak bila terlalu pendek', () => {
    expect(terenkripsi(Buffer.from('SKM1\x01'))).toBe(false);
  });
});
