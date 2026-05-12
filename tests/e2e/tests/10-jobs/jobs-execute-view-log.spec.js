import { test, expect } from '@playwright/test'

const TEST_NAME = 'jobs-execute-view-log-and-result'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
test.describe.configure({ retries: 3 }) // Re-try up to 3 times for flaky tests

test(TEST_NAME, async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  test.setTimeout(300000) // Set timeout to 5 minutes
  // Jobs: Execute Job - Create DQD job with name dqd_demo
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.getByText('Demo dataset')).toBeVisible()
  // Get the dataset ID
  await page.locator('div.alp-text__copy-button-container').nth(2).locator('button.alp-icon-button--icon-only').click()
  const dataset_id = await page.evaluate(async () => await navigator.clipboard.readText())
  // Get the dataset ID
  await page.locator('div.alp-text__copy-button-container').nth(3).locator('button.alp-icon-button--icon-only').click()
  const schema_name = await page.evaluate(async () => await navigator.clipboard.readText())
  await page.getByRole('link', { name: 'Jobs' }).click()
  await expect(page.getByRole('button', { name: 'Jobs' })).toBeVisible()
  await page.getByRole('button', { name: 'Jobs' }).click()
  await page.getByRole('searchbox', { name: 'Search deployments' }).click()
  await page.getByRole('searchbox', { name: 'Search deployments' }).fill('dqd')
  await expect(page.getByRole('link', { name: 'dqd_plugin' }).first()).toBeVisible()
  await page.getByRole('row', { name: 'dqd_plugin dqd_plugin Ready' }).getByRole('button').click()
  await page.getByRole('button', { name: 'Custom run' }).click()
  await page.locator('input[type="text"]').click()
  await page.locator('input[type="text"]').fill('dqd_demo')
  // Jobs: Execute Job - Fill in the DQD job parameters
  // Fill up Datasetid field
  await page.locator('.p-textarea__control').first().click()
  await page.locator('.p-textarea__control').first().fill(dataset_id)
  await page
    .locator('div:nth-child(3) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .click()
  // Fill up Schemaname field
  await page
    .locator('div:nth-child(3) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .fill(schema_name)

  // Fill up Releasedate field
  await page
    .locator('div:nth-child(4) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .click()
  const date = new Date()
  let day = date.getDate()
  let month = date.getMonth() + 1
  let year = date.getFullYear()
  let currentDate = `${year}-${month}-${day}`
  await page
    .locator('div:nth-child(4) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .fill(currentDate)
  // Fill up Databasecode field
  await page
    .locator('div:nth-child(5) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .click()
  await page
    .locator('div:nth-child(5) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .fill('demo_database')
  // Fill up Vocabschemaname field
  await page
    .locator('div:nth-child(7) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .click()
  await page
    .locator('div:nth-child(7) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .fill(schema_name)
  // Fill up Cdmversionnumber field
  await page
    .locator('div:nth-child(8) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .click()
  await page
    .locator('div:nth-child(8) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .fill('5.3')
  // Fill up Resultsschemaname field
  await page
    .locator('div:nth-child(9) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .click()
  await page
    .locator('div:nth-child(9) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control')
    .fill(schema_name)
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByRole('button', { name: 'Job Runs' }).click()
  await expect(page.getByRole('heading', { name: 'Job Runs' })).toBeVisible()
  await expect(page.locator('.p-content > .p-content')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search by flow run name' }).click()
  await page.getByRole('searchbox', { name: 'Search by flow run name' }).fill('dqd_demo')
  await expect(page.getByRole('link', { name: 'dqd_demo' }).first()).toBeVisible({ timeout: 60000 })

  // Jobs: View Logs - Check job logs for job: dqd_demo
  await page.waitForTimeout(50000)
  await page.getByRole('link', { name: 'dqd_demo' }).first().click()
  await page.waitForTimeout(5000)
  await page.locator('li#logs.p-tab.p-tab__active').waitFor({ state: 'visible' })
  await page.locator('li#logs.p-tab.p-tab__active').click()
  const logsPage = await page.locator('pre')
  await logsPage.scrollIntoViewIfNeeded()
  await expect(page.getByText("Worker 'prefect-docker-worker")).toBeVisible()

  // Jobs: View Results - View results for job dqd_demo
  await page.getByText('Job RunsJobsBlocksVariables').scrollIntoViewIfNeeded()
  await page.getByText('Completed', { exact: true }).waitFor({ state: 'visible', timeout: 300000 })
  await page.getByRole('button', { name: 'View Results' }).waitFor({ state: 'visible', timeout: 300000 })
  await page.getByRole('button', { name: 'View Results' }).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page.getByTestId('dialog-title')).toHaveText(/Results for dataset+/)
  await expect(page.getByRole('dialog')).toHaveText(
    /.+\d+(?:,\d+)? out of \d+(?:,\d+)? passed checks are not applicable, due to empty tables or fields.+/
  )
})
