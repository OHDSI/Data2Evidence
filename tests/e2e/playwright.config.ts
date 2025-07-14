import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/dqd',
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 120000 // 20 seconds for expect conditions
  },
  use: {
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
