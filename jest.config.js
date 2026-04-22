/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['jest-webextension-mock'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/content.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  passWithNoTests: true
};
