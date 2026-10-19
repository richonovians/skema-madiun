import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { INFO_CADANGAN } from './envelope';

/**
 * Amplop BERALIRAN, dipakai berkas cadangan.
 *
 * Diuji lewat berkas sungguhan di direktori sementara, bukan tiruan sistem
 * berkas: yang sedang dijamin di sini adalah janji "berkas tujuan TIDAK PERNAH
 * ADA kecuali tagnya terverifikasi", dan janji itu tentang berkas, bukan
 * tentang pemanggilan fungsi.
 */
interface AliranKripto {
  PANJANG_HEADER: number;
  enkripsiAliran: (
    sumber: Readable,
    tujuan: string,
    kunci: Buffer,
    info: string,
  ) => Promise<number>;
  dekripsiAliran: (sumber: string, tujuan: string, kunci: Buffer, info: string) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const aliran = require('../../../scripts/lib/aliran-kripto.cjs') as AliranKripto;

const KUNCI = randomBytes(32);
// 3MB: cukup besar untuk melewati beberapa potongan aliran, sehingga jalur
// `update()` berulang benar-benar terlewati dan bukan hanya `final()`.
const DATA = randomBytes(3 * 1024 * 1024);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'skm-aliran-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

async function enkripsiKe(nama: string): Promise<string> {
  const tujuan = path.join(dir, nama);
  await aliran.enkripsiAliran(Readable.from([DATA]), tujuan, KUNCI, INFO_CADANGAN);
  return tujuan;
}

describe('aliran-kripto', () => {
  it('pulang-pergi pada data yang lebih besar dari satu potongan aliran', async () => {
    const terenkripsi = await enkripsiKe('a.enc');
    const kembali = path.join(dir, 'a.out');

    await aliran.dekripsiAliran(terenkripsi, kembali, KUNCI, INFO_CADANGAN);

    expect(readFileSync(kembali).equals(DATA)).toBe(true);
  });

  it('berkas terenkripsi bukan plaintext dan berukuran header lebih besar', async () => {
    const terenkripsi = await enkripsiKe('b.enc');

    expect(statSync(terenkripsi).size).toBe(DATA.length + aliran.PANJANG_HEADER);
    expect(readFileSync(terenkripsi).subarray(0, 4).toString('ascii')).toBe('SKM1');
  });

  it('satu bita ciphertext yang dibalik: melempar DAN tujuan tak pernah dibuat', async () => {
    const terenkripsi = await enkripsiKe('c.enc');
    const isi = readFileSync(terenkripsi);
    isi[isi.length - 1] ^= 0x01;
    writeFileSync(terenkripsi, isi);
    const kembali = path.join(dir, 'c.out');

    await expect(
      aliran.dekripsiAliran(terenkripsi, kembali, KUNCI, INFO_CADANGAN),
    ).rejects.toThrow();

    // INI asersi yang sesungguhnya. Melempar saja tak cukup: kalau berkas
    // tujuan tetap tertinggal, operator akan memulihkan data yang tak terbukti.
    expect(existsSync(kembali)).toBe(false);
    expect(existsSync(`${kembali}.belum-terverifikasi`)).toBe(false);
  });

  it('kunci yang salah melempar dan tak meninggalkan berkas tujuan', async () => {
    const terenkripsi = await enkripsiKe('d.enc');
    const kembali = path.join(dir, 'd.out');

    await expect(
      aliran.dekripsiAliran(terenkripsi, kembali, randomBytes(32), INFO_CADANGAN),
    ).rejects.toThrow();

    expect(existsSync(kembali)).toBe(false);
    expect(existsSync(`${kembali}.belum-terverifikasi`)).toBe(false);
  });

  it('pemisah domain yang salah melempar', async () => {
    const terenkripsi = await enkripsiKe('e.enc');

    await expect(
      aliran.dekripsiAliran(terenkripsi, path.join(dir, 'e.out'), KUNCI, 'skm-lampiran-v1'),
    ).rejects.toThrow();
  });

  it('berkas yang terpotong sebelum header utuh ditolak dengan pesan yang jelas', async () => {
    const pendek = path.join(dir, 'f.enc');
    writeFileSync(pendek, Buffer.from('SKM1\x01'));

    await expect(
      aliran.dekripsiAliran(pendek, path.join(dir, 'f.out'), KUNCI, INFO_CADANGAN),
    ).rejects.toThrow(/terlalu pendek/);
  });

  it('berkas yang bukan amplop ditolak sebelum kripto apa pun berjalan', async () => {
    const bukan = path.join(dir, 'g.enc');
    writeFileSync(bukan, Buffer.alloc(100, 7));

    await expect(
      aliran.dekripsiAliran(bukan, path.join(dir, 'g.out'), KUNCI, INFO_CADANGAN),
    ).rejects.toThrow(/bukan format amplop/);
  });
});
