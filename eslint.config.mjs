// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * Konfigurasi ESLint dasar (flat config) untuk seluruh monorepo.
 *
 * Aturan spesifik framework (Next.js/React, NestJS) serta mode type-checked
 * ditambahkan per-app pada file `eslint.config.mjs` masing-masing app setelah
 * di-scaffold, dengan meng-extend basis ini.
 */
export default tseslint.config(
  // 1) Path yang tidak perlu di-lint (berlaku global).
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/prisma/generated/**',
      // Frontend Next.js punya eslint.config sendiri (eslint-config-next).
      'apps/web/**',
    ],
  },

  // 2) Rekomendasi dasar JavaScript.
  js.configs.recommended,

  // 3) Rekomendasi TypeScript (non type-checked; cepat, tanpa butuh tsconfig).
  ...tseslint.configs.recommended,

  // 4) Environment global default untuk berkas tooling di root (Node.js).
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },

  // 5) Berkas test: kenali global Jest (describe/it/expect/beforeAll, dll).
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  // 6) Berkas CommonJS (.cjs): `require` adalah SATU-SATUNYA cara memuat modul
  //    di sana, jadi `no-require-imports` bukan aturan gaya melainkan larangan
  //    menulis berkas itu sama sekali.
  //
  //    Dipakai skrip perkakas di apps/api/scripts. CommonJS-nya disengaja dan
  //    ada alasannya, ditulis di kepala scripts/lib/envelope.cjs: dengan begitu
  //    Jest dapat me-`require` berkas itu langsung, sehingga uji silang yang
  //    menjaga format amplop tetap sama antara aplikasi dan perkakas pemulihan
  //    benar-benar dapat berjalan.
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // 7) HARUS TERAKHIR: matikan seluruh aturan format ESLint yang berpotensi
  //    bentrok dengan Prettier. Formatting sepenuhnya ditangani Prettier.
  eslintConfigPrettier,
);
