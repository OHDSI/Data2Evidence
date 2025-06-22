import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  timeout: 100000,

  use: {
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: true
  },
  reporter: 'list'
})
