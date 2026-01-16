import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import { MINUTE_1, MINUTE_3, SECOND_20 } from './tests/const'

dotenv.config({ quiet: true })

export default defineConfig({
  testDir: 'tests',
  timeout: MINUTE_3, // 3 minutes per test
  expect: {
    timeout: SECOND_20 // 20 seconds for expect conditions
  },
  use: {
    baseURL: process.env.D2E_BASE_URL ?? 'https://localhost:443',
    actionTimeout: SECOND_20, // 30 seconds for each action
    navigationTimeout: MINUTE_1, // 1 minute for navigation
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure' // Take screenshot of page if test fails
  },
  retries: process.env.CI ? 3 : 0, // retry failed tests once
  reporter: [
    ['list'], // You can combine multiple reporters
    ['playwright-ctrf-json-reporter', {}]
  ],
  workers: 1,
  maxFailures: process.env.CI ? 1 : 0
})
