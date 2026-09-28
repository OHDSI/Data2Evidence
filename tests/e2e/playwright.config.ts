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
  // The comment this replaces said "retry failed tests once" and retried zero
  // times, in CI and locally both. Six specs carry their own
  // `test.describe.configure({ retries: N })` as a result -- each one working
  // around a global that was quietly off.
  //
  // It matters here because the stack retries are for is not the code under
  // test. trex recycles its edge workers constantly (30-41 `Shutdown` events
  // with reason `EarlyDrop` per run), and a request landing in that window gets
  // a 502 or a re-authorization mid-test. The suite runs with
  // `maxFailures: 1`, so one such moment aborts the whole shard: three
  // consecutive runs died on three DIFFERENT tests -- filtering-barchart,
  // pa-compare-cohorts, attribute-hybrid-search -- while every code-level
  // failure behind them had already been fixed.
  //
  // The worker timeout is `env!("SUPABASE_RESOURCE_LIMIT_TIMEOUT_MS")`, a Rust
  // compile-time macro inside trex-runtime, so nothing in this repository can
  // configure it. Retrying is the only lever here. A test that fails on all
  // three attempts is still a failure, and maxFailures still stops the run.
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'], // You can combine multiple reporters
    ['playwright-ctrf-json-reporter', {}]
  ],
  workers: 1,
  maxFailures: process.env.CI ? 1 : 0 // 0 = no cap; run all tests even if some fail
})
