import { test, expect } from '@playwright/test'

test.skip('attribute-display', async ({ page }) => {
  console.log('Sign in')
  await page.goto(`https://localhost:443/portal`)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  console.log('Switch to admin portal')
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  console.log('Open metadata configuration')
  await page.getByRole('link', { name: 'Setup' }).click()
  const metadataDiv = page.locator('div').filter({ hasText: /^MetadataConfigure dataset metadata and tagsConfigure$/ })
  await metadataDiv.getByTestId('button').click()

  await page.waitForTimeout(1000) // Wait for the metadata table to load
  const attributeRow = page.getByRole('row', { name: 'test_display Test Display' }).getByRole('button')
  if ((await attributeRow.count()) > 0) {
    console.log('Delete existing attribute')
    await attributeRow.nth(1).click()
    await page.getByRole('button', { name: 'Delete' }).click()
  }

  console.log('Add attribute')
  await page.getByRole('button', { name: 'Add Attribute' }).click()
  await page.getByRole('textbox', { name: 'Attribute Id' }).fill('test_display')
  await page.getByRole('textbox', { name: 'Attribute Name' }).fill('Test Display')
  await page.getByRole('button', { name: 'Save' }).click()

  console.log('Verify attribute creation')
  expect(page.locator('.metadata-attribute-table__table')).toContainText('test_display')
  expect(page.locator('.metadata-attribute-table__table')).toContainText('Test Display')

  console.log('Use attribute in dataset')
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.waitForTimeout(3000) // Wait for the datasets table to load
  await page.getByRole('button', { name: 'Select action' }).click()
  await page.getByRole('option', { name: 'Update dataset' }).click()
  await page.getByRole('button', { name: 'add metadata' }).click()
  await page.getByLabel('', { exact: true }).nth(2).click()
  await page.getByRole('option', { name: 'Test Display' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Test DisplayValue$/ })
    .getByPlaceholder(' ')
    .fill('Test value')
  await page.getByRole('button', { name: 'Save' }).click()

  console.log('Switch to researcher portal')
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()

  console.log('Open dataset and verify attribute display')
  await page.getByText('Demo dataset').first().click()
  await expect(page.locator('tbody')).toContainText('Test Display')
  await expect(page.locator('tbody')).toContainText('Test value')

  console.log('Switch to admin portal')
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  console.log('Delete attribute')
  await page.getByRole('link', { name: 'Setup' }).click()
  await metadataDiv.getByTestId('button').click()
  await page.getByRole('row', { name: 'test_display Test Display' }).getByRole('button').nth(1).click()
  await page.getByRole('button', { name: 'Delete' }).click()

  console.log('Verify attribute deletion')
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Select action' }).click()
  await page.getByRole('option', { name: 'Update dataset' }).click()
  await expect(page.getByRole('option', { name: 'Test Display' })).not.toBeVisible()
  await expect(page.getByRole('option', { name: 'Test value' })).not.toBeVisible()
})
