const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // TENGGAT UJI DINAIKKAN DARI BAWAAN 5.000 ms (19 Oktober 2026).
  //
  // Suite ini GOYAH di bawah beban, dan itu terukur bukan diduga. Pada 202
  // berkas uji, tiga dari tiga jalan penuh hijau seluruhnya. Pada 211 berkas,
  // DUA DARI TIGA jalan memerah -- 1 lalu 4 kegagalan -- di empat berkas yang
  // isinya tak berubah sama sekali:
  //
  //   admin-kab/audit-logs/__tests__/page.test.jsx
  //   features/surveys/builder/.../BuilderNilaiSurvei.test.jsx
  //   features/notifications/.../NotificationHistoryScreen.test.jsx
  //   features/surveys/.../SurveyManagement.integration.test.jsx
  //
  // Semuanya satu kelas kegagalan: tenggat habis. Satu `Exceeded timeout of
  // 5000 ms for a test`, tiga `Unable to find an element with the text` dari
  // tenggat `findBy` bawaan 1.000 ms (dinaikkan di `jest.setup.js`).
  //
  // Sebabnya pertikaian, bukan cacat produk: jest memakai `inti - 1` pekerja,
  // dan di mesin berinti delapan itu tujuh peramban jsdom berebut satu CPU.
  // `ubuntu-latest` di CI biasanya berinti empat, jadi tekanan di sana sekitar
  // separuh -- kegoyahan ini mungkin tak pernah terlihat di CI, tetapi ia
  // terlihat oleh siapa pun yang menjalankan suite di mesinnya sendiri.
  //
  // HARGANYA DITULIS TERSURAT: uji yang benar-benar menggantung kini butuh 20
  // detik untuk memerah, bukan 5. Itu ditukar dengan sengaja -- gerbang yang
  // merah tanpa ada yang rusak adalah cara tercepat membuat orang berhenti
  // memercayai uji, alasan yang sudah ditulis sendiri di
  // `.github/workflows/ci.yml`.
  //
  // Yang TIDAK dipilih, dan alasannya: mengunci `maxWorkers` menghilangkan
  // pertikaiannya tetapi memperlambat setiap jalan, dan menambal keempat
  // berkas satu per satu membiarkan berkas rapuh BERIKUTNYA jatuh dengan cara
  // yang sama.
  testTimeout: 20000,
  // `e2e/` berisi spec Playwright, dan namanya (`*.spec.ts`) juga cocok dengan
  // testMatch baku Jest -- tanpa pengecualian ini Jest ikut menjalankannya dan
  // suite-nya gagal seketika (`test` milik Playwright, bukan Jest).
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/node_modules/', '<rootDir>/.next/'],
  testEnvironment: 'jest-environment-jsdom',
  // Spec Playwright di `e2e/` juga berakhiran `.spec.js`, sehingga tanpa
  // pengecualian ini Jest ikut memungutnya lalu gagal — `test`/`expect` di sana
  // berasal dari @playwright/test, bukan dari Jest, dan spec-nya menuntut
  // peramban sungguhan. Keduanya dijalankan terpisah: `pnpm test` (Jest) dan
  // `pnpm test:e2e` (Playwright).
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?(?:rettime|@mswjs|msw|outvariant|strict-event-emitter)/)',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();
  return {
    ...nextJestConfig,
    transformIgnorePatterns: [],
  };
};
