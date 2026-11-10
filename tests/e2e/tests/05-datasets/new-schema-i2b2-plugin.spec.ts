import { test, expect, openAdminPortalFromAtlas } from '../fixtures'
import type { Page } from '@playwright/test'
import { MINUTE_2, MINUTE_5 } from '../const'

const TEST_NAME = 'dataset-new-schema-i2b2-plugin'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
const DATASET_NAME = 'Test Study'
const randomString = 'tsi2b2' + Math.random().toString(36).substring(2, 10)

async function deleteDatasetIfPresent(page: Page) {
  await page.goto('/d2e/portal')
  const identifier = page.locator('input[name="identifier"]')
  if (await identifier.isVisible().catch(() => false)) {
    await identifier.fill('admin')
    await page.locator('input[name="password"]').fill('Updatepassword12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
  }
  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'Data sources' }).click()

  const datasetRow = page.getByRole('row').filter({
    has: page.getByRole('cell', { name: DATASET_NAME, exact: true })
  })
  if (await datasetRow.count() === 0) return

  await datasetRow.first().getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete data source' }).click()
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill(DATASET_NAME)
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page.getByRole('textbox', { name: 'Enter dataset name to confirm' })).toBeHidden({ timeout: MINUTE_2 })
}

test.afterEach(async ({ page }) => {
  await deleteDatasetIfPresent(page)
})

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'Data sources' }).click()

  // Remove a leftover from a previously interrupted attempt before recreating it.
  const existingDataset = page.getByRole('row').filter({
    has: page.getByRole('cell', { name: DATASET_NAME, exact: true })
  })
  if (await existingDataset.count() > 0) await deleteDatasetIfPresent(page)
  await page.getByRole('link', { name: 'Data sources' }).click()

  await page.getByRole('button', { name: 'Add data source' }).click()
  await page.getByRole('textbox', { name: 'Data source name - Displayed on' }).click()
  await page.getByRole('textbox', { name: 'Data source name - Displayed on' }).fill(DATASET_NAME)
  await page.getByRole('textbox', { name: 'Data source summary' }).click()
  await page.getByRole('textbox', { name: 'Data source summary' }).fill('Test Summary')
  // Use the test ID selector
  await page.locator('.d2e-markdown-field').getByRole('textbox').fill('Test Description')
  await page.getByRole('combobox', { name: 'CDM schema option' }).click()
  await page.getByRole('option', { name: 'Create new schema', exact: true }).click()
  await page.getByRole('combobox', { name: 'Databases' }).click()
  await page.getByRole('option', { name: 'demo_database-postgres' }).click()
  // Switch to source mode so non-OMOP data models are selectable
  await page.getByRole('combobox', { name: 'Management mode' }).click()
  await page.getByRole('option', { name: 'Source (with cache data source)' }).click()
  // Uncheck the "Use default result schema name" checkbox to enable custom input
  await page.getByRole('checkbox', { name: /use default result schema name/i }).uncheck()
  await page.getByRole('textbox', { name: 'Result Schema Name' }).fill(`result_schema_${randomString}`)
  await page.getByRole('combobox', { name: 'Data model option', exact: true }).click()
  await page.getByRole('option', { name: 'v1.8.1 [i2b2_plugin]' }).click()
  await page.getByRole('combobox', { name: 'PA config' }).click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token data source code' }).click()
  await page.getByRole('textbox', { name: 'Token data source code' }).fill(randomString)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  // Close the "Dataset Created" notification dialog
  await page.getByRole('button', { name: 'Close', exact: true }).click({ timeout: MINUTE_2 })
  // Wait for datasets to appear in the table (with parent-child structure, use row locators)
  await expect(page.locator('tr', { hasText: DATASET_NAME }).first()).toBeVisible({ timeout: MINUTE_2 })
  // i2b2 is a standalone type — no cache dataset should be created
  await expect(page.locator('tr', { hasText: 'Test Cache' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Jobs' }).click()
  // Get the first (top) entry link
  const firstEntry = page
    .locator('.state-list-item__content')
    .filter({ has: page.locator(`a:has-text("datamodel-create-cdm_${randomString}")`) })
    .first()
  // Find the closest state badge to this entry
  const stateBadge = firstEntry.locator('.state-badge')
  await expect(stateBadge).toHaveText(/Completed/, { timeout: MINUTE_5 })

  // Clean up - delete the created dataset
  await page.getByRole('link', { name: 'Data sources' }).click()
  await expect(page.locator('.d2e-table tbody tr').first()).toBeVisible()
  // Delete the standalone i2b2 dataset
  const testStudyDataset = page.locator('tr', { hasText: DATASET_NAME }).first()
  await expect(testStudyDataset).toBeVisible({ timeout: MINUTE_2 })
  await testStudyDataset.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete data source' }).click()
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill(DATASET_NAME)
  await page.getByRole('button', { name: 'Yes, delete' }).click()
})
