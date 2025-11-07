/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
    roots: [
      "<rootDir>/src",
      "<rootDir>/spec"
    ],
    testMatch: [
      "**/?(*.)+(spec|test).+(ts|tsx|js)",
      "**/*_integrationtest.ts"
    ],
    transform: {
      "^.+\\.(ts|tsx)$": "ts-jest"
    }
  };