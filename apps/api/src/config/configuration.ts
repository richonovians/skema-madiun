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
});
