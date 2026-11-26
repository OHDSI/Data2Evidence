import { test, expect, openAdminPortalFromAtlas, cleanupTestDataflows } from '../fixtures'

const TEST_NAME = 'dataflow-create-edit-save-delete'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test.afterEach(async ({ page }) => {
  await cleanupTestDataflows(page, [/^TestDE_/])
})

test(TEST_NAME, async ({ page }) => {
  const dataflowName = `TestDE_${Date.now()}`
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await cleanupTestDataflows(page, [/.*/])

  // Create dataflow
  await page.getByRole('link', { name: 'ETL' }).click()
  const firstFlowButton = page.getByRole('button', { name: 'Create your first dataflow' })
  await expect(firstFlowButton).toBeVisible()
  await firstFlowButton.click()
  await page.getByRole('textbox', { name: 'Name' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
  await page.getByRole('textbox', { name: 'Comment' }).click()
  await page.getByRole('textbox', { name: 'Comment' }).fill('DE Testing')
  await page.getByRole('button', { name: 'Create' }).click()
  const nodeTypeDialog = page.getByRole('dialog').filter({ hasText: 'Select node type' })
  await expect(nodeTypeDialog).toBeVisible()
  await nodeTypeDialog.getByText('Python', { exact: true }).click()

  // Edit python node
  await page.getByText('python_node_0').first().hover()
  await page.getByText('python_node_0').first().locator('..').locator('.node__setting:not(.node__delete)').click() // Click edit button
  await page.locator('d4l-input').filter({ hasText: 'Name' }).getByPlaceholder(' ').click()
  await page.locator('d4l-input').filter({ hasText: 'Name' }).getByPlaceholder(' ').fill('test_python_node')
  await page.locator('d4l-input').filter({ hasText: 'Description' }).getByPlaceholder(' ').click()
  await page.locator('d4l-input').filter({ hasText: 'Description' }).getByPlaceholder(' ').fill('testing')
  // Update python code block
  await page.getByText('def exec(myinput): return "').click()
  await page
    .getByRole('textbox', { name: 'Editor content;Press Alt+F1' })
    .fill('def exec(myinput):\n  return "success"\ndef test_exec(myinput):\n  return "This is test_exec function"')

  // Ensure python node is edited
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('test_python_node')).toBeVisible()

  // Save dataflow
  await page.getByRole('button', { name: 'Save' }).click()
  const saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
  await expect(saveDialog).toBeVisible()
  await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill('Test dataflow for cleanup')
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).not.toBeVisible()
  await page.getByLabel('Show version history').getByRole('button').click()
  await expect(page.getByText(`Version history of "${dataflowName}"`)).toBeVisible()
  await expect(page.getByText('Version #2')).toBeVisible()
  await expect(page.getByText('Test dataflow for cleanup')).toBeVisible()
  await page.getByRole('button', { name: 'close' }).click()

  // Delete dataflow
  await page.getByLabel('Delete flow').getByRole('button').click()
  await page.getByRole('textbox').click()
  await page.getByRole('textbox').fill(dataflowName)
  const deleteResponsePromise = page.waitForResponse(
    response => response.request().method() === 'DELETE' && response.url().includes('/d2e/jobplugins/dataflow/')
  )
  await page.getByRole('button', { name: 'Delete' }).click()
  expect((await deleteResponsePromise).ok()).toBeTruthy()
  await expect(page.getByRole('button', { name: 'Create your first dataflow' })).toBeVisible()
})
