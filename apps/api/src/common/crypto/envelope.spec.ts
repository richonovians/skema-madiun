import { randomBytes } from 'node:crypto';
import {
  dekripsi,
  enkripsi,
  INFO_KOLOM,
  INFO_LAMPIRAN,
  terenkripsi,
  versiAmplop,
} from './envelope';

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

  /**
   * DETEKSI AMPLOP TERPISAH DARI VERSINYA (26 Oktober 2026).
   *
   * Sebelumnya `terenkripsi()` menuntut byte versi tepat 0x01, jadi amplop
   * berversi lain dijawab "bukan amplop" -- dan keempat pemanggilnya salah
   * dengan cara masing-masing: penyaji lampiran mengirim ciphertext mentah,
   * migrasi lampiran dan rotasi MELAPIS blob yang sudah terenkripsi, cadangan
   * melaporkannya polos. Belum pernah terjadi karena baru ada v1; inilah
   * prasyarat sebelum format kedua mana pun ditambahkan
   * (docs/keamanan/usulan-enkripsi-asimetris.md, langkah 1).
   */
  describe('amplop berversi yang belum dikenal', () => {
    /** Blob v1 sungguhan dengan byte versinya diganti -- selain itu utuh. */
    const blobVersi = (versi: number) => {
      const blob = enkripsi(Buffer.from('isi pengaduan'), KUNCI, INFO_LAMPIRAN);
      blob[4] = versi;
      return blob;
    };

    it('tetap dikenali sebagai amplop, bukan data polos', () => {
      expect(terenkripsi(blobVersi(0x02))).toBe(true);
    });

    it('versiAmplop menjawab versinya, dan null untuk yang bukan amplop', () => {
      expect(versiAmplop(enkripsi(Buffer.from('x'), KUNCI, INFO_LAMPIRAN))).toBe(1);
      expect(versiAmplop(blobVersi(0x02))).toBe(2);
      expect(versiAmplop(Buffer.from('\x89PNG\r\n\x1a\n'))).toBeNull();
      expect(versiAmplop(Buffer.from('SKM1\x01'))).toBeNull();
    });

    it('dekripsi melempar dengan menyebut versinya, bukan "bukan amplop"', () => {
      expect(() => dekripsi(blobVersi(0x02), KUNCI, INFO_LAMPIRAN)).toThrow(/versi 2/);
    });

    it('data polos tetap ditolak dekripsi sebagai bukan amplop', () => {
      expect(() => dekripsi(Buffer.from('teks polos biasa'), KUNCI, INFO_LAMPIRAN)).toThrow(
        /bukan amplop SKM1/,
      );
    });
  });
});
