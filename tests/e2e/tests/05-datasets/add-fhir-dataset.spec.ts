import { expect, test } from '../fixtures'
const TEST_NAME = 'add-fhir-dataset'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
const randomString = Math.random().toString(36).substring(2, 10)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto('/d2e/portal')
  const loginButton = page.getByRole('button', { name: 'Login' })
  if (await loginButton.isVisible().catch(() => false)) {
    await loginButton.click()
  }
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  const datasetSchema = 'New automated test FHIR dataset 1'
  // const vocabSchemaName = 'demo_cdm'

  // // Switch to admin portal
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
  await fhirServerCheckbox.scrollIntoViewIfNeeded()
  if (!(await fhirServerCheckbox.isChecked())) {
    await fhirServerCheckbox.click()
  }
  await expect(fhirServerCheckbox).toBeChecked()
  const saveFeatureFlagButton = page
    .locator('div.alp-button__container[data-testid="button-container"]')
    .getByRole('button', { name: 'Save', exact: true })
  await saveFeatureFlagButton.scrollIntoViewIfNeeded()
  await saveFeatureFlagButton.click()

  // Cleanup if the datasets already exist
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Demo dataset' }).first()).toBeVisible()
  const datasetRow = page.locator('tr', { hasText: `${datasetSchema}` }).first()
  while (await datasetRow.isVisible()) {
    await datasetRow.getByText('Select action').click()
    await page.getByRole('option', { name: 'Delete dataset' }).click()
    // Enter dataset name to confirm deletion
    await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill(datasetSchema)
    await page.getByRole('button', { name: 'Yes, delete' }).click()
    await page.reload()
    await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible()
  }

  // Add new dataset
  // await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Add dataset' }).click()
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill(datasetSchema)
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill(datasetSchema)
  await page.locator('#mui-component-select-schemaOption').click()
  await page.getByRole('option', { name: 'Create FHIR dataset', exact: true }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'FHIR_QR', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill(`${randomString}1`)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(`Dataset ${datasetSchema} has been created successfully.`)).toBeVisible()
  await page.getByTestId('dialog-close').click()
  const fhirDataset = page.locator('tr', { hasText: datasetSchema }).first()
  await expect(fhirDataset).toBeVisible()

  // Clean up Delete the newly created dataset
  await fhirDataset.getByText('Select action').click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  // Enter dataset name to confirm deletion
  await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill(datasetSchema)
  await page.getByRole('button', { name: 'Yes, delete' }).click()

  // Confirm the dataset no longer appears in the list
  // await page.reload()
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible()
  await expect(page.locator('tr', { hasText: datasetSchema })).toHaveCount(0)
})
