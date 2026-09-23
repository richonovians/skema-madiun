import { ConfigService } from '@nestjs/config';

/**
 * Pembacaan kunci induk enkripsi at-rest (23 September 2026).
 *
 * PEMBAGIAN TUGAS DENGAN env.validation.ts, ditulis tersurat karena mudah
 * disalahpahami: validator env menjaga BENTUK nilainya (64 heksadesimal atau
 * tolak boot), berkas ini menjaga ADA-TIDAKNYA. Pembagian itu disengaja. Kalau
 * ketiadaan kunci ikut menolak boot, setiap uji dan setiap perkakas baris
 * perintah harus menyetelnya walau tak pernah menyentuh data terenkripsi; kalau
 * BENTUK yang salah dibiarkan sampai runtime, aplikasi menyala dengan kunci
 * cacat dan baru gagal saat warga mengunggah lampiran.
 */

/**
 * Kunci uji tetap, HANYA berlaku saat `NODE_ENV=test`.
 *
 * Sengaja tertulis di kode dan BUKAN di berkas env mana pun. Menaruhnya di
 * `.env.example` adalah undangan untuk menyalinnya ke `.env` sungguhan, dan
 * kunci yang tercetak di repositori publik bukan kunci. Di sini ia tak dapat
 * disalin tanpa sadar: yang memakainya hanya jalur `test`.
 */
export const KUNCI_UJI = 'a'.repeat(64);

const BENTUK = /^[0-9a-fA-F]{64}$/;

export function bacaKunci(nilai: string, nama: string, nodeEnv: string): Buffer {
  const hex = nilai || (nodeEnv === 'test' ? KUNCI_UJI : '');
  if (!BENTUK.test(hex)) {
    throw new Error(
      `${nama} belum disetel atau bukan 64 karakter heksadesimal. ` +
        'Buat dengan `openssl rand -hex 32`. ' +
        'BACA docs/keamanan/enkripsi-at-rest.md sebelum menyalakannya: ' +
        'kunci yang hilang berarti data yang hilang, dan tak ada pintu belakang.',
    );
  }
  return Buffer.from(hex, 'hex');
}

export function kunciData(config: ConfigService): Buffer {
  return bacaKunci(
    config.get<string>('crypto.dataKey') ?? '',
    'DATA_ENCRYPTION_KEY',
    process.env.NODE_ENV ?? 'development',
  );
}

export function kunciCadangan(config: ConfigService): Buffer {
  return bacaKunci(
    config.get<string>('crypto.backupKey') ?? '',
    'BACKUP_ENCRYPTION_KEY',
    process.env.NODE_ENV ?? 'development',
  );
}
