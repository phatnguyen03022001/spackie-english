module.exports = {
  preset: 'ts-jest',
  displayName: 'e2e',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleNameMapper: require('./test/jest.module-name-mapper.cjs'),
  testMatch: ['**/*.e2e-spec.ts'],
  testTimeout: 30000,
};
