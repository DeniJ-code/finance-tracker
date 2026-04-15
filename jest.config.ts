import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^iron-session$': '<rootDir>/__mocks__/iron-session.ts',
    '^next/headers$': '<rootDir>/__mocks__/next/headers.ts',
  },
}

export default createJestConfig(config)
