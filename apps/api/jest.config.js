/** @type {import('jest').Config} */
module.exports = {
  // Konfigurasi unit test (file *.spec.ts di dalam src/ dan scripts/).
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  // Skrip perkakas di `scripts/` ikut diuji. Tanpa baris ini `rootDir: 'src'`
  // membuat jest tak pernah melihat specnya, dan hasilnya terbaca sebagai
  // "no tests found" alih-alih merah.
  roots: ['<rootDir>', '<rootDir>/../scripts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.spec.json' }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
