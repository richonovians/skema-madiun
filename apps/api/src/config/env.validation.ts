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
