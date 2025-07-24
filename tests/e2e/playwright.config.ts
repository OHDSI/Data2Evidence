import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  timeout: 180000, // 3 minutes per test
  expect: {
    timeout: 120000 // 20 seconds for expect conditions
  },
  use: {
    baseURL: 'https://localhost:443',
    actionTimeout: 30000, // 30 seconds for each action
    navigationTimeout: 60000, // 1 minute for navigation
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: true
  },
  retries: process.env.CI ? 3 : 0, // retry failed tests once
  reporter: 'list',
  workers: 1
})
