import { test, expect } from '../fixtures'
import { MINUTE_1, MINUTE_2, MINUTE_5 } from '../const'

const TEST_NAME = 'dataset-new-schema-omop-cdm-plugin-54'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

const randomString = 'omop54' + Math.random().toString(36).substring(2, 10)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
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
  await page.locator('.d2e-markdown-field').getByRole('textbox').fill('Test Description')
  await page.getByRole('combobox', { name: 'CDM schema option' }).click()
  await page.getByRole('option', { name: 'Create new schema', exact: true }).click()
  await page.getByRole('combobox', { name: 'Databases' }).click()
  await page.getByRole('option', { name: 'demo_database-postgres' }).click()
  // Uncheck the "Use default result schema name" checkbox to enable custom input
  await page.getByRole('checkbox', { name: /use default result schema name/i }).uncheck()
  await page.getByRole('textbox', { name: 'Result Schema Name' }).fill(`result_schema_${randomString}`)
  await page.getByRole('combobox', { name: 'Data model option', exact: true }).click()
  await page.getByRole('option', { name: 'omop5-4 [omop_cdm_plugin]' }).click()
  await page.getByRole('combobox', { name: 'Data exploration configuration' }).click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token data source code' }).click()
  await page.getByRole('textbox', { name: 'Token data source code' }).fill(randomString)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  // Close the "Dataset Created" notification dialog
  await page.getByRole('button', { name: 'Close', exact: true }).click({ timeout: MINUTE_2 })
  await expect(page.locator('tr', { hasText: 'Test Study' }).first()).toBeVisible({ timeout: MINUTE_2 })
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
  await page.getByRole('link', { name: 'Data sources' }).click()
  await expect(page.locator('.d2e-table tbody tr').first()).toBeVisible()
  const testStudyDataset = page.locator('tr', { hasText: 'Test Study' }).first()
  await expect(testStudyDataset).toBeVisible({ timeout: MINUTE_1 })
  await testStudyDataset.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete data source' }).click()
  // Enter dataset name to confirm deletion
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill('Test Study')
  await page.getByRole('button', { name: 'Yes, delete' }).click()
})
