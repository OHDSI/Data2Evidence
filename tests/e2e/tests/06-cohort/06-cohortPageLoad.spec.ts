import { test, expect, acceptAtlasLicense } from '../fixtures'

const TEST_NAME = 'cohortPageLoad'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

/**
 * Smoke test: the Atlas Data Exploration screen loads and shows its primary
 * controls for the selected Demo dataset.
 */
test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await acceptAtlasLicense(page)

  const demoDataset = page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: 'Demo dataset', exact: true }) })
    .filter({ hasText: 'Data source type: omop5-4' })
  await expect(demoDataset).toHaveCount(1)
  await demoDataset.click()
  await page.getByRole('link', { name: 'Data Exploration' }).click()

  await expect(page.getByTestId('explorations-page')).toBeVisible()
  await expect(page.getByTestId('explorations-search')).toBeVisible()
  await expect(page.getByTestId('explorations-filters-btn')).toBeVisible()
  await expect(page.getByTestId('explorations-sort-btn')).toBeVisible()
  await expect(page.getByTestId('explorations-new-btn')).toBeVisible()
  await expect(page.getByTestId('explorations-datasource')).toContainText('Demo dataset')
})
