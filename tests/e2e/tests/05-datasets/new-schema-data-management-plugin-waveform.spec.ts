import { test, expect } from '../fixtures'
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
  await expect(page.locator('.studyoverview__list tbody tr').first()).toBeVisible({ timeout: MINUTE_2 })
}

// Deletes every dataset row matching the name, so leftovers from earlier failed attempts are removed too
const deleteDatasetsIfPresent = async (page: Page, name: string) => {
  const rows = page.locator('tr', { hasText: name })
  for (let attempt = 0; attempt < 10; attempt++) {
    // The dataset table is already loaded by the caller, so count immediately instead of waiting for a row
    const remaining = await rows.count()
    if (remaining === 0) return
    await rows.first().getByText('Select action').click()
    await page.getByRole('option', { name: 'Delete dataset' }).click()
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
  const identifier = page.locator('input[name="identifier"]')
  const accountButton = page.getByTestId('button').nth(1)
  // Continue as soon as either the login form or the signed-in account button shows up
  await expect(identifier.or(accountButton)).toBeVisible({ timeout: MINUTE_1 })
  if (await identifier.isVisible()) {
    await identifier.fill('admin')
    await page.locator('input[name="password"]').fill('Updatepassword12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
  }
  await accountButton.click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
}

const cleanUpWaveformDatasets = async (page: Page) => {
  await openAdminPortal(page)
  await loadDatasetList(page, () => page.getByRole('link', { name: 'Datasets' }).click())
  // Delete the child (cache) dataset before its parent
  await deleteDatasetsIfPresent(page, CACHE_DATASET_NAME)
  await deleteDatasetsIfPresent(page, DATASET_NAME)
}

// Before each attempt: remove leftovers so the Researcher portal shows exactly one card with our dataset name
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
    await page.getByRole('link', { name: 'Datasets' }).click()
    await page.getByRole('button', { name: 'Add dataset' }).click()
    await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).click()
    await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill(DATASET_NAME)
    await page.getByRole('textbox', { name: 'Dataset summary' }).click()
    await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Test Summary')
    // Use the test ID selector for SimpleMDE editor
    await page.getByTestId('add-study-mde').getByRole('textbox').fill('Test Description')
    await page.getByTestId('dialog').locator('div').filter({ hasText: 'CDM Schema Option' }).nth(4).click()
    await page.getByRole('option', { name: 'Create new schema', exact: true }).click()
    await page.locator('#mui-component-select-databaseOption').click()
    await page.getByRole('option', { name: 'demo_database-postgres' }).click()
    // webapi mode only lists data models starting with "omop", so switch to source mode to make waveform selectable
    await page.locator('#mui-component-select-managementMode').click()
    await page.getByRole('option', { name: 'Source (with cache dataset)' }).click()
    // Uncheck the "Use default result schema name" checkbox to enable custom input
    await page.getByRole('checkbox', { name: /use default result schema name/i }).uncheck()
    await page.getByRole('textbox', { name: 'Result Schema Name' }).fill(`result_schema_${randomString}`)
    await page.locator('#mui-component-select-dataModelOption').click()
    await page.getByRole('option', { name: 'waveform [data_management_plugin]' }).click()
    await page.locator('#mui-component-select-paConfigOption').click()
    await page.getByRole('option', { name: PA_CONFIG_NAME, exact: true }).click()
    await page.getByRole('textbox', { name: 'Token dataset code' }).click()
    await page.getByRole('textbox', { name: 'Token dataset code' }).fill(randomString)
    await page.getByRole('textbox', { name: 'Cache Dataset Name' }).click()
    await page.getByRole('textbox', { name: 'Cache Dataset Name' }).fill(CACHE_DATASET_NAME)
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
    await page.getByRole('link', { name: 'Datasets' }).click()
    // Both the source dataset and its child cache dataset are listed
    await expect(page.locator('tr', { hasText: DATASET_NAME }).first()).toBeVisible({ timeout: MINUTE_2 })
    const cacheRow = page.locator('tr', { hasText: CACHE_DATASET_NAME }).first()
    await expect(cacheRow).toBeVisible({ timeout: MINUTE_2 })
    await cacheRow.getByText('Select action').click()
    await page.getByRole('option', { name: 'Update cache' }).click()
    await expect(page.getByRole('dialog')).toContainText(`Update cache for dataset: ${CACHE_DATASET_NAME}`)
    await page.getByRole('button', { name: 'Run cache update' }).click()
    await expect(page.getByText('Create cache flow triggered')).toBeVisible({ timeout: MINUTE_2 })
    // The cache flow run has no custom name, so open it directly instead of searching the Jobs list
    await page.getByRole('button', { name: 'View flow run' }).click()
    await expect(page).toHaveURL(/\/jobs\/runs\/flow-run\//)
    await expect(page.locator('.state-badge').first()).toHaveText(/Completed/, { timeout: MINUTE_5 })
  })

  await test.step('Grant admin access to the cache dataset', async () => {
    // A newly created dataset is not accessible in Patient Analytics until the user is granted access.
    // The parent is a "source" dataset with no Permissions action; the OMOP cache dataset is the researcher-facing one.
    await page.getByRole('link', { name: 'Datasets' }).click()
    const cacheRow = page.locator('tr', { hasText: CACHE_DATASET_NAME }).first()
    await expect(cacheRow).toBeVisible({ timeout: MINUTE_2 })
    await cacheRow.getByText('Select action').click()
    await page.getByRole('option', { name: 'Permissions' }).click()
    await page.getByRole('tab', { name: 'Access' }).click()
    const addButton = page.getByTestId('dialog').getByTestId('button')
    await expect(addButton).toBeVisible()
    await addButton.click()
    await expect(page.getByRole('menu')).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'admin', exact: true })).toBeVisible()
    await page.getByRole('menuitem', { name: 'admin', exact: true }).click()
    await expect(page.getByRole('cell', { name: 'admin', exact: true })).toBeVisible()
    await page.getByTestId('dialog-close').click()
  })

  await test.step('Open the waveform dataset as a researcher', async () => {
    await page.getByRole('link', { name: 'Account' }).click()
    await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
    // The dataset list renders every card at once, so wait for it and scroll down to ours
    await expect(page.locator('.dataset-card').first()).toBeVisible({ timeout: MINUTE_1 })
    const datasetCard = page
      .locator('.dataset-card')
      .filter({ has: page.locator('.dataset-card__title', { hasText: CACHE_DATASET_NAME }) })
    await expect(datasetCard).toHaveCount(1)
    await datasetCard.scrollIntoViewIfNeeded()
    // The padlock is unlocked once the access granted above is picked up; only reload if it is still locked
    const lockedIcon = datasetCard.locator('.dataset-card__permission-icon--inaccessible')
    const isUnlocked = await expect(lockedIcon)
      .toHaveCount(0, { timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!isUnlocked) {
      await expect(async () => {
        await page.reload()
        await datasetCard.scrollIntoViewIfNeeded()
        await expect(lockedIcon).toHaveCount(0)
      }).toPass({ timeout: MINUTE_2 })
    }
    await datasetCard.click()
  })

  await test.step('Verify waveform filter cards in Patient Analytics', async () => {
    await page.getByRole('link', { name: 'Cohorts' }).click()
    await page.getByTestId('explorations-new-btn').click()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible({ timeout: MINUTE_2 })
    // Filter cards come from the WAVEFORM PA config (mri-pg-config waveformConfigDuckdb.ts)
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await expect(page.getByRole('menuitem', { name: 'Waveform Occurrence' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Waveform Registry' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'Waveform Occurrence' }).click()
    // Filter cards are added to the left pane; the right pane holds the charts
    await expect(page.locator('#pane-left')).toContainText('Waveform Occurrence')
  })
})
