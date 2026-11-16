import type { INestApplication } from '@nestjs/common';

/**
 * Menyalakan aplikasi dengan variabel lingkungan tertentu, MEMUAT ULANG
 * `AppModule` dari nol (16 November 2026, BUG-066).
 *
 * Perlu karena sebagian keputusan diambil saat `AppModule` DIDEKORASI, bukan
 * saat permintaan datang: rute `dev-login` hanya didaftarkan bila saklarnya
 * hidup (`devLoginAktif`). Dekorator itu berjalan sekali per registri modul
 * Jest, jadi berkas yang meng-`import` `AppModule` di kepalanya terkunci pada
 * lingkungan saat pertama dimuat -- di pelari e2e itu `DEV_LOGIN_ENABLED=true`.
 * Menyetel `process.env` sesudahnya tak mengubah apa pun, dan uji saklar yang
 * terlihat hijau hanya membuktikan lapis penjaga keduanya.
 *
 * `@nestjs/testing` dan `app.setup` ikut dimuat di registri terpisah yang
 * sama, supaya `Test` dan `AppModule` berbagi satu salinan `@nestjs/core`.
 *
 * Nilai lama tidak dipulihkan di sini; pemanggil memulihkannya di `afterEach`.
 */
export async function nyalakanDenganEnv(env: Record<string, string>): Promise<INestApplication> {
  Object.assign(process.env, env);

  let muat!: () => Promise<INestApplication>;
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { Test } = require('@nestjs/testing') as typeof import('@nestjs/testing');
    const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
    const { configureApp } = require('../../src/app.setup') as typeof import('../../src/app.setup');
    /* eslint-enable @typescript-eslint/no-require-imports */

    muat = async () => {
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      const app = moduleRef.createNestApplication();
      configureApp(app);
      await app.init();
      return app;
    };
  });
  return muat();
}
