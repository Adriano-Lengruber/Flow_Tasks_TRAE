/**
 * Jest Configuration
 * Root configuration for the monorepo
 */

module.exports = {
  // Use projects for monorepo setup
  projects: [
    '<rootDir>/backend/jest.config.js'
  ],
  
  // Global settings
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/test-utils/**',
    '!**/mocks/**'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test environment
  testEnvironment: 'node',
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  
  // Setup files (commented out - file doesn't exist)
  // setupFilesAfterEnv: [
  //   '<rootDir>/jest.setup.js'
  // ],
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/e2e/'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],
  
  // Verbose output
  verbose: true,
  
  // Bail on first test failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify mode
  notify: false,
  
  // Watch plugins (commented out due to missing dependencies)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname'
  // ],
  
  // Global timeout
  testTimeout: 10000,
  
  // Max workers
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Reporters
  reporters: [
    'default'
    // ['jest-junit', {
    //   outputDirectory: '<rootDir>/reports',
    //   outputName: 'junit.xml',
    //   classNameTemplate: '{classname}',
    //   titleTemplate: '{title}',
    //   ancestorSeparator: ' › ',
    //   usePathForSuiteName: true
    // }]
  ],
  
  // Global setup and teardown (commented out - files don't exist)
  // globalSetup: '<rootDir>/jest.global-setup.js',
  // globalTeardown: '<rootDir>/jest.global-teardown.js'
};