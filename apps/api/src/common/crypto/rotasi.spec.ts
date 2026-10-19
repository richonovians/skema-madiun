import { randomBytes } from 'node:crypto';
import { dekripsi, enkripsi, INFO_LAMPIRAN } from './envelope';

/**
 * Logika rotasi kunci (23 September 2026).
 *
 * MENGAPA IA HARUS IDEMPOTEN DAN DAPAT DILANJUTKAN. Rotasi menyentuh setiap
 * lampiran dan setiap baris terenkripsi satu per satu. Bila prosesnya mati di
 * tengah, sebagian data memakai kunci baru dan sebagian masih kunci lama --
 * dan aplikasi hanya mengenal SATU kunci, jadi separuhnya menjadi tak terbaca.
 *
 * Jawabannya bukan transaksi raksasa, melainkan bentuk yang aman diulang:
 * untuk tiap benda, coba kunci BARU lebih dulu. Kalau terbuka, ia sudah
 * dirotasi dan dilewati. Kalau tidak, buka dengan kunci LAMA lalu tulis ulang
 * dengan kunci baru. Menjalankan skripnya kembali menuntaskan sisanya, dan
 * menjalankannya pada data yang sudah tuntas tak mengubah apa pun.
 */
interface Rotasi {
  putarBlob: (
    blob: Buffer,
    lama: Buffer,
    baru: Buffer,
    info: string,
  ) => { blob: Buffer; status: 'dirotasi' | 'sudah' | 'polos' };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rotasi = require('../../../scripts/lib/rotasi.cjs') as Rotasi;

const LAMA = randomBytes(32);
const BARU = randomBytes(32);
const DATA = Buffer.from('isi pengaduan warga yang harus tetap utuh', 'utf8');

describe('putarBlob', () => {
  it('blob berkunci LAMA dirotasi dan terbuka dengan kunci BARU', () => {
    const asal = enkripsi(DATA, LAMA, INFO_LAMPIRAN);

    const hasil = rotasi.putarBlob(asal, LAMA, BARU, INFO_LAMPIRAN);

    expect(hasil.status).toBe('dirotasi');
    expect(dekripsi(hasil.blob, BARU, INFO_LAMPIRAN).equals(DATA)).toBe(true);
  });

  it('sesudah dirotasi, kunci LAMA tak lagi dapat membukanya', () => {
    const hasil = rotasi.putarBlob(enkripsi(DATA, LAMA, INFO_LAMPIRAN), LAMA, BARU, INFO_LAMPIRAN);

    expect(() => dekripsi(hasil.blob, LAMA, INFO_LAMPIRAN)).toThrow();
  });

  it('blob yang SUDAH berkunci baru dilewati tanpa diubah (idempoten)', () => {
    const sudah = enkripsi(DATA, BARU, INFO_LAMPIRAN);

    const hasil = rotasi.putarBlob(sudah, LAMA, BARU, INFO_LAMPIRAN);

    expect(hasil.status).toBe('sudah');
    expect(hasil.blob.equals(sudah)).toBe(true);
  });

  it('data POLOS dienkripsi dengan kunci baru, bukan dilewati', () => {
    const polos = Buffer.from('berkas lama yang belum pernah dienkripsi');

    const hasil = rotasi.putarBlob(polos, LAMA, BARU, INFO_LAMPIRAN);

    expect(hasil.status).toBe('polos');
    expect(dekripsi(hasil.blob, BARU, INFO_LAMPIRAN).equals(polos)).toBe(true);
  });

  it('blob yang bukan milik kunci mana pun MELEMPAR, bukan dilewati diam-diam', () => {
    const asing = enkripsi(DATA, randomBytes(32), INFO_LAMPIRAN);

    expect(() => rotasi.putarBlob(asing, LAMA, BARU, INFO_LAMPIRAN)).toThrow();
  });

  it('menjalankan rotasi dua kali berturut-turut tetap menghasilkan isi yang sama', () => {
    const sekali = rotasi.putarBlob(enkripsi(DATA, LAMA, INFO_LAMPIRAN), LAMA, BARU, INFO_LAMPIRAN);
    const duaKali = rotasi.putarBlob(sekali.blob, LAMA, BARU, INFO_LAMPIRAN);

    expect(duaKali.status).toBe('sudah');
    expect(dekripsi(duaKali.blob, BARU, INFO_LAMPIRAN).equals(DATA)).toBe(true);
  });
});
