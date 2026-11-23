import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import { MINUTE_1, MINUTE_3, SECOND_20, SECOND_30 } from './tests/const'

// Load an optional per-provider env file (E2E_ENV_FILE) first; dotenv won't override
// already-set vars, so the files below only fill in the rest.
if (process.env.E2E_ENV_FILE) {
  dotenv.config({ path: process.env.E2E_ENV_FILE, quiet: true })
}
dotenv.config({ quiet: true })
// Stack secrets (trex service-role key, Logto M2M) live in the repo-root env file, not tests/e2e.
dotenv.config({ path: '../../.env', quiet: true })
dotenv.config({ path: '../../.env.local', quiet: true })

// The HANA demo setup provisions "Demo dataset HANA" from CDMSYNPUF5PCT rather
// than the DuckDB demo dataset, so specs that assert on demo data, cohort
// counts or seed-patched screenshots cannot pass against it. Only specs that
// exercise the platform independently of the dataset run there; extend this
// list as further specs are made to pass on HANA.
const HANA_SPECS = [
  '00-login-page/logo.spec.ts',
  '02-users/**/*.spec.ts',
  '07-setup/admin_portal.spec.ts',
  '07-setup/metadata.spec.ts',
  '08-dataflow/**/*.spec.ts',
  '10-jobs/job-overview.spec.ts'
]

// Demo CI runs every eligible test once and collects all failures.
const singlePass = process.env.E2E_SINGLE_PASS === '1'

const isHana = process.env.E2E_DB_DIALECT === 'hana'

export default defineConfig({
  testDir: 'tests',
  ...(isHana ? { testMatch: HANA_SPECS.map((spec) => `**/${spec}`) } : {}),
  testIgnore: process.env.SKIP_IDP_SPECS
    ? [
        '**/idp/logto-federated.spec.ts',
        '**/idp/physionet.spec.ts',
        '**/idp/entra-external-id.spec.ts',
        '**/idp/entra.spec.ts'
      ]
    : [],
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
  retries: singlePass ? 0 : process.env.CI ? 2 : 0,
  reporter: [
    ['list'], // You can combine multiple reporters
    ['playwright-ctrf-json-reporter', {}]
  ],
  workers: 1,
  maxFailures: singlePass ? 0 : process.env.CI ? 1 : 0 // 0 = no cap; run all tests even if some fail
})
