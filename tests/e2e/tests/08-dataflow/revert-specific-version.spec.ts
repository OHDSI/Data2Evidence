import { test, expect, openAdminPortalFromAtlas, cleanupTestDataflows } from '../fixtures'

test.afterEach(async ({ page }) => {
  await cleanupTestDataflows(page, [/^new_data_flow(?:_|$)/])
})
const TEST_NAME = 'dataflow-revert-specific-version'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  const dataflowName = `new_data_flow_${Date.now()}`
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'ETL' }).click()
  const firstFlowButton = page.getByRole('button', { name: 'Create your first dataflow' })
  const createNewButton = page.getByLabel('Create new dataflow').getByRole('button')
  await expect(firstFlowButton.or(createNewButton)).toBeVisible()
  if (await firstFlowButton.isVisible()) {
    await firstFlowButton.click()
  } else {
    await createNewButton.click()
  }
  await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
  await page.getByRole('button', { name: 'Create' }).click()
  const nodeTypeDialog = page.getByRole('dialog').filter({ hasText: 'Select node type' })
  await expect(nodeTypeDialog).toBeVisible()
  await nodeTypeDialog.getByText('Python', { exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  const saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
  await expect(saveDialog).toBeVisible()
  await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill('version2')
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).not.toBeVisible()
  await page.getByLabel('Show version history').getByRole('button').click()
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Version #1' })
    .getByRole('button', { name: 'View' })
    .click()
  await expect(page.getByRole('combobox', { name: `${dataflowName} (Version #1)` })).toBeVisible()

  await page.getByLabel('Delete flow').getByRole('button').click()
  await page.getByRole('textbox').fill(dataflowName)
  const deleteResponsePromise = page.waitForResponse(
    response => response.request().method() === 'DELETE' && response.url().includes('/d2e/jobplugins/dataflow/')
  )
  await page.getByRole('button', { name: 'Delete' }).click()
  expect((await deleteResponsePromise).ok()).toBeTruthy()
})
