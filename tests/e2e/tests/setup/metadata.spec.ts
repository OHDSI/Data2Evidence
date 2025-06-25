import { test, expect } from '@playwright/test'

test('setup-metadata', async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^MetadataConfigure dataset metadata and tagsConfigure$/ })
    .getByTestId('button')
    .click()

  // Add attribute
  await page.getByRole('button', { name: 'Add Attribute' }).click()
  await page.getByRole('textbox', { name: 'Attribute Id' }).click()
  await page.getByRole('textbox', { name: 'Attribute Id' }).fill('test')
  await page.getByRole('textbox', { name: 'Attribute Name' }).click()
  await page.getByRole('textbox', { name: 'Attribute Name' }).fill('Testing')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()
  // Assert new attribute exists
  await expect(page.getByRole('row', { name: 'test Testing DATASET STRING' })).toBeVisible()

  // Edit attribute
  await page.getByRole('row', { name: 'test Testing DATASET STRING' }).getByRole('button').first().click()
  await page.getByRole('textbox', { name: 'Attribute Name' }).click()
  await page.getByRole('textbox', { name: 'Attribute Name' }).fill('Testing edited')
  await page.getByRole('button', { name: 'Category DATASET' }).click()
  await page.getByRole('option', { name: 'FILE' }).click()
  await page.getByRole('button', { name: 'Datatype STRING' }).click()
  await page.getByRole('option', { name: 'NUMBER' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()
  // Assert attribute has been edited
  await expect(page.getByRole('row', { name: 'test Testing edited FILE NUMBER' })).toBeVisible()

  // Delete attribute
  await page.getByRole('row', { name: 'test Testing edited FILE NUMBER' }).getByRole('button').nth(1).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  // Assert deleted attribute does not exist
  await expect(page.getByRole('row', { name: 'test Testing edited FILE NUMBER' })).not.toBeVisible()
})
