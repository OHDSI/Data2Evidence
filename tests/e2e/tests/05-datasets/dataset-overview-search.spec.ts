import { test, expect, openAdminPortalFromAtlas } from '../fixtures'

const TEST_NAME = 'dataset-overview-search'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
test.describe.configure({ retries: 3 }) // Re-try up to 3 times for flaky tests

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Feature flagsEnable \/ disable featureConfigure$/ })
    .getByTestId('button')
    .click()

  // Check if the "Dataset search" feature is already enabled
  const datasetSearchCheckbox = page.locator('#Dataset\\ search')
  const isChecked = await datasetSearchCheckbox.isChecked()

  if (!isChecked) {
    await page.getByText('Dataset search').click()
  }

  await page.getByTestId('button').click()
  await expect(page.getByTestId('snackbar-message')).toContainText('Changes saved')

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to ATLAS' }).click()
  const search = page.getByRole('textbox', { name: 'Search' })
  const demoDataset = page.getByRole('button', { name: /Demo dataset.*Have access/ })

  await search.fill('demo')
  await expect(demoDataset).toBeVisible()

  await search.fill('xxxxxxxxx')
  await expect(demoDataset).toBeHidden()

  await search.clear()
  await expect(demoDataset).toBeVisible()
})
