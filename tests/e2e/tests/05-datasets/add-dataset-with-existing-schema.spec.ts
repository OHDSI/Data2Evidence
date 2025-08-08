import { test, expect } from '@playwright/test'

const TEST_NAME = 'add-dataset-with-existing-schema'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto(`https://localhost:443/portal`)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  const datasetNewSchema = 'New automated test dataset'
  const datasetExistingSchema = 'New automated test dataset 2'
  const vocabSchemaName = 'demo_cdm'

  // Switch to admin portal
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

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
  await page.locator('#mui-component-select-dataModelOption').click()
  await page.getByRole('option', { name: 'omop5-4 [omop_cdm_plugin]' }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('new_test_dataset')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.locator('tbody')).toContainText(datasetNewSchema)

  // Wait for 1 minute for the schema to be created in the database
  await page.waitForTimeout(60000)

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
  await page.locator('#mui-component-select-dataModelOption').click()
  await page.getByRole('option', { name: 'omop5-4 [omop_cdm_plugin]' }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('new_test_dataset_2')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.locator('tbody')).toContainText(datasetExistingSchema)

  // Clean up
  await page.locator('tr', { hasText: datasetExistingSchema }).getByRole('button', { name: 'Select action' }).click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
})
