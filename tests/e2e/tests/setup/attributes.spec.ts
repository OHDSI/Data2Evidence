import { test, expect } from '@playwright/test'

test.use({
  ignoreHTTPSErrors: true
})

test('attributes', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Add Attribute' }).click()
  await page.getByRole('textbox', { name: 'Attribute Id' }).click()
  await page.getByRole('textbox', { name: 'Attribute Id' }).fill('testattribute')
  await page.getByRole('textbox', { name: 'Attribute Id' }).press('Tab')
  await page.getByRole('textbox', { name: 'Attribute Name' }).fill('testattribute')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('cell', { name: 'testattribute' }).first()).toBeVisible()

  await page.getByRole('row', { name: 'testattribute testattribute' }).getByRole('button').first().click()
  await expect(page.getByTestId('dialog').locator('div').filter({ hasText: 'Attribute Id' }).nth(4)).toBeDisabled()
  await page.getByRole('textbox', { name: 'Attribute Name' }).click()
  await page.getByRole('textbox', { name: 'Attribute Name' }).fill('testattribute-edit')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('cell', { name: 'testattribute-edit' })).toBeVisible()

  await page.getByRole('row', { name: 'testattribute testattribute-' }).getByRole('button').nth(1).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('cell', { name: 'testattribute-edit' })).not.toBeVisible()
})
