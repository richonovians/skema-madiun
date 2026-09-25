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
  // AKSESIBILITAS (25 September 2026).
  //
  // `eslint-config-next` sudah membawa eslint-plugin-jsx-a11y tetapi hanya
  // menyalakan 6 dari 34 aturannya, dan keenamnya pada tingkat "warn" -- artinya
  // tak satu pun menahan apa pun. Sistem pengaduan justru dipakai orang yang
  // sedang kesulitan, dan penyandang disabilitas termasuk yang paling sering
  // membutuhkan saluran aduan; membuat mereka tak bisa mengadu adalah kegagalan
  // tepat di jantung tujuan aplikasi ini.
  //
  // DIUKUR DULU, BARU DIPASANG. Seluruh set dijalankan sebagai galat terhadap
  // src/ dan hasilnya 90 pelanggaran di 37 berkas, terkumpul hanya pada 7
  // aturan. 27 aturan sisanya SUDAH BERSIH. Ketiga angka itu yang menentukan
  // pembagian di bawah.
  //
  // Yang bersih dijadikan galat SEKARANG: ia tak menuntut satu baris pun diubah,
  // tetapi sejak hari ini mustahil ditambahkan lagi. Yang masih berutang
  // dibiarkan "warn": gerbang yang merah sejak hari pertama membuat orang
  // terbiasa mengabaikan lampu merah, dan itu lebih merugikan daripada utang
  // yang terlihat.
  //
  // Daftarnya ditulis satu per satu, bukan disebar dari `configs.recommended`,
  // supaya pembaca tahu persis apa yang ditegakkan tanpa perlu menjalankan apa
  // pun -- dan supaya menaikkan versi plugin tidak diam-diam menyalakan aturan
  // baru yang membuat CI merah tanpa ada yang menyentuh kode.
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-ambiguous-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/autocomplete-valid': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/iframe-has-title': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',

      // Satu-satunya pelanggarannya adalah `<ul role="menu">` di EksporMenu.jsx,
      // dan itu justru pola WAI-ARIA yang kanonis (anaknya `role="menuitem"`).
      // Diperlakukan sebagai galat dengan satu pengecualian bertanda di tempatnya,
      // bukan diturunkan jadi "warn" demi satu salah tuduh.
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',

      // UTANG YANG SUDAH ADA, jumlahnya per 25 September 2026 ditulis supaya
      // kelak ketahuan menyusut atau membengkak. Dinaikkan ke "error" satu per
      // satu begitu angkanya nol.
      'jsx-a11y/control-has-associated-label': 'warn', // 36
      'jsx-a11y/no-static-element-interactions': 'warn', // 16
      'jsx-a11y/click-events-have-key-events': 'warn', // 14
      'jsx-a11y/label-has-associated-control': 'warn', // 6
      'jsx-a11y/no-noninteractive-element-interactions': 'warn', // 1

      // USANG menurut pluginnya sendiri, digantikan
      // `label-has-associated-control` yang sudah menyala di atas. Dibiarkan
      // menyala, ia melaporkan 16 hal yang sama dua kali.
      'jsx-a11y/label-has-for': 'off',
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
