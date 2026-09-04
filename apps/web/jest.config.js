const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // `e2e/` berisi spec Playwright, dan namanya (`*.spec.ts`) juga cocok dengan
  // testMatch baku Jest -- tanpa pengecualian ini Jest ikut menjalankannya dan
  // suite-nya gagal seketika (`test` milik Playwright, bukan Jest).
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/node_modules/', '<rootDir>/.next/'],
  testEnvironment: 'jest-environment-jsdom',
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
