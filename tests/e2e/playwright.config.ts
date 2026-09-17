import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import { MINUTE_1, MINUTE_3, SECOND_20, SECOND_30 } from './tests/const'

dotenv.config({ quiet: true })

export default defineConfig({
  testDir: 'tests',
  timeout: MINUTE_3, // 3 minutes per test
  expect: {
    timeout: SECOND_30 // 30 seconds for expect conditions
  },
  use: {
    baseURL: process.env.D2E_BASE_URL ?? 'https://localhost:443',
    actionTimeout: SECOND_20, // 20 seconds for each action
    navigationTimeout: MINUTE_1, // 1 minute for navigation
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure', // Take screenshot of page if test fails
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  retries: process.env.CI ? 0 : 0, // retry failed tests once
  reporter: [
    ['list'], // You can combine multiple reporters
    ['playwright-ctrf-json-reporter', {}]
  ],
  workers: 1,
  // TEMPORARY - revert to `process.env.CI ? 1 : 0` before this merges.
  //
  // With a cap of 1 the first failure ends the run, so a branch that broke
  // several tests surfaces them one per CI cycle, at roughly forty minutes
  // each. This branch is rewriting the suite for the Data Exploration
  // redesign and has spent six cycles finding six separate causes. Lifting
  // the cap for a few runs lists them all at once.
  maxFailures: 0 // 0 = no cap; run all tests even if some fail
})
