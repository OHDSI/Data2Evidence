import { test, expect } from '@playwright/test'
import { MINUTE_2, MINUTE_10 } from '../const'

const TEST_NAME = 'dataset-new-schema-omop-cdm-plugin-53'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

const randomString = 'omop53' + Math.random().toString(36).substring(2, 10)

test(TEST_NAME, async ({ page }) => {
  test.setTimeout(MINUTE_10)
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Add dataset' }).click()
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).click()
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill('Test Study')
  await page.getByRole('textbox', { name: 'Dataset summary' }).click()
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Test Summary')
  // Use the test ID selector
  await page.getByTestId('add-study-mde').getByRole('textbox').fill('Test Description')
  await page.getByTestId('dialog').locator('div').filter({ hasText: 'CDM Schema Option' }).nth(4).click()
  await page.getByRole('option', { name: 'Create new schema', exact: true }).click()
  await page.locator('#mui-component-select-databaseOption').click()
  await page.getByRole('option', { name: 'demo_database-postgres' }).click()
  // Uncheck the "Use default result schema name" checkbox to enable custom input
  await page.getByRole('checkbox', { name: /use default result schema name/i }).uncheck()
  await page.getByRole('textbox', { name: 'Result Schema Name' }).fill(`result_schema_${randomString}`)
  await page.locator('#mui-component-select-dataModelOption').click()
  await page.getByRole('option', { name: 'omop5-3 [omop_cdm_plugin]' }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill(randomString)
  await page.getByRole('textbox', { name: 'Cache Dataset Name' }).click()
  await page.getByRole('textbox', { name: 'Cache Dataset Name' }).fill('Test Cache')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  // Wait for datasets to appear in the table (with parent-child structure, use row locators)
  await expect(page.locator('tr', { hasText: 'Test Study' }).first()).toBeVisible({ timeout: MINUTE_2 })
  await expect(page.locator('tr', { hasText: 'Test Cache' }).first()).toBeVisible({ timeout: MINUTE_2 })
  await page.getByRole('link', { name: 'Jobs' }).click()
  // Get the first (top) entry link
  const firstEntry = page
    .locator('.state-list-item__content')
    .filter({ has: page.locator(`a:has-text("datamodel-create-cdm_${randomString}")`) })
    .first()
  // Find the closest state badge to this entry
  const stateBadge = firstEntry.locator('.state-badge')
  await expect(stateBadge).toHaveText(/Completed/, { timeout: MINUTE_10 })
  // Clean up - delete the created dataset
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible()
  // Find and delete the child dataset first (Test Cache)
  const testCacheRow = page.locator('tr', { hasText: 'Test Cache' }).first()
  await expect(testCacheRow).toBeVisible({ timeout: MINUTE_2 })
  await testCacheRow.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  // Enter dataset name to confirm deletion
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill('Test Cache')
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  // Then delete the parent dataset (Test Study)
  const testStudyDataset = page.locator('tr', { hasText: 'Test Study' }).first()
  await expect(testStudyDataset).toBeVisible({ timeout: MINUTE_2 })
  await testStudyDataset.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  // Enter dataset name to confirm deletion
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill('Test Study')
  await page.getByRole('button', { name: 'Yes, delete' }).click()
})
