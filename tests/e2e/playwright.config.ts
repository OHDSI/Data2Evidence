import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 120000,

  use: {
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    navigationTimeout: 60000
  },
  reporter: 'list',
});