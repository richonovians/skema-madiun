import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
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

  @IsOptional()
  @IsString()
  UPLOAD_DIR: string = 'uploads';

  // Sesi lokal (JWT) — diterbitkan SKM sendiri setelah login (dev-login sekarang,
  // callback SSO nanti). Wajib diisi eksplisit (fail-fast), bukan default lemah bawaan.
  @IsString()
  @IsNotEmpty()
  SESSION_JWT_SECRET!: string;

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
