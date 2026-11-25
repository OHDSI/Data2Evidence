import { expect, openAdminPortalFromAtlas, openAtlasPortalFromAdmin, test } from '../fixtures'
import { MINUTE_10 } from '../const'

const TEST_NAME = 'execute-data-quality'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
test.describe.configure({ retries: 3 }) // Re-try up to 3 times for flaky tests

test(TEST_NAME, async ({ page }) => {
  //Increase timeout longer than default
  test.setTimeout(MINUTE_10)

  // Sign in
  await page.goto('/d2e/portal')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)

  // Atlas catalogs the webapi child, so target the matching Admin data-source row.
  await page.getByRole('link', { name: 'Data sources' }).click()
  const demoDatasetRow = page.getByRole('row', { name: /Demo dataset.*webapi/i })
  await demoDatasetRow.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Run data quality' }).click()
  await page.getByRole('button', { name: 'Run Analysis' }).click()
  await expect(page.getByTestId('alert-message')).toContainText('Successfully generated dqd job for Demo dataset')

  await page.getByRole('link', { name: 'Jobs' }).click()
  await page.getByRole('button', { name: 'Job Runs' }).click()
  const jobSearch = page.getByRole('searchbox', { name: 'Search by flow run name' })
  await jobSearch.fill('DQD_')
  // DQD flow-run names are deterministic, so the newest matching Prefect card is the run just launched.
  const latestDataQualityRun = page
    .locator('.state-list-item__content')
    .filter({ has: page.getByRole('link', { name: /^DQD_/ }) })
    .first()
  await expect(latestDataQualityRun.getByText('Completed', { exact: true })).toBeVisible({
    timeout: 300000
  })

  // Switch through Account → Switch to ATLAS, then use visible Atlas navigation.
  await openAtlasPortalFromAdmin(page)
  await page.getByRole('link', { name: 'Data Sources' }).click()
  await page.getByTestId('ds-card').click()
  await page.getByText('Data quality dashboard', { exact: true }).click()

  // The dashboard follows the latest run from loading/running to ready.
  await page.getByRole('cell', { name: 'Verification' }).click()
  await page.getByRole('cell', { name: 'Validation' }).click()
  await page.getByRole('rowheader', { name: 'Total' }).click()
})
