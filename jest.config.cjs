module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
      },
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      setupFiles: ['<rootDir>/test/e2e/database-safety.setup.cjs'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
      },
    },
  ],
};