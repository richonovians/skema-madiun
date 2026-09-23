import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Skema & validasi variabel lingkungan.
 * Dipanggil oleh ConfigModule saat startup — aplikasi menolak boot bila env tidak valid
 * (fail-fast), sehingga masalah konfigurasi ketahuan lebih awal, bukan saat runtime.
 */
export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT: number = 3001;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  // Jumlah reverse proxy di depan API (2026-08-28). Menentukan `req.ip`, dan
  // lewat itu menentukan siapa yang dihitung oleh rate limiting. `0` mematikan
  // kepercayaan pada X-Forwarded-For sama sekali (API terekspos langsung).
  // Alasan lengkap & bahaya salah setel ada di configuration.ts.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY_HOPS: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_TTL_MS: number = 60_000;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 100;

  /**
   * Batas harian pengaduan per akun (14 September 2026). Dapat disetel karena
   * angkanya kebijakan, bukan tetapan teknis -- dan karena e2e yang menguji
   * ALUR pengaduan perlu menaikkannya agar tak terhenti oleh batas yang bukan
   * pokok ujinya.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  COMPLAINT_DAILY_LIMIT: number = 10;

  /**
   * Rahasia Turnstile. Opsional di sini supaya pengembangan tak menuntut akun
   * Cloudflare; yang mewajibkannya di produksi adalah TurnstileService, yang
   * menolak menyala tanpa ini.
   */
  @IsOptional()
  @IsString()
  TURNSTILE_SECRET_KEY: string = '';

  @IsOptional()
  @IsString()
  UPLOAD_DIR: string = 'uploads';

  // Masa berlaku URL lampiran bertanda tangan, dalam detik (T1, 7 September
  // 2026). Batas bawah 60 detik: lebih pendek dari itu membuat gambar gagal
  // dimuat ulang pada halaman yang wajar-wajar saja lamanya dibuka. Batas atas
  // 24 jam — di atas itu "berbatas waktu" kehilangan artinya.
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86_400)
  UPLOAD_SIGNED_URL_TTL_SECONDS: number = 3600;

  // Sesi lokal (JWT) — diterbitkan SKM sendiri setelah login (dev-login sekarang,
  // callback SSO nanti). Wajib diisi eksplisit (fail-fast), bukan default lemah bawaan.
  //
  // `@MinLength(32)` ditambahkan 7 September 2026 (temuan audit T7): `@IsNotEmpty()`
  // sendirian meloloskan rahasia satu karakter, dan aplikasi boot normal
  // dengannya. Rahasia ini menandatangani SELURUH token sesi — rahasia pendek
  // dapat ditebak paksa DI LUAR jaringan, tempat batas laju tak menolong sama
  // sekali, dan yang menemukannya bisa menerbitkan token untuk peran apa pun.
  // 32 karakter = 256 bit bila acak, sepadan dengan HS256 yang dipakai.
  @IsString()
  @IsNotEmpty()
  @MinLength(32, {
    message: 'SESSION_JWT_SECRET minimal 32 karakter (rahasia penanda tangan token sesi)',
  })
  SESSION_JWT_SECRET!: string;

  /**
   * KUNCI INDUK ENKRIPSI DATA (23 September 2026). Melindungi dua hal sekaligus:
   * lampiran pengaduan di disk, dan dua kolom teks bebas paling pribadi di basis
   * data (`complaints.uraian`, `complaint_replies.pesan`).
   *
   * KEHILANGAN KUNCI INI BERARTI KEHILANGAN DATANYA. Bukan "sulit dipulihkan",
   * melainkan hilang: tak ada pintu belakang di `envelope.ts`, dan memang tak
   * boleh ada. Prosedur pencadangan kunci WAJIB dijalankan SEBELUM enkripsi
   * dinyalakan -- lihat docs/keamanan/enkripsi-at-rest.md.
   *
   * 64 karakter heksadesimal = 32 byte, sepadan dengan AES-256 yang dipakai.
   * Buat dengan `openssl rand -hex 32`.
   *
   * OPSIONAL DI SINI, bukan wajib seperti SESSION_JWT_SECRET, dan itu disengaja:
   * `NODE_ENV=test` jatuh ke kunci uji tetap supaya seluruh uji yang ada tak
   * menuntut konfigurasi baru. Yang menolaknya di luar `test` adalah `kunci.ts`, yang
   * melempar saat kunci dipakai pertama kali. Validator di sini menjaga BENTUK
   * nilainya, bukan ada-tidaknya: kunci yang panjangnya salah jauh lebih
   * berbahaya daripada kunci yang tak ada, sebab yang pertama menyala.
   */
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{64}$/, {
    message: 'DATA_ENCRYPTION_KEY harus 64 karakter heksadesimal (openssl rand -hex 32)',
  })
  DATA_ENCRYPTION_KEY?: string;

  /**
   * KUNCI INDUK ENKRIPSI CADANGAN. Terpisah dari kunci data dengan sengaja,
   * karena KUSTODINYA berbeda: kunci cadangan harus dapat diserahkan kepada
   * pemegang salinan luar, sedangkan kunci data tak boleh meninggalkan server
   * aplikasi.
   *
   * Perlu diketahui betul: sebuah cadangan TIDAK CUKUP untuk memulihkan sistem.
   * Isinya memuat kolom dan lampiran yang terenkripsi DATA_ENCRYPTION_KEY, jadi
   * pemulihan di server baru menuntut KEDUA kunci. Cadangan tanpa kunci data
   * adalah hiasan.
   */
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{64}$/, {
    message: 'BACKUP_ENCRYPTION_KEY harus 64 karakter heksadesimal (openssl rand -hex 32)',
  })
  BACKUP_ENCRYPTION_KEY?: string;

  /**
   * PERNYATAAN bahwa disk yang memuat direktori data PostgreSQL terenkripsi
   * (LUKS di Linux, BitLocker di Windows).
   *
   * Wajib `"true"` di produksi; aplikasi menolak boot tanpanya. Di luar
   * produksi ia diabaikan. Penegakannya ada di `gerbang-penyimpanan.ts`, bukan
   * di sini, karena yang ditolak bergantung pada NODE_ENV dan pesannya perlu
   * panjang.
   *
   * INI PERNYATAAN, BUKAN VERIFIKASI. Aplikasi tak dapat memeriksa enkripsi
   * volume pada host, apalagi dari dalam container. Gunanya memaksa seseorang
   * menyatakannya secara sadar saat menggelar, sehingga kelalaian yang tak
   * bergejala berubah menjadi kegagalan boot yang berisik.
   */
  @IsOptional()
  @IsString()
  DB_STORAGE_ENCRYPTED?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  SESSION_TTL_HOURS: number = 24;

  // Domain cookie sesi (2026-08-27). Opsional karena dev tak membutuhkannya
  // (cookie mengabaikan port, host `localhost` sudah sama untuk :3000 & :3001).
  // Di produksi ia praktis wajib -- lihat catatan panjang di configuration.ts.
  @IsOptional()
  @IsString()
  SESSION_COOKIE_DOMAIN?: string;

  // Sumber master data OPD (Helpdesk) -- opsional: HelpdeskOpdClient baru gagal
  // saat POST /opd/sync dipanggil tanpa ini terisi, bukan menolak boot aplikasi
  // (beda dgn SESSION_JWT_SECRET yg dipakai tiap request).
  @IsOptional()
  @IsString()
  HELPDESK_OPD_API_URL?: string;

  @IsOptional()
  @IsString()
  HELPDESK_OPD_API_TOKEN?: string;

  // SSO OAuth2 Helpdesk (2026-08-27) -- SELURUHNYA opsional, alasan yang sama
  // dengan dua kunci di atas: tanpa ini aplikasi tetap boot normal dan
  // `dev-login` tetap jalan di non-produksi; yang gagal (dengan pesan jelas,
  // bukan diam-diam) hanya `GET /auth/sso/login` dan callback-nya.
  //
  // Kesengajaan yang perlu dicatat: kelengkapannya TIDAK divalidasi di sini
  // melainkan di `SsoService.assertConfigured()`, karena aturan sebenarnya
  // adalah "keempatnya ada, atau tak satu pun" -- bukan sesuatu yang bisa
  // dinyatakan per-field oleh class-validator.
  @IsOptional()
  @IsString()
  HELPDESK_SSO_ISSUER?: string;

  @IsOptional()
  @IsString()
  HELPDESK_SSO_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  HELPDESK_SSO_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  HELPDESK_SSO_REDIRECT_URI?: string;

  @IsOptional()
  @IsString()
  HELPDESK_SSO_SCOPES?: string;

  // Pemetaan klaim -> peran (2026-08-27). Bentuknya TIDAK divalidasi di sini:
  // entri cacat sengaja diabaikan diam-diam oleh parseRoleMap agar env salah
  // tulis membuat pemetaan tak berlaku (semua akun baru jadi `responden`,
  // keadaan paling tidak berbahaya) alih-alih mematikan seluruh API saat boot.
  @IsOptional()
  @IsString()
  HELPDESK_SSO_ROLE_MAP?: string;

  // Nama field klaim yang membawa OPD ASN, dipisah koma (8 September 2026).
  // Tidak divalidasi bentuknya, alasan yang sama seperti di atas: nama field
  // yang salah tulis hanya membuat pencocokan tak menemukan apa pun — dan
  // kegagalan itu TERLIHAT, karena SsoService mencatat nama-nama field yang
  // sebenarnya diterima. Mematikan API saat boot demi ini akan jauh lebih mahal.
  @IsOptional()
  @IsString()
  HELPDESK_SSO_OPD_CLAIM?: string;

  // Sakelar darurat penautan email (T5, 7 September 2026). String, bukan boolean:
  // hanya nilai persis "true" yang menyalakannya (lihat configuration.ts), jadi
  // salah tulis mana pun gagal ke arah AMAN alih-alih menyalakannya diam-diam.
  @IsOptional()
  @IsString()
  HELPDESK_SSO_ALLOW_UNVERIFIED_EMAIL_LINK?: string;

  @IsOptional()
  @IsString()
  WEB_APP_URL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error(`Validasi environment gagal:\n${messages}`);
  }

  return validated;
}
