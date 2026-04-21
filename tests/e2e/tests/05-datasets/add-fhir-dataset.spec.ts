import { expect, test } from '../fixtures'
import { MINUTE_2 } from '../const'

const TEST_NAME = 'add-fhir-dataset'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
const randomString = Math.random().toString(36).substring(2, 10)

test(TEST_NAME, async ({ page }) => {
  test.setTimeout(360 * 1000)
  // Sign in
  await page.goto('https://localhost:41100/d2e/portal/public/overview')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  const datasetNewSchema = 'New automated test FHIR dataset 1'
  const datasetNewCacheSchema = 'New automated test cache FHIR dataset 1'
  // const vocabSchemaName = 'demo_cdm'

  // Switch to admin portal
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  //Enable feature flag
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Feature flagsEnable \/ disable featureConfigure$/ })
    .getByTestId('button')
    .click()

  const fhirServerCheckbox = await page.getByText('Fhir server')
  if (!(await fhirServerCheckbox.isChecked())) {
    await fhirServerCheckbox.click()
  }
  await expect(fhirServerCheckbox).toBeChecked()

  // Cleanup if the datasets already exist
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Demo dataset' }).first()).toBeVisible()
  for (const dataset of [datasetNewSchema, datasetNewCacheSchema]) {
    const datasetRow = page.locator('tr', { hasText: `${dataset}` }).first()
    if (await datasetRow.isVisible()) {
      await datasetRow.getByText('Select action').click()
      await page.getByRole('option', { name: 'Delete dataset' }).click()
      // Enter dataset name to confirm deletion
      await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill(dataset)
      await page.getByRole('button', { name: 'Yes, delete' }).click()
      await page.reload()
      await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible()
    }
  }

  async function createComplete() {
    // Wait for job container to stabilize
    await page.waitForTimeout(5000)
    await page.locator('a:text("create-fhir-cache-file-fhir")').isVisible()
    const entry = page
      .locator('.page-heading-flow-run__flow-details')
      .first()
    const stateBadge = entry.locator('.state-badge')
    await expect(stateBadge).toHaveText('Completed', { timeout: 720000 })
    await page.getByRole('link', { name: 'Datasets' }).click()
    // Wait for table to load
    await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible()
  }

  // Add new dataset
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Add dataset' }).click()
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill(datasetNewSchema)
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill(datasetNewSchema)
  await page.locator('#mui-component-select-schemaOption').click()
  await page.getByRole('option', { name: 'Create FHIR server project', exact: true }).click()
  // Uncheck the "Use default result schema name" checkbox to enable custom input
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'FHIR_QR', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill(`${randomString}1`)
  await page.getByRole('textbox', { name: 'Cache Dataset Name' }).click()
  await page.getByRole('textbox', { name: 'Cache Dataset Name' }).fill(datasetNewCacheSchema)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  // Close the "Dataset Created" notification dialog
  await page.getByRole('button', { name: 'View flow run', exact: true }).click({ timeout: MINUTE_2 })

  // Wait for schema to be created in the database (this also creates the cache dataset)
  await createComplete()

  // After the job completes, the cache dataset should be visible
  // Parent rows are automatically expanded by default, so child rows should be visible
  await expect(page.locator('tr', { hasText: datasetNewCacheSchema }).first()).toBeVisible({ timeout: MINUTE_2 })

  // Clean up Delete the newly created dataset
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible()
  // Find and delete the child dataset first (datasetNewCacheSchema)
  const newCacheRow = page.locator('tr', { hasText: datasetNewCacheSchema }).first()
  await expect(newCacheRow).toBeVisible()
  await newCacheRow.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  // Enter dataset name to confirm deletion
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill(datasetNewCacheSchema)
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  // Then delete the parent dataset (datasetNewSchema)
  const newSchemaRow = page.locator('tr', { hasText: datasetNewSchema }).first()
  await expect(newSchemaRow).toBeVisible()
  await newSchemaRow.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  // Enter dataset name to confirm deletion
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill(datasetNewSchema)
  await page.getByRole('button', { name: 'Yes, delete' }).click()
})
