import { test, expect, openAdminPortalFromAtlas, cleanupTestDataflows } from '../fixtures'

test.afterEach(async ({ page }) => {
  await cleanupTestDataflows(page, [/^testflow(?:_|$)/])
})

test('Delete specific version of ui-flow', async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'ETL' }).click()
  const flowName = `testflow_${Date.now()}`

  const firstFlowButton = page.getByRole('button', { name: 'Create your first dataflow' })
  const createNewButton = page.getByLabel('Create new dataflow').getByRole('button')
  await expect(firstFlowButton.or(createNewButton)).toBeVisible()
  if (await firstFlowButton.isVisible()) {
    await firstFlowButton.click()
  } else {
    await createNewButton.click()
  }
  await page.getByRole('textbox', { name: 'Name' }).fill(flowName)
  await page.getByRole('button', { name: 'Create' }).click()

  let nodeTypeDialog = page.getByRole('dialog').filter({ hasText: 'Select node type' })
  await expect(nodeTypeDialog).toBeVisible()
  await nodeTypeDialog.getByText('Python', { exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  let saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
  await expect(saveDialog).toBeVisible()
  await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill('init 1')
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).not.toBeVisible()
  await expect(page.getByText('Up to Date')).toBeVisible()
  await page.getByRole('button', { name: 'Add node' }).click()

  nodeTypeDialog = page.getByRole('dialog').filter({ hasText: 'Select node type' })
  await expect(nodeTypeDialog).toBeVisible()
  await nodeTypeDialog.getByText('SQL', { exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
  await expect(saveDialog).toBeVisible()
  await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill('init 2')
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).not.toBeVisible()
  await expect(page.getByText('Up to Date')).toBeVisible()

  await page.getByLabel('Show version history').getByRole('button').click()
  await page.getByRole('button', { name: 'Delete' }).first().click()
  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByRole('list')).toContainText('Version #2')
  await expect(page.getByRole('list')).toContainText('Version #1')
  await page.getByRole('button', { name: 'close' }).click()

  await page.getByLabel('Delete flow').getByRole('button').click()
  await page.getByRole('textbox').click()
  await page.getByRole('textbox').fill(flowName)
  const deleteResponsePromise = page.waitForResponse(
    response => response.request().method() === 'DELETE' && response.url().includes('/d2e/jobplugins/dataflow/')
  )
  await page.getByRole('button', { name: 'Delete' }).click()
  expect((await deleteResponsePromise).ok()).toBeTruthy()
})
