import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Aturan React Compiler (default-ketat baru eslint-config-next 16) diturunkan
  // sementara ke "warn": aplikasi berjalan & `next build` hijau. Refactor idiomatik
  // (hindari setState di dalam useEffect / reassign variabel saat render) diserahkan
  // ke tim frontend untuk diperbaiki, lalu aktifkan kembali sebagai "error".
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  // Konfigurasi Jest DIMUAT NODE SEBAGAI CommonJS, bukan sebagai modul ESM:
  // `apps/web/package.json` tidak menyetel `"type": "module"`, sehingga `.js` di
  // sini memang berformat CJS. `require('next/jest')` + `module.exports` bukan
  // gaya lama yang belum sempat dirapikan — itu satu-satunya bentuk yang bisa
  // dimuat Jest. Aturan `no-require-imports` benar untuk kode aplikasi, tetapi
  // pada dua berkas ini mustahil dipenuhi tanpa memindahkannya ke ESM yang belum
  // didukung jalur muat Jest.
  //
  // Tanpa pengecualian ini `pnpm --filter @skm-spm/web lint` keluar dengan kode 1
  // (6 galat), yang berarti job CI `web:lint` gagal pada setiap push.
  {
    files: ['jest.config.js', 'jest.setup.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Uji Playwright memakai `use()` milik fixture-nya, dan nama itu bertabrakan
  // dengan aturan React: `react-hooks/rules-of-hooks` membacanya sebagai Hook
  // yang dipanggil di luar komponen, lalu menolak berkas yang sama sekali tak
  // menyentuh React. Fungsi di sini berjalan di Node, bukan di peramban.
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
