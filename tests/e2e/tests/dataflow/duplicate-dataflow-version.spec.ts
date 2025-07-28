import { test, expect } from '@playwright/test'

test('duplicate-dataflow-version', async ({ page }) => {
  const timestamp = Date.now()
  const dataflowName = `TestDataflow_${timestamp}`
  const version2Name = `${dataflowName}_v2`
  const duplicateName = `${version2Name}_duplicate`

  // Step 1: Navigate to portal
  await page.goto('https://localhost:443/portal')
  await page.screenshot({ path: `test-results/step01-portal-loaded-${timestamp}.png`, fullPage: true })

  // Step 2: Fill credentials
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.screenshot({ path: `test-results/step02-credentials-filled-${timestamp}.png`, fullPage: true })

  // Step 3: Sign in
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.screenshot({ path: `test-results/step03-signed-in-${timestamp}.png`, fullPage: true })

  // Step 4: Click dataset button
  await page.getByTestId('button').nth(1).click()
  await page.screenshot({ path: `test-results/step04-dataset-clicked-${timestamp}.png`, fullPage: true })

  // Step 5: Switch to Admin portal
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.screenshot({ path: `test-results/step05-admin-portal-${timestamp}.png`, fullPage: true })

  // Step 6: Click ETL link
  await page.getByRole('link', { name: 'ETL' }).click()
  await page.screenshot({ path: `test-results/step06-etl-clicked-${timestamp}.png`, fullPage: true })

  // Step 7: Wait for ETL page to fully load
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `test-results/step07-etl-loaded-${timestamp}.png`, fullPage: true })

  // Step 8: Wait for and click Create new dataflow button
  await expect(page.getByLabel('Create new dataflow').getByRole('button')).toBeVisible({ timeout: 30000 })
  await page.screenshot({ path: `test-results/step08-create-button-visible-${timestamp}.png`, fullPage: true })
  await page.getByLabel('Create new dataflow').getByRole('button').click()
  await page.screenshot({ path: `test-results/step09-create-button-clicked-${timestamp}.png`, fullPage: true })
  // Step 10: Fill in dataflow details
  await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
  await page.getByRole('textbox', { name: 'Comment' }).fill('Test dataflow')
  await page.screenshot({ path: `test-results/step10-dataflow-details-filled-${timestamp}.png`, fullPage: true })

  // Step 11: Create the dataflow
  await page.getByRole('button', { name: 'Create' }).click()
  await page.screenshot({ path: `test-results/step11-dataflow-created-${timestamp}.png`, fullPage: true })

  // Step 12: Add Python node
  await page.getByText('Python').first().click()
  await page.screenshot({ path: `test-results/step12-python-node-added-${timestamp}.png`, fullPage: true })

  // Step 13: Wait for Save button to be visible
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  await page.screenshot({ path: `test-results/step13-save-button-visible-${timestamp}.png`, fullPage: true })

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
