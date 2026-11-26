import { test, expect, openAdminPortalFromAtlas, cleanupTestDataflows } from '../fixtures'

test.afterEach(async ({ page }) => {
  await cleanupTestDataflows(page, [/^TestDataflow_/, /^TestDE_/])
})

test('duplicate-dataflow-version', async ({ page }) => {
  // Authentication
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)

  const timestamp = Date.now()
  const dataflowName = `TestDataflow_${timestamp}`
  const duplicateName = `${dataflowName}_duplicate`

  await page.getByRole('link', { name: 'ETL' }).click()

  // Handle both scenarios: no flows (Create your first dataflow) or existing flows (Create new dataflow)
  const firstFlowButton = page.getByRole('button', { name: 'Create your first dataflow' })
  const createNewButton = page.getByLabel('Create new dataflow').getByRole('button')
  await expect(firstFlowButton.or(createNewButton)).toBeVisible()
  if (await firstFlowButton.isVisible()) {
    await firstFlowButton.click()
  } else {
    await createNewButton.click()
  }
  await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
  await page.getByRole('textbox', { name: 'Comment' }).fill('Test dataflow')
  await page.getByRole('button', { name: 'Create' }).click()

  const nodeTypeDialog = page.getByRole('dialog').filter({ hasText: 'Select node type' })
  await expect(nodeTypeDialog).toBeVisible()
  await nodeTypeDialog.getByText('Python', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()

  // Save as version #2
  await page.getByRole('button', { name: 'Save' }).click()
  const saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
  await expect(saveDialog).toBeVisible()
  await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill('Added Python node')
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).not.toBeVisible()

  await expect(page.getByText('Up to Date')).toBeVisible()

  // Verify version history shows 2 versions
  await page.getByLabel('Show version history').getByRole('button').click()

  await expect(page.getByText(`Version history of "${dataflowName}"`)).toBeVisible()
  await expect(page.getByText('Version #2')).toBeVisible()
  await expect(page.getByText('Version #1')).toBeVisible()

  // Duplicate version #2 (newest version at index 0)
  const version2 = page.getByRole('listitem').filter({ hasText: 'Version #2' })
  await version2.hover()
  await version2.getByRole('button', { name: 'Duplicate' }).click()

  // Edit duplicate name and create
  await expect(page.getByText('Duplicate dataflow')).toBeVisible()
  const nameField = page.getByRole('textbox').first()
  await expect(nameField).toHaveValue(dataflowName)
  await nameField.fill(duplicateName)

  await page.getByRole('button', { name: 'Duplicate' }).click()

  // Verify duplicated dataflow has only 1 version
  await expect(page.getByText(`Version history of "${duplicateName}"`)).toBeVisible()
  await expect(page.getByText('Version #1')).toBeVisible()
  await expect(page.getByText('Version #2')).not.toBeVisible()

  // Close version history and verify Python node was copied
  await page.getByRole('button', { name: 'close' }).click()

  await expect(page.getByText('python_node_0').first()).toBeVisible()

  // Cleanup
  await page.getByLabel('Delete flow').getByRole('button').click()
  await page.getByRole('textbox').fill(duplicateName)
  const deleteResponsePromise = page.waitForResponse(
    response => response.request().method() === 'DELETE' && response.url().includes('/d2e/jobplugins/dataflow/')
  )
  await page.getByRole('button', { name: 'Delete' }).click()
  expect((await deleteResponsePromise).ok()).toBeTruthy()
})
