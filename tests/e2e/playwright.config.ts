import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
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
  retries: 3, // retry failed tests once
  reporter: 'list',
  workers: 1
});
