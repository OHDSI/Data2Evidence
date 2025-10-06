import { test, expect } from '@playwright/test'

const TEST_NAME = 'add-dataset-with-existing-schema'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  test.setTimeout(120 * 1000)
  // Sign in
  await page.goto(`/portal`)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  const datasetNewSchema = 'New automated test dataset 1'
  const datasetExistingSchema = 'New automated test dataset 2'
  const vocabSchemaName = 'demo_cdm'

  // Switch to admin portal
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Cleanup if the datasets already exist
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.locator('tr', { hasText: 'Demo dataset' })).toBeVisible({ timeout: 1000 })
  for (const dataset of [datasetNewSchema, datasetExistingSchema]) {
    if (await page.locator('tr', { hasText: `${dataset}` }).isVisible({ timeout: 1000 })) {
      await page
        .locator('tr', { hasText: `${dataset}` })
        .getByRole('button', { name: 'Select action' })
        .click()
      await page.getByRole('option', { name: 'Delete dataset' }).click()
      await page.getByRole('button', { name: 'Yes, delete' }).click()
      await page.reload()
      await expect(page.locator('tbody')).not.toContainText(`${dataset}`)
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
    await expect(stateBadge).toHaveText('Completed', { timeout: 120000 })
    await page.getByRole('link', { name: 'Datasets' }).click()
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
  await page.locator('#mui-component-select-vocabSchemaOption').click()
  await page.getByRole('option', { name: vocabSchemaName }).click()
  await page.getByRole('textbox', { name: 'Result Schema Name' }).fill('new_test_result_existing_schema')
  await page.locator('#mui-component-select-dataModelOption').click()
  await page.getByRole('option', { name: 'omop5-3 [omop_cdm_plugin]' }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('new_test_dataset')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.locator('tbody')).toContainText(datasetNewSchema)

  // Wait for schema to be created in the database
  await createComplete()

  // Copy the schema name for later use
  const schemaText = await page.getByRole('cell', { name: /^cdm_newtestdataset_/ }).textContent()
  const schemaName = schemaText?.replace(vocabSchemaName, '').trim() || ''

  // Delete the newly created dataset
  await page.locator('tr', { hasText: datasetNewSchema }).getByRole('button', { name: 'Select action' }).click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()

  // Add dataset with existing schema
  await page.getByRole('button', { name: 'Add dataset' }).click()
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill(datasetExistingSchema)
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill(datasetExistingSchema)
  await page.locator('#mui-component-select-schemaOption').click()
  await page.getByRole('option', { name: 'Use existing schema', exact: true }).click()
  await page.locator('#mui-component-select-databaseOption').click()
  await page.getByRole('option', { name: 'demo_database-postgres' }).click()
  await page.getByRole('textbox', { name: 'Schema name', exact: true }).fill(schemaName)
  await page.getByRole('textbox', { name: 'Vocab Schema Name' }).fill('demo_cdm')
  await page.getByRole('textbox', { name: 'Result Schema Name' }).fill('new_test_result_existing_schema')
  await page.locator('#mui-component-select-dataModelOption').click()
  await expect(page.getByRole('option', { name: 'omop5-3 [omop_cdm_plugin]' })).toBeVisible({ timeout: 1000 })
  await page.getByRole('option', { name: 'omop5-3 [omop_cdm_plugin]' }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('new_test_dataset_2')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.waitForTimeout(3000) // Wait for the table to refresh
  await expect(page.getByRole('cell', { name: `${datasetExistingSchema}` })).toBeVisible({ timeout: 10000 })

  // Clean up
  await page.locator('tr', { hasText: datasetExistingSchema }).getByRole('button', { name: 'Select action' }).click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
})
