/**
 * Konfigurasi terpusat & bertipe, dipetakan dari variabel lingkungan.
 * Dimuat oleh ConfigModule (`load: [configuration]`) sehingga dapat diakses lewat
 * `ConfigService.get('app.port')`, dsb. Nilai env sudah divalidasi oleh validateEnv.
 */
export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.API_PORT ?? '3001', 10),
    apiPrefix: 'api/v1',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  swagger: {
    enabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
    path: 'api/docs',
  },
  cors: {
    // Comma-separated di production (mis. dashboard OPD + kabupaten beda subdomain).
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});
