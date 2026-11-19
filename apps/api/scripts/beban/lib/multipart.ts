/**
 * TUBUH MULTIPART untuk skenario tulis pengaduan.
 *
 * MENGAPA MULTIPART, bukan JSON, padahal `POST /complaints` juga menerima JSON.
 * Formulir warga selalu mengirim `FormData`, berlampiran atau tidak, sehingga
 * jalur yang dilewati di produksi adalah multer (`FilesInterceptor`) lalu
 * `ValidationPipe` atas medan bertipe string. JSON melewatkan multer seluruhnya
 * dan mengukur jalur yang tak pernah dipakai siapa pun.
 *
 * Disusun SEKALI sebagai `Buffer` lalu dipakai ulang autocannon untuk setiap
 * permintaan: nomor tiket dibangkitkan server, jadi tubuh yang sama tak
 * menabrak apa pun.
 */
import { randomBytes } from 'node:crypto';

export interface BerkasMultipart {
  /** Nama medan formulir, mis. `lampiran`. */
  medan: string;
  namaBerkas: string;
  tipe: string;
  isi: Buffer;
}

export function susunMultipart(
  medan: Record<string, string>,
  berkas: readonly BerkasMultipart[] = [],
  batas = `----beban${randomBytes(12).toString('hex')}`,
): { isi: Buffer; contentType: string } {
  const pembatas = `--${batas}`;
  const bagian: Buffer[] = [];

  for (const [nama, nilai] of Object.entries(medan)) {
    // Isi yang memuat pembatasnya sendiri membuat pengurai memotong tubuhnya
    // di tengah tanpa galat apa pun; yang terkirim lalu medan yang terpenggal.
    if (nilai.includes(pembatas)) {
      throw new Error(`Medan '${nama}' memuat batas multipart-nya sendiri.`);
    }
    bagian.push(
      Buffer.from(
        `${pembatas}\r\nContent-Disposition: form-data; name="${nama}"\r\n\r\n${nilai}\r\n`,
      ),
    );
  }

  for (const b of berkas) {
    if (b.isi.includes(pembatas)) {
      throw new Error(`Berkas '${b.namaBerkas}' memuat batas multipart-nya sendiri.`);
    }
    bagian.push(
      Buffer.from(
        `${pembatas}\r\nContent-Disposition: form-data; name="${b.medan}"; ` +
          `filename="${b.namaBerkas}"\r\nContent-Type: ${b.tipe}\r\n\r\n`,
      ),
      b.isi,
      Buffer.from('\r\n'),
    );
  }

  bagian.push(Buffer.from(`${pembatas}--\r\n`));
  return { isi: Buffer.concat(bagian), contentType: `multipart/form-data; boundary=${batas}` };
}
