import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

export default defineConfig({
  testDir: 'tests',
  timeout: 180000, // 3 minutes per test
  expect: {
    timeout: 120000, // 20 seconds for expect conditions
    toHaveScreenshot: {
      // maxDiffPixelRatio: 0.001 // Allow 0.1% pixel difference
      maxDiffPixels: 100
    }
  },
  use: {
    baseURL: process.env.D2E_BASE_URL ?? 'https://localhost:443',
    actionTimeout: 30000, // 30 seconds for each action
    navigationTimeout: 60000, // 1 minute for navigation
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
