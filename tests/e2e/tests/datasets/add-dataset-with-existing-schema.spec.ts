import { test, expect } from '@playwright/test'

test('add-dataset-with-existing-schema', async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  const datasetNewSchema = 'New automated test dataset'
  const datasetExistingSchema = 'New automated test dataset 2'
  const vocabSchemaName = 'demo_cdm'

  // Add new dataset with new schema
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
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

  // Wait for 20 seconds for the schema to be created in the database
  await page.waitForTimeout(20000)

  // Copy the schema name for later use
  const schemaText = await page.getByRole('cell', { name: /^CDM_NEWTESTDATASET_/ }).textContent()
  const schemaName = schemaText?.replace(vocabSchemaName, '').trim() || ''

  // Clean up
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
