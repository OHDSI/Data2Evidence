import { test, expect } from '@playwright/test'

test('duplicate-dataflow-version', async ({ page }) => {
  // Authentication
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  const timestamp = Date.now()
  const dataflowName = `TestDataflow_${timestamp}`
  const version2Name = `${dataflowName}_v2`
  const duplicateName = `${version2Name}_duplicate`

  // Take screenshot before trying to click Create new dataflow button
  await page.screenshot({ path: `test-results/debug-etl-page-${timestamp}.png`, fullPage: true })

  // Navigate to ETL and create new dataflow with Python node
  await page.getByRole('link', { name: 'ETL' }).click()
  await page.getByLabel('Create new dataflow').getByRole('button').click()
  await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
  await page.getByRole('textbox', { name: 'Comment' }).fill('Test dataflow')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.getByText('Python').first().click()
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()

  // Save as version #2
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button').filter({ hasText: /^$/ }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill(version2Name)
  await page.getByRole('textbox', { name: 'Describe your changes' }).fill('Added Python node')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Up to Date')).toBeVisible({ timeout: 10000 })

  // Verify version history shows 2 versions
  await page.getByLabel('Show version history').getByRole('button').click()
  await expect(page.getByText(`Version history of "${version2Name}"`)).toBeVisible()
  await expect(page.getByText('Version #2')).toBeVisible()
  await expect(page.getByText('Version #1')).toBeVisible()

  // Duplicate version #2 (newest version at index 0)
  await page.getByRole('listitem').nth(0).hover()
  await page.getByRole('listitem').nth(0).getByRole('button', { name: 'Duplicate' }).click()

  // Edit duplicate name and create
  await expect(page.getByText('Duplicate dataflow')).toBeVisible()
  const nameField = page.getByRole('textbox').first()
  await expect(nameField).toHaveValue(version2Name)
  await nameField.fill(duplicateName)
  await page.getByRole('button', { name: 'Duplicate' }).click()

  // Verify duplicated dataflow has only 1 version
  await expect(page.getByText(`Version history of "${duplicateName}"`)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Version #1')).toBeVisible()
  await expect(page.getByText('Version #2')).not.toBeVisible()

  // Close version history and verify Python node was copied
  await page.getByRole('button', { name: 'close' }).click()
  await expect(page.getByText('python_node_0').first()).toBeVisible()

  // Cleanup
  await page.getByLabel('Delete flow').getByRole('button').click()
  await page.getByRole('textbox').fill(duplicateName)
  await page.getByRole('button', { name: 'Delete' }).click()
})
