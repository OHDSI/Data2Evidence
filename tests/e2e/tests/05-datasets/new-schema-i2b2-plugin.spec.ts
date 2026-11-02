import { test, expect } from '../fixtures'
import { MINUTE_2, MINUTE_5 } from '../const'

const TEST_NAME = 'dataset-new-schema-i2b2-plugin'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
const randomString = 'tsi2b2' + Math.random().toString(36).substring(2, 10)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Data sources' }).click()
  await page.getByRole('button', { name: 'Add data source' }).click()
  await page.getByRole('textbox', { name: 'Data source name - Displayed on' }).click()
  await page.getByRole('textbox', { name: 'Data source name - Displayed on' }).fill('Test Study')
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
  await page.getByRole('option', { name: 'Source (with cache dataset)' }).click()
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
  await expect(page.locator('tr', { hasText: 'Test Study' }).first()).toBeVisible({ timeout: MINUTE_2 })
  // i2b2 is a standalone type — no cache dataset should be created
  await expect(page.locator('tr', { hasText: 'Test Cache' })).toHaveCount(0)
  // Wait for job container to stabilize before navigating to Jobs page
  await page.waitForTimeout(20000)
  await page.getByRole('link', { name: 'Jobs' }).click()
  // Get the first (top) entry link
  const firstEntry = page
    .locator('.state-list-item__content')
    .filter({ has: page.locator(`a:has-text("datamodel-create-cdm_${randomString}")`) })
    .first()
  // Find the closest state badge to this entry
  const stateBadge = firstEntry.locator('.state-badge')
  await expect(stateBadge).toHaveText(/Completed/, { timeout: MINUTE_5 })
  // Update dataset metadata should trigger the i2b2 plugin get_version_info job
  await page.getByRole('link', { name: 'Data sources' }).click()
  const versionInfoRequest = page.waitForRequest(
    (req) =>
      req.url().includes('datamodel/get_version_info') &&
      (req.postData() ?? '').includes('i2b2_plugin-get_version_info')
  )
  await page.getByRole('button', { name: 'Update metadata' }).click()
  await versionInfoRequest
  await page.getByRole('link', { name: 'Jobs' }).click()
  const versionInfoEntry = page
    .locator('.state-list-item__content')
    .filter({ has: page.locator('a:has-text("i2b2_plugin-get_version_info")') })
    .first()
  await expect(versionInfoEntry.locator('.state-badge')).toHaveText(/Completed/, { timeout: MINUTE_5 })
  // Clean up - delete the created dataset
  await page.getByRole('link', { name: 'Data sources' }).click()
  await expect(page.locator('.d2e-table tbody tr').first()).toBeVisible()
  // Delete the standalone i2b2 dataset
  const testStudyDataset = page.locator('tr', { hasText: 'Test Study' }).first()
  await expect(testStudyDataset).toBeVisible({ timeout: MINUTE_2 })
  await testStudyDataset.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete data source' }).click()
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill('Test Study')
  await page.getByRole('button', { name: 'Yes, delete' }).click()
})
