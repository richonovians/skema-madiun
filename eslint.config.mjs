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

  // 5) HARUS TERAKHIR: matikan seluruh aturan format ESLint yang berpotensi
  //    bentrok dengan Prettier. Formatting sepenuhnya ditangani Prettier.
  eslintConfigPrettier,
);
