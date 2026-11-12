import { test, expect, openAdminPortalFromAtlas } from '../fixtures'
import { Page } from '@playwright/test'
import { MINUTE_1, MINUTE_2, MINUTE_3, MINUTE_5, MINUTE_10 } from '../const'

const TEST_NAME = 'dataset-new-schema-data-management-plugin-waveform'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
test.describe.configure({ retries: 3 }) // Re-try up to 3 times for flaky tests
const DATASET_NAME = 'Test Waveform Dataset'
const CACHE_DATASET_NAME = 'Test Waveform Cache'
const PA_CONFIG_NAME = 'WAVEFORM'

// Runs the navigation and waits for the dataset list request it triggers, instead of a fixed pause,
// so parent and nested cache rows are rendered before rows are counted
const loadDatasetList = async (page: Page, navigate: () => Promise<unknown>) => {
  const listResponse = page.waitForResponse(
    (response) => response.url().includes('/dataset/list/systemadmin') && response.ok(),
    { timeout: MINUTE_2 }
  )
  await navigate()
  await listResponse
  await expect(page.locator('.d2e-table tbody tr').first()).toBeVisible({ timeout: MINUTE_2 })
}

// Deletes every dataset row matching the name, so leftovers from earlier failed attempts are removed too
const deleteDatasetsIfPresent = async (page: Page, name: string) => {
  const rows = page.locator('tr', { hasText: name })
  for (let attempt = 0; attempt < 10; attempt++) {
    // The dataset table is already loaded by the caller, so count immediately instead of waiting for a row
    const remaining = await rows.count()
    if (remaining === 0) return
    await rows.first().getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('menuitem', { name: 'Delete data source' }).click()
    // Enter dataset name to confirm deletion
    await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill(name)
    await page.getByRole('button', { name: 'Yes, delete' }).click()
    await expect(page.getByRole('textbox', { name: 'Enter dataset name to confirm' })).toBeHidden({ timeout: MINUTE_2 })
    // Reload instead of polling the table, then recount on the next loop iteration
    await loadDatasetList(page, () => page.reload())
  }
}

// Logs in as admin only if the session is not already signed in (hooks and test share the same page)
const openAdminPortal = async (page: Page) => {
  await page.goto('/d2e/portal')
  const identifier = page.getByRole('textbox', { name: 'Username or email' })
  const atlasUser = page.getByRole('button', { name: /admin/i })
  const adminUsers = page.getByRole('heading', { name: 'Users' })
  await expect(identifier.or(atlasUser).or(adminUsers)).toBeVisible({ timeout: MINUTE_1 })
  if (await identifier.isVisible()) {
    await identifier.fill('admin')
    await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(atlasUser.or(adminUsers)).toBeVisible({ timeout: MINUTE_1 })
  }
  await openAdminPortalFromAtlas(page)
}

const cleanUpWaveformDatasets = async (page: Page) => {
  await openAdminPortal(page)
  await loadDatasetList(page, () => page.getByRole('link', { name: 'Data sources' }).click())
  // Delete the child (cache) dataset before its parent
  await deleteDatasetsIfPresent(page, CACHE_DATASET_NAME)
  await deleteDatasetsIfPresent(page, DATASET_NAME)
}

// Before each attempt: remove leftovers so dataset creation starts from a known state
test.beforeEach(async ({ page }) => {
  test.setTimeout(test.info().timeout + MINUTE_3)
  await cleanUpWaveformDatasets(page)
})

// After every attempt, passed or failed, so a failure part-way through does not leave datasets behind
test.afterEach(async ({ page }) => {
  test.setTimeout(test.info().timeout + MINUTE_3)
  await cleanUpWaveformDatasets(page)
})

test(TEST_NAME, async ({ page }) => {
  // Waveform runs the full OMOP 5.4 changelog plus the waveform changesets, then the PA check on top
  // Added on top of the beforeEach cleanup time, which counts against the same test timeout
  test.setTimeout(test.info().timeout + MINUTE_10)
  // Generated per attempt so a retry never reuses the token code / schema of a failed attempt
  const randomString = 'tsdmwf' + Math.random().toString(36).substring(2, 10)

  // beforeEach has already signed in and left the page on Admin portal > Datasets
  await test.step('Create dataset with waveform data model', async () => {
    await page.getByRole('link', { name: 'Data sources' }).click()
    await page.getByRole('button', { name: 'Add data source' }).click()
    await page.getByRole('textbox', { name: 'Data source name - Displayed on' }).click()
    await page.getByRole('textbox', { name: 'Data source name - Displayed on' }).fill(DATASET_NAME)
    await page.getByRole('textbox', { name: 'Data source summary' }).click()
    await page.getByRole('textbox', { name: 'Data source summary' }).fill('Test Summary')
    // Use the test ID selector for SimpleMDE editor
    await page.locator('.d2e-markdown-field').getByRole('textbox').fill('Test Description')
    await page.getByRole('combobox', { name: 'CDM schema option' }).click()
    await page.getByRole('option', { name: 'Create new schema', exact: true }).click()
    await page.getByRole('combobox', { name: 'Databases' }).click()
    await page.getByRole('option', { name: 'demo_database-postgres' }).click()
    // webapi mode only lists data models starting with "omop", so switch to source mode to make waveform selectable
    await page.getByRole('combobox', { name: 'Management mode' }).click()
    await page.getByRole('option', { name: 'Source (with cache data source)' }).click()
    // Uncheck the "Use default result schema name" checkbox to enable custom input
    await page.getByRole('checkbox', { name: /use default result schema name/i }).uncheck()
    await page.getByRole('textbox', { name: 'Result Schema Name' }).fill(`result_schema_${randomString}`)
    await page.getByRole('combobox', { name: 'Data model option', exact: true }).click()
    await page.getByRole('option', { name: 'waveform [data_management_plugin]' }).click()
    await page.getByRole('combobox', { name: 'PA config' }).click()
    await page.getByRole('option', { name: PA_CONFIG_NAME, exact: true }).click()
    await page.getByRole('textbox', { name: 'Token data source code' }).click()
    await page.getByRole('textbox', { name: 'Token data source code' }).fill(randomString)
    await page.getByRole('textbox', { name: 'Cache data source name' }).click()
    await page.getByRole('textbox', { name: 'Cache data source name' }).fill(CACHE_DATASET_NAME)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
  })

  await test.step('Verify datamodel creation job completes', async () => {
    // The "Dataset Created" dialog links straight to the datamodel-create flow run of this dataset
    await page.getByRole('button', { name: 'View flow run' }).click({ timeout: MINUTE_2 })
    await expect(page).toHaveURL(/\/jobs\/runs\/flow-run\//)
    await expect(page.locator('.state-badge').first()).toHaveText(/Completed/, { timeout: MINUTE_5 })
  })

  await test.step('Update cache for the cache dataset', async () => {
    // data_management_plugin only creates the schema in Postgres; PA queries the DuckDB cache,
    // so populate it from the source schema via the create_cachedb_file_plugin flow
    await page.getByRole('link', { name: 'Data sources' }).click()
    // Both the source dataset and its child cache dataset are listed
    await expect(page.locator('tr', { hasText: DATASET_NAME }).first()).toBeVisible({ timeout: MINUTE_2 })
    const cacheRow = page.locator('tr', { hasText: CACHE_DATASET_NAME }).first()
    await expect(cacheRow).toBeVisible({ timeout: MINUTE_2 })
    await cacheRow.getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('menuitem', { name: 'Update cache' }).click()
    await expect(page.getByRole('dialog')).toContainText(`Update cache for dataset: ${CACHE_DATASET_NAME}`)
    await page.getByRole('button', { name: 'Run cache update' }).click()
    await expect(page.getByText('Create cache flow triggered')).toBeVisible({ timeout: MINUTE_2 })
    // The cache flow run has no custom name, so open it directly instead of searching the Jobs list
    await page.getByRole('button', { name: 'View flow run' }).click()
    await expect(page).toHaveURL(/\/jobs\/runs\/flow-run\//)
    await expect(page.locator('.state-badge').first()).toHaveText(/Completed/, { timeout: MINUTE_5 })
  })

  await test.step('Grant admin access to the cache dataset', async () => {
    await page.getByRole('link', { name: 'Data sources' }).click()
    const cacheRow = page.getByRole('row').filter({ hasText: CACHE_DATASET_NAME })
    await expect(cacheRow).toHaveCount(1, { timeout: MINUTE_2 })
    await cacheRow.getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('menuitem', { name: 'Update permissions' }).click()
    await page.getByRole('tab', { name: 'Access' }).click()
    const addButton = page.getByTestId('dialog').getByTestId('button')
    await expect(addButton).toBeVisible()
    await addButton.click()
    await expect(page.getByRole('menuitem', { name: 'admin', exact: true })).toBeVisible()
    await page.getByRole('menuitem', { name: 'admin', exact: true }).click()
    await expect(page.getByRole('cell', { name: 'admin', exact: true })).toBeVisible()
    await page.getByTestId('dialog-close').click()
  })

  await test.step('Open the waveform dataset in Data Exploration', async () => {
    await page.getByRole('link', { name: 'Account' }).click()
    await page.getByRole('button', { name: 'Switch to ATLAS' }).click()
    await page.getByRole('link', { name: 'Data Exploration' }).click()

    const dataSource = page.getByTestId('explorations-datasource')
    await expect(dataSource).toBeVisible({ timeout: MINUTE_1 })
    await dataSource.click()
    await page.getByRole('option', { name: CACHE_DATASET_NAME, exact: true }).click()
    await expect(dataSource).toContainText(CACHE_DATASET_NAME, { timeout: MINUTE_2 })
  })

  await test.step('Verify waveform filter cards in Data Exploration', async () => {
    await page.getByTestId('explorations-new-btn').click()
    await expect(page.locator('.loading-animation-component')).toBeHidden({ timeout: MINUTE_2 })
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await expect(page.getByRole('menuitem', { name: 'Waveform Occurrence' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Waveform Registry' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'Waveform Occurrence' }).click()
    await expect(page.locator('#pane-left')).toContainText('Waveform Occurrence')
  })

})
