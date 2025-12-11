import { expect, test } from '@playwright/test'

const TEST_NAME = 'add-dataset-with-existing-schema'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
const randomString = Math.random().toString(36).substring(2, 10)

test(TEST_NAME, async ({ page }) => {
  test.setTimeout(360 * 1000)
  // Sign in
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  const datasetNewSchema = 'New automated test dataset 1'
  const datasetNewCacheSchema = 'New automated test cache dataset 1'
  const datasetExistingSchema = 'New automated test dataset 2'
  const datasetExistingCacheSchema = 'New automated test cache dataset 2'
  const vocabSchemaName = 'demo_cdm'

  // Switch to admin portal
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Cleanup if the datasets already exist
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible({ timeout: 30000 })
  await expect(page.locator('tr', { hasText: 'Demo dataset' }).first()).toBeVisible({ timeout: 10000 })
  for (const dataset of [datasetNewSchema, datasetNewCacheSchema, datasetExistingSchema, datasetExistingCacheSchema]) {
    const datasetRow = page.locator('tr', { hasText: `${dataset}` }).first()
    if (await datasetRow.isVisible({ timeout: 1000 })) {
      await datasetRow.getByText('Select action').click()
      await page.getByRole('option', { name: 'Delete dataset' }).click()
      await page.getByRole('button', { name: 'Yes, delete' }).click()
      await page.reload()
      await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible({ timeout: 30000 })
    }
  }

  async function createComplete() {
    // Wait for schema to be created in the database
    await page.getByRole('link', { name: 'Jobs' }).click()
    const entry = page
      .locator('.flow-run-list-item')
      .filter({ has: page.locator('a:text("omop_cdm_plugin")') })
      .first()
    const stateBadge = entry.locator('.state-badge')
    await expect(stateBadge).toHaveText('Completed', { timeout: 720000 })
    await page.getByRole('link', { name: 'Datasets' }).click()
    // Wait for table to load
    await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible({ timeout: 30000 })
  }

  // Add new dataset
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Add dataset' }).click()
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill(datasetNewSchema)
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill(datasetNewSchema)
  await page.locator('#mui-component-select-schemaOption').click()
  await page.getByRole('option', { name: 'Create new schema', exact: true }).click()
  await page.locator('#mui-component-select-databaseOption').click()
  await page.getByRole('option', { name: 'demo_database-postgres' }).click()
  await page.getByRole('textbox', { name: 'Result Schema Name' }).fill(`result_schema_${randomString}`)
  await page.locator('#mui-component-select-dataModelOption').click()
  await page.getByRole('option', { name: 'omop5-4 [omop_cdm_plugin]' }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('new_test_dataset')
  await page.getByRole('textbox', { name: 'Cache Dataset Name' }).click()
  await page.getByRole('textbox', { name: 'Cache Dataset Name' }).fill(datasetNewCacheSchema)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  // Wait for table to load first
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible({ timeout: 30000 })
  // Wait for parent dataset to appear in the table (with parent-child structure, use row locators)
  await expect(page.locator('tr', { hasText: datasetNewSchema }).first()).toBeVisible({ timeout: 120000 })

  // Wait for schema to be created in the database (this also creates the cache dataset)
  await createComplete()

  // After the job completes, the cache dataset should be visible
  // Parent rows are automatically expanded by default, so child rows should be visible
  await expect(page.locator('tr', { hasText: datasetNewCacheSchema }).first()).toBeVisible({ timeout: 120000 })

  // Copy the schema name for later use
  const schemaText = await page.getByRole('cell', { name: /^cdm_newtestdataset_/ }).textContent()
  const schemaName = schemaText?.replace(vocabSchemaName, '').trim() || ''

  // Delete the newly created dataset
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible({ timeout: 30000 })
  // Find and delete the child dataset first (datasetNewCacheSchema)
  const newCacheRow = page.locator('tr', { hasText: datasetNewCacheSchema }).first()
  await expect(newCacheRow).toBeVisible({ timeout: 30000 })
  await newCacheRow.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click({ timeout: 30000 })
  await page.getByRole('button', { name: 'Yes, delete' }).click({ timeout: 30000 })
  // Then delete the parent dataset (datasetNewSchema)
  const newSchemaRow = page.locator('tr', { hasText: datasetNewSchema }).first()
  await expect(newSchemaRow).toBeVisible({ timeout: 30000 })
  await newSchemaRow.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click({ timeout: 30000 })
  await page.getByRole('button', { name: 'Yes, delete' }).click({ timeout: 30000 })

  // Add dataset with existing schema
  await page.getByRole('button', { name: 'Add dataset' }).click()
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill(datasetExistingSchema)
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill(datasetExistingSchema)
  await page.locator('#mui-component-select-schemaOption').click()
  await page.getByRole('option', { name: 'Use existing schema', exact: true }).click()
  await page.locator('#mui-component-select-databaseOption').click()
  await page.getByRole('option', { name: 'demo_database-postgres' }).click()
  await page.getByRole('textbox', { name: 'Schema name', exact: true }).fill('demo_cdm')
  await page.getByRole('textbox', { name: 'Result Schema Name' }).fill(`result_schema_${randomString}`)
  await page.locator('#mui-component-select-dataModelOption').click()
  await expect(page.getByRole('option', { name: 'omop5-3 [omop_cdm_plugin]' })).toBeVisible({ timeout: 1000 })
  await page.getByRole('option', { name: 'omop5-3 [omop_cdm_plugin]' }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('new_test_dataset_2')
  await page.getByRole('textbox', { name: 'Cache Dataset Name' }).click()
  await page.getByRole('textbox', { name: 'Cache Dataset Name' }).fill(datasetExistingCacheSchema)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  // Wait for table to load and datasets to appear
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible({ timeout: 30000 })
  await expect(page.locator('tr', { hasText: datasetExistingSchema }).first()).toBeVisible({ timeout: 30000 })
  await expect(page.locator('tr', { hasText: datasetExistingCacheSchema }).first()).toBeVisible({ timeout: 30000 })

  // Clean up
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible({ timeout: 30000 })
  // Find and delete the child dataset first (datasetExistingCacheSchema)
  const existingCacheRow = page.locator('tr', { hasText: datasetExistingCacheSchema }).first()
  await expect(existingCacheRow).toBeVisible({ timeout: 30000 })
  await existingCacheRow.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click({ timeout: 30000 })
  await page.getByRole('button', { name: 'Yes, delete' }).click({ timeout: 30000 })
  // Then delete the parent dataset (datasetExistingSchema)
  const existingSchemaRow = page.locator('tr', { hasText: datasetExistingSchema }).first()
  await expect(existingSchemaRow).toBeVisible({ timeout: 30000 })
  await existingSchemaRow.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click({ timeout: 30000 })
  await page.getByRole('button', { name: 'Yes, delete' }).click({ timeout: 30000 })
})
