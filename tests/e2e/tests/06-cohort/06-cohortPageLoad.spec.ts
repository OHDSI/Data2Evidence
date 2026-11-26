import { test, expect, acceptAtlasLicense } from '../fixtures'

const TEST_NAME = 'cohortPageLoad'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

/**
 * Smoke test: the Cohorts screen loads and shows its primary controls.
 *
 * This asserted the old Bookmarks header - the 'Create Cohort:' title and a
 * D2E / Import / Shared / Compare button group. The Data Exploration redesign
 * replaced that page, so every one of those is gone:
 *
 * - 'Create Cohort:' and the button group are replaced by the toolbar below.
 * - 'Shared' (the show-shared-cohorts toggle) has no equivalent; the list shows
 *   what the user owns.
 * - 'Import' (import an Atlas cohort definition) has no entry point on the new
 *   page. That is an open question for the redesign, not something this test
 *   can assert around.
 * - 'Compare' moved into the bulk-actions bar, which only appears once a card
 *   is selected, so it is not part of a page-load assertion any more.
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
