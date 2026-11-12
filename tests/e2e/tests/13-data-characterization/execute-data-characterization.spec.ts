import { expect, openAdminPortalFromAtlas, openAtlasPortalFromAdmin, test } from '../fixtures'

const TEST_NAME = 'execute-data-characterization'
test.describe.configure({ retries: 3 }) // Re-try up to 3 times for flaky tests

test(TEST_NAME, async ({ page }) => {
  // Data characterization can take several minutes to finish.
  test.setTimeout(360000)

  await page.goto('/d2e/portal')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)

  // Atlas catalogs the webapi child, so target the matching Admin data-source row.
  await page.getByRole('link', { name: 'Data sources' }).click()
  const demoDatasetRow = page.getByRole('row', { name: /Demo dataset.*webapi/i })
  await demoDatasetRow.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Run data characterization' }).click()
  await page.getByRole('button', { name: 'Run Analysis' }).click()
  await expect(page.getByTestId('alert-message')).toContainText('Successfully generated data_characterization job for Demo dataset')

  await page.getByRole('link', { name: 'Jobs' }).click()
  await page.getByRole('button', { name: 'Job Runs' }).click()
  const jobSearch = page.getByRole('searchbox', { name: 'Search by flow run name' })
  await jobSearch.fill('DC_')
  // DC flow-run names are deterministic, so the newest matching Prefect card is the run just launched.
  const latestDataCharacterizationRun = page
    .locator('.state-list-item__content')
    .filter({ has: page.getByRole('link', { name: /^DC_/ }) })
    .first()
  await expect(latestDataCharacterizationRun.getByText('Completed', { exact: true })).toBeVisible({
    timeout: 300000
  })

  // Switch through Account → Switch to ATLAS, then use visible Atlas navigation.
  await openAtlasPortalFromAdmin(page)
  await page.getByRole('link', { name: 'Data Sources' }).click()
  
  await page.getByTestId('ds-card').click();
  await page.getByTestId('datasource-sidebar-dashboard').getByText('Dashboard').click();
  await expect(page.getByRole('cell', { name: 'Number of People' })).toBeVisible();
  await page.getByRole('cell', { name: '2,694' }).click();
})
