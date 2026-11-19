/**
 * PNG SUNGGUHAN berukuran tertentu, untuk skenario `kirim-pengaduan-lampiran`.
 *
 * MENGAPA BUKAN SEKADAR TANDA PNG DIIKUTI BITA ACAK. `assertAllowedContent`
 * hari ini hanya memeriksa angka ajaibnya, jadi berkas palsu akan lolos -- tetapi
 * pengukuran yang bergantung pada longgarnya pemeriksaan hari ini akan patah
 * diam-diam begitu pemeriksaan itu diperketat, dan gejalanya 400 yang terbaca
 * seperti cacat aplikasi. Berkas yang benar-benar PNG tak punya kerapuhan itu.
 *
 * PIKSEL ACAK, sehingga deflate tak dapat memampatkannya dan ukuran berkas
 * mengikuti ukuran mentah. Foto bukti warga juga nyaris tak termampatkan.
 */
import { randomBytes } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';

const TANDA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const LEBAR = 512;
/** RGB 8 bit, ditambah satu bita penyaring di awal setiap baris. */
const BITA_PER_BARIS = 1 + LEBAR * 3;

function potong(tipe: string, data: Buffer): Buffer {
  const panjang = Buffer.alloc(4);
  panjang.writeUInt32BE(data.length);
  const isi = Buffer.concat([Buffer.from(tipe, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(isi));
  return Buffer.concat([panjang, isi, crc]);
}

function susun(tinggi: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(LEBAR, 0);
  ihdr.writeUInt32BE(tinggi, 4);
  ihdr[8] = 8; // kedalaman bit
  ihdr[9] = 2; // RGB
  // kompresi, penyaring, interlace: semuanya 0
  const mentah = randomBytes(tinggi * BITA_PER_BARIS);
  for (let baris = 0; baris < tinggi; baris += 1) {
    mentah[baris * BITA_PER_BARIS] = 0; // penyaring "None"
  }
  return Buffer.concat([
    TANDA,
    potong('IHDR', ihdr),
    potong('IDAT', deflateSync(mentah)),
    potong('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * PNG yang ukurannya setidaknya `bitaSasaran` dan paling banyak satu baris
 * piksel (~1,5 KB) di atasnya. Tingginya ditebak dari ukuran mentah lalu
 * dinaikkan sampai cukup, karena ukuran keluaran deflate atas data acak sedikit
 * di atas masukannya dan tak dapat dihitung persis di muka.
 */
export function buatPng(bitaSasaran: number): Buffer {
  let tinggi = Math.max(1, Math.floor(bitaSasaran / BITA_PER_BARIS) - 2);
  let png = susun(tinggi);
  while (png.length < bitaSasaran) {
    tinggi += 1;
    png = susun(tinggi);
  }
  return png;
}
