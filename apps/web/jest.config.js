const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
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
