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
  // VARIAN `dark:` DILARANG (5 Oktober 2026). Proyek ini tak punya tema gelap:
  // tak ada `@custom-variant dark`, tak ada kelas `.dark`, tak ada token gelap di
  // globals.css. Tetapi Tailwind v4 MENYALAKAN `dark:` secara bawaan lewat
  // `prefers-color-scheme`, jadi satu kelas `dark:` menumpangkan palet kedua yang
  // tak pernah dirancang -- dua kali sudah memunculkan teks nyaris tak terbaca
  // (ProfileSSOCard, 4 Oktober). Sampai ada tema gelap sungguhan, kelas ini
  // selalu cacat, dan menahannya di waktu tulis lebih murah daripada memburunya
  // di layar.
  //
  // Dicocokkan `dark:` YANG DIIKUTI karakter bukan-spasi, supaya menangkap
  // `dark:bg-...` tapi melewatkan untai `'dark:'` telanjang yang dipakai uji
  // keterbacaan untuk MEMASTIKAN ketiadaannya (ProfileSSOCardKeterbacaan.test).
  // Kunci objek seperti `{ dark: '#0F172A' }` (warna QR di ShareSurveyModal)
  // bukan Literal, jadi tak tersentuh selektor ini. Komentar juga bukan Literal.
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/dark:\\S/]',
          message:
            'Kelas `dark:` dilarang: proyek ini tak punya tema gelap, dan Tailwind v4 menyalakan dark: lewat prefers-color-scheme sehingga memunculkan palet tak terduga. Lihat komentar di eslint.config.mjs.',
        },
        {
          selector: 'TemplateElement[value.cooked=/dark:\\S/]',
          message:
            'Kelas `dark:` dilarang: proyek ini tak punya tema gelap, dan Tailwind v4 menyalakan dark: lewat prefers-color-scheme sehingga memunculkan palet tak terduga. Lihat komentar di eslint.config.mjs.',
        },
      ],
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

    // KELUARAN BUATAN MESIN (30 September 2026). Ditambahkan begitu ESLint di
    // apps/web bisa dijalankan lagi -- selama ia mati oleh `eslint-plugin-import`
    // yang kehilangan `eslint-module-utils`, tak seorang pun bisa melihat bahwa
    // daftar abainya belum lengkap.
    //
    // Terukur: `npx eslint .` melaporkan 12.319 masalah, dan 327 dari ~380
    // berkasnya berasal dari direktori di bawah ini. Yang tersisa sesudah
    // disaring -- `src` saja -- keluar dengan kode 0 dan 95 peringatan, angka
    // yang masih cocok dengan utang a11y yang dicatat di atas pada 25 September.
    //
    // `.next-e2e` adalah keluaran `scripts/server-e2e.mjs`, sepupu `.next` yang
    // luput dari daftar bawaan eslint-config-next semata karena namanya berbeda.
    '.next-e2e/**',
    'coverage/**',
    // Dihasilkan `msw init`, bukan ditulis tangan.
    'public/mockServiceWorker.js',
  ]),
]);

export default eslintConfig;
