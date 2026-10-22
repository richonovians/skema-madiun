import { HttpStatus } from '@nestjs/common';
import { BATAS_UKURAN_LAMPIRAN_LABEL } from '../../modules/complaints/complaints.constants';

/** Panjang maksimum nama medan yang dipantulkan kembali ke dalam pesan. */
const BATAS_NAMA_MEDAN = 64;

export interface PetaGalatMulter {
  statusCode: number;
  message: string;
  code: string;
}

/**
 * Pesan Indonesia untuk setiap kode penolakan multer 2.4.0.
 *
 * DIKUNCI PADA `code`, bukan pada kalimat galatnya. Itu bukan selera: docblock
 * multer sendiri memerintahkannya ("Check `err.code` rather than the message"),
 * dan @nestjs/platform-express melanggarnya -- `transformException` miliknya
 * mencocokkan `error.message` terhadap tabel kalimat yang disalin dari multer
 * 1.x. multer 2.x mengganti satu kalimat (`Unexpected field` menjadi
 * `Unexpected file field`) dan menambah empat kode baru, sehingga lima kode
 * luput dari `switch` itu dan lewat apa adanya sebagai Error biasa. Mengulangi
 * kopling yang sama di sini berarti mengundang cacat itu lahir kembali pada
 * pembaruan multer berikutnya.
 *
 * Tabel ini memuat SEMUA kode, termasuk delapan yang hari ini sudah dipetakan
 * Nest dan karena itu tak pernah sampai kemari. Justru itu gunanya: kalau
 * multer kelak mengganti kalimat lain, kode yang bersangkutan jatuh ke jalur
 * mentah ini dan tetap dijawab 4xx.
 */
const PESAN: Record<string, string> = {
  LIMIT_PART_COUNT: 'Bagian dalam permintaan unggahan terlalu banyak.',
  LIMIT_FILE_SIZE: `Ukuran berkas melebihi ${BATAS_UKURAN_LAMPIRAN_LABEL}. Perkecil berkasnya lalu coba lagi.`,
  LIMIT_FILE_COUNT: 'Jumlah berkas yang dikirim melebihi batas yang diizinkan.',
  LIMIT_FIELD_KEY: 'Nama medan terlalu panjang.',
  LIMIT_FIELD_VALUE: 'Nilai medan terlalu panjang.',
  LIMIT_FIELD_COUNT: 'Medan dalam permintaan terlalu banyak.',
  LIMIT_UNEXPECTED_FILE: 'Berkas dikirim pada medan yang tidak dikenali endpoint ini.',
  MISSING_FIELD_NAME: 'Ada berkas yang dikirim tanpa nama medan.',
  LIMIT_FIELD_NESTING: 'Nama medan bersarang terlalu dalam.',
  LIMIT_FIELD_ARRAY_INDEX: 'Indeks larik pada nama medan terlalu besar.',
  STREAM_DESTROYED: 'Pengunggahan berkas terputus sebelum tuntas.',
  INVALID_FIELD_NAME: 'Nama medan berkas tidak valid.',
};

/** Satu-satunya kode yang statusnya bukan 400; sisanya galat permintaan. */
const STATUS_KHUSUS: Record<string, number> = {
  LIMIT_FILE_SIZE: HttpStatus.PAYLOAD_TOO_LARGE,
};

interface GalatMulterLike {
  name: string;
  code: string;
  field?: string;
}

function galatMulter(exception: unknown): GalatMulterLike | null {
  if (!(exception instanceof Error) || exception.name !== 'MulterError') {
    return null;
  }
  const kode = (exception as Error & { code?: unknown }).code;
  if (typeof kode !== 'string' || !kode) {
    return null;
  }
  const medan = (exception as Error & { field?: unknown }).field;
  return {
    name: exception.name,
    code: kode,
    field: typeof medan === 'string' && medan ? medan : undefined,
  };
}

/**
 * Menerjemahkan penolakan multer MENTAH -- yang lolos dari pemetaan Nest --
 * menjadi respons 4xx berbahasa Indonesia. Mengembalikan `null` untuk apa pun
 * yang bukan MulterError, supaya 500 yang memang benar tetap 500.
 */
export function petakanGalatMulter(exception: unknown): PetaGalatMulter | null {
  const galat = galatMulter(exception);
  if (!galat) {
    return null;
  }

  const dasar = PESAN[galat.code] ?? 'Berkas unggahan tidak dapat diterima.';
  const medan = galat.field?.slice(0, BATAS_NAMA_MEDAN);
  const message = medan ? `${dasar} Medan yang dikirim: "${medan}".` : dasar;

  return {
    statusCode: STATUS_KHUSUS[galat.code] ?? HttpStatus.BAD_REQUEST,
    message,
    code: galat.code,
  };
}
