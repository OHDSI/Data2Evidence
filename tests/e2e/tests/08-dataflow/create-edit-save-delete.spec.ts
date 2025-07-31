import { test, expect } from '@playwright/test'

const TEST_NAME = 'dataflow-create-edit-save-delete'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Create dataflow
  await page.getByRole('link', { name: 'ETL' }).click()
  await page.getByText('Create your first dataflow').click()
  await page.getByRole('textbox', { name: 'Name' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('TestDE')
  await page.getByRole('textbox', { name: 'Comment' }).click()
  await page.getByRole('textbox', { name: 'Comment' }).fill('DE Testing')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.getByText('PythonStableRun python code.').click()
  await expect(page.getByRole('button', { name: 'TestDE' })).toBeVisible()
  await page.getByRole('button', { name: 'TestDE' }).click()
  await expect(page.getByRole('option', { name: 'TestDE' })).toBeVisible()
  await page.getByRole('option', { name: 'TestDE' }).click()

  // Edit python node
  await page.getByText('python_node_0').first().hover()
  await page.getByText('python_node_0').first().locator('..').locator('svg').nth(1).click() // Click edit button
  await page.locator('d4l-input').filter({ hasText: 'Name' }).getByPlaceholder(' ').click()
  await page.locator('d4l-input').filter({ hasText: 'Name' }).getByPlaceholder(' ').fill('test_python_node')
  await page.locator('d4l-input').filter({ hasText: 'Description' }).getByPlaceholder(' ').click()
  await page.locator('d4l-input').filter({ hasText: 'Description' }).getByPlaceholder(' ').fill('testing')
  // Update python code block
  await page.getByText('def exec(myinput): return "').click()
  await page
    .getByRole('textbox', { name: 'Editor content;Press Alt+F1' })
    .fill('def exec(myinput):\n  return "success"\ndef test_exec(myinput):\n  return "This is test_exec function"')

  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Save dataflow
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button').filter({ hasText: /^$/ }).click()
  await page.getByRole('textbox', { name: 'Name' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Test_DE')
  await page.getByRole('textbox', { name: 'Describe your changes' }).click()
  await page.getByRole('textbox', { name: 'Describe your changes' }).fill('Test_DE for testing')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: 'Test_DE' })).toBeVisible()
  await page.getByLabel('Show version history').getByRole('button').click()
  await expect(page.getByText('Version history of "Test_DE"')).toBeVisible()
  await expect(page.getByText('Version #2')).toBeVisible()
  await expect(page.getByText('Test_DE for testing')).toBeVisible()
  await page.getByRole('button', { name: 'close' }).click()

  // Delete dataflow
  await page.getByLabel('Delete flow').getByRole('button').click()
  await page.getByRole('textbox').click()
  await page.getByRole('textbox').fill('Test_DE')
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Create your first dataflow')).toBeVisible() // Ensure cleanup
})
