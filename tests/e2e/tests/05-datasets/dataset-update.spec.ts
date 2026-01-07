import { test, expect } from '@playwright/test'

const TEST_NAME = 'dataset-update'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  test.setTimeout(300 * 1000)
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
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill('Test_dataset_update')
  await page.getByTestId('add-study-mde').getByRole('textbox').fill('Test Description')
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Dataset Summary')
  await page.getByTestId('dialog').locator('div').filter({ hasText: 'CDM Schema Option' }).nth(4).click()
  await page.getByRole('option', { name: 'Create new schema', exact: true }).click()
  await page.locator('#mui-component-select-databaseOption').click()
  await page.getByRole('option', { name: 'demo_database-postgres' }).click()
  await page.locator('#mui-component-select-vocabSchemaOption').click()
  await page.getByRole('option', { name: 'demo_cdm' }).click()
  // Uncheck the "Use default result schema name" checkbox to enable custom input
  await page.getByRole('checkbox', { name: /use default result schema name/i }).uncheck()
  await page.getByRole('textbox', { name: 'Result Schema Name' }).fill('test_result_schema')
  await page.locator('#mui-component-select-dataModelOption').click()
  await page.getByRole('option', { name: 'omop5-3 [omop_cdm_plugin]' }).click()
  await page.locator('#mui-component-select-paConfigOption').click()
  await page.getByRole('option', { name: 'OMOP', exact: true }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).click()
  const randomToken = Math.random().toString(36).substring(2, 6)
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill(randomToken)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.waitForTimeout(3000)
  await expect(page.getByText('Test_dataset_update').first()).toBeVisible()
  await page.getByRole('link', { name: 'Jobs' }).click()
  // Get the first (top) entry link
  const firstEntry = page
    .locator('.flow-run-list-item')
    .filter({ has: page.locator('a:text("omop_cdm_plugin")') })
    .first()
  // Find the closest state badge to this entry (adjust the selector as needed)
  const stateBadge = firstEntry.locator('.state-badge')
  await expect(stateBadge).toHaveText('Completed', { timeout: 120000 })

  await test.step('Update dataset summary and description', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click()
    await page
      .getByRole('row', { name: /Test_dataset_update/ })
      .filter({ hasText: 'Not Available' })
      .getByRole('button')
      .nth(2)
      .click()
    await page.getByRole('option', { name: 'Update dataset' }).click()
    await page.getByRole('textbox', { name: 'Dataset summary' }).click()
    await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Updated Summary')
    await page.locator('[class="metadata-form-component"]').getByRole('button').first().click()

    await page.getByRole('option', { name: 'Schema Version', exact: true }).click()
    await page.locator('input.input__element.sc-d4l-input').fill('1')
    await page.getByRole('button', { name: 'add metadata' }).click()
    await page.getByLabel('', { exact: true }).nth(1).click()
    await page.getByRole('option', { name: 'Latest Available Schema' }).click()
    await page
      .locator('div')
      .filter({ hasText: /^Latest Available Schema VersionValue$/ })
      .getByPlaceholder(' ')
      .click()
    await page
      .locator('div')
      .filter({ hasText: /^Latest Available Schema VersionValue$/ })
      .getByPlaceholder(' ')
      .fill('2')
    await page.getByRole('button', { name: 'Save' }).click({ timeout: 30000 })
    await page.waitForTimeout(3000)
    await page.reload()
    await expect(
      page.locator('tr').filter({ hasText: 'Test_dataset_update' }).getByRole('cell', { name: '1', exact: true })
    ).toBeVisible()
    await page
      .getByRole('row', { name: /Test_dataset_update/ })
      .getByRole('button')
      .nth(2)
      .click({ timeout: 30000 })
    await page.getByRole('option', { name: 'Update schema' }).click()
    await page.getByRole('button', { name: 'Yes, update' }).click({ timeout: 30000 })
    await page.getByRole('link', { name: 'Jobs' }).click()
    // Get the first (top) entry link
    const firstEntry = page
      .locator('.flow-run-list-item')
      .filter({ has: page.locator('a:has(span:text("datamodel-update-cdm"))') })
      .first()
    // Find the closest state badge to this entry (adjust the selector as needed)
    const stateBadge = firstEntry.locator('.state-badge')
    await expect(stateBadge).toHaveText('Completed', { timeout: 120000 })
  })

  await test.step('Switch to Researcher portal', async () => {
    await page.getByRole('link', { name: 'Account' }).click()
    await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
    // Scroll to the element before clicking, in case it is not in view
    const study1 = page.getByText('Test_dataset_update')
    await expect(page.getByText('Updated Summary').first()).toBeVisible()
    await study1.scrollIntoViewIfNeeded()
    await study1.click()
  })

  await test.step('Switch to admin portal', async () => {
    await page.getByRole('link', { name: 'Account' }).click()
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  })

  await test.step('Create user', async () => {
    await page.getByRole('button', { name: 'Add user' }).click()
    await page.getByRole('textbox', { name: 'Username' }).click()
    await page.getByRole('textbox', { name: 'Username' }).fill('testuser1')
    await page.getByRole('textbox', { name: 'Password' }).click()
    await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
    await page.getByRole('button', { name: 'Add' }).click({ timeout: 30000 })
    // Wait for the user to appear after clicking Add
    await page.waitForTimeout(2000)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'testuser1' })).toBeVisible()
    // await expect(page.getByText('testuser1')).toBeVisible({ timeout: 30000 });
  })

  await test.step('Hide dataset', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click()
    await page
      .getByRole('row', { name: /Test_dataset_update/ })
      .getByRole('button')
      .nth(2)
      .click()
    await page.getByRole('option', { name: 'Update dataset' }).click()
    await page.getByRole('radio', { name: 'Hidden (only researchers and' }).check()
    await page.getByRole('button', { name: 'Save' }).click()
  })

  await test.step('Logout admin', async () => {
    await page.getByRole('link', { name: 'Account' }).click()
    await page.getByRole('button', { name: 'Logout' }).click()
  })

  await test.step('Login as user and check dataset visibility', async () => {
    await page.reload()
    await page.locator('input[name="identifier"]').click()
    await page.locator('input[name="identifier"]').fill('testuser1')
    await page.locator('input[name="password"]').click()
    await page.locator('input[name="password"]').fill('Updatepassword12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Test_dataset_update')).not.toBeVisible()
  })

  await test.step('Logout as researcher and login as admin', async () => {
    await page.getByTestId('button').nth(1).click()
    await page.getByRole('button', { name: 'Logout' }).click()
    await page.locator('input[name="identifier"]').click()
    await page.locator('input[name="identifier"]').fill('admin')
    await page.locator('input[name="password"]').click()
    await page.locator('input[name="password"]').fill('Updatepassword12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.getByTestId('button').nth(1).click()
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  })

  // Cleanup: Delete the user created for testing
  await test.step('Delete test user', async () => {
    const userRow = page.getByRole('row', { name: /testuser1/ })
    await userRow.getByRole('button', { name: 'Delete' }).click()
    // await page.getByRole('button', { name: 'Delete' }).nth(2).click({ timeout: 30000 });
    await page.getByRole('button', { name: 'Yes, delete' }).click({ timeout: 30000 })
    // Wait for the user row to be removed from the table, not just any text
    await expect(page.getByRole('row', { name: /testuser1/ })).not.toBeVisible({ timeout: 20000 }) // Verify user is deleted
  })

  // Cleanup: Delete the datasets created for testing
  await test.step('Delete datasets', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click()
    //Delete Test_dataset_update
    await page
      .getByRole('row', { name: /Test_dataset_update/ })
      .getByRole('button')
      .nth(2)
      .click({ timeout: 30000 })
    await page.getByRole('option', { name: 'Delete dataset' }).click({ timeout: 30000 })
    // Enter dataset name to confirm deletion
    await page.getByRole('textbox', { name: 'Enter dataset name to confirm' }).fill('Test_dataset_update')
    await page.getByRole('button', { name: 'Yes, delete' }).click({ timeout: 30000 })
    // Wait for the deletion to complete before proceeding
    await expect(page.getByRole('row', { name: /Test_dataset_update/ })).not.toBeVisible({ timeout: 20000 })
  })
})
