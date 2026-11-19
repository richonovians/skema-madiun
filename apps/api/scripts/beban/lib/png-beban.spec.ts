import { crc32, inflateSync } from 'node:zlib';
import { buatPng } from './png-beban';

const TANDA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Memecah PNG menjadi potongan-potongannya, sambil memeriksa CRC tiap potongan. */
function potongan(png: Buffer): { tipe: string; data: Buffer }[] {
  const hasil: { tipe: string; data: Buffer }[] = [];
  let i = 8;
  while (i < png.length) {
    const panjang = png.readUInt32BE(i);
    const tipe = png.subarray(i + 4, i + 8);
    const data = png.subarray(i + 8, i + 8 + panjang);
    const crc = png.readUInt32BE(i + 8 + panjang);
    expect(crc32(Buffer.concat([tipe, data]))).toBe(crc);
    hasil.push({ tipe: tipe.toString('ascii'), data });
    i += 12 + panjang;
  }
  return hasil;
}

describe('buatPng', () => {
  const SATU_MB = 1024 * 1024;

  it('berkas PNG sah: tanda, IHDR pertama, IEND terakhir, CRC benar', () => {
    const png = buatPng(SATU_MB);
    expect(png.subarray(0, 8).equals(TANDA_PNG)).toBe(true);
    const p = potongan(png);
    expect(p[0].tipe).toBe('IHDR');
    expect(p[p.length - 1].tipe).toBe('IEND');
  });

  it('ukurannya setidaknya sasaran dan tak lebih dari 2% di atasnya', () => {
    const png = buatPng(SATU_MB);
    expect(png.length).toBeGreaterThanOrEqual(SATU_MB);
    expect(png.length).toBeLessThanOrEqual(SATU_MB * 1.02);
  });

  it('data gambarnya dapat di-inflate menjadi tepat lebar x tinggi baris piksel', () => {
    const png = buatPng(SATU_MB);
    const p = potongan(png);
    const lebar = p[0].data.readUInt32BE(0);
    const tinggi = p[0].data.readUInt32BE(4);
    const idat = Buffer.concat(p.filter((x) => x.tipe === 'IDAT').map((x) => x.data));
    // RGB 8 bit + satu bita penyaring per baris.
    expect(inflateSync(idat).length).toBe(tinggi * (1 + lebar * 3));
  });
});
