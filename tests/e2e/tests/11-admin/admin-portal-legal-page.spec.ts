import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  await page.goto('/portal')
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
    .filter({ hasText: /^Overview descriptionConfigure overview description textConfigure$/ })
    .getByTestId('button')
    .click()
  if ((await page.getByText('Display Terms Of Use').isChecked()) === false) {
    await page.getByText('Display Terms Of Use').click()
  }
  if ((await page.getByText('Display Privacy Policy').isChecked()) === false) {
    await page.getByText('Display Privacy Policy').click()
  }
  if ((await page.getByText('Display Imprint').isChecked()) === false) {
    await page.getByText('Display Imprint').click()
  }
  await expect(page.getByText('Display Imprint')).toBeChecked()
  await expect(page.getByText('Display Terms Of Use')).toBeChecked()
  await expect(page.getByText('Display Privacy Policy')).toBeChecked()
  await page.waitForTimeout(1000)
  if ((await page.getByRole('button', { name: 'Save' }).isEnabled()) === true) {
    await page.getByRole('button', { name: 'Save' }).click()
  }
  await page.waitForTimeout(1000)
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByTestId('button').nth(1).click()
  await expect(page.getByRole('tab', { name: 'Terms of use' })).toBeVisible()
  await page.getByRole('tab', { name: 'Privacy policy' }).click()
  await expect(page.getByRole('tab', { name: 'Privacy policy' })).toBeVisible()
  await page.getByRole('tab', { name: 'Imprint' }).click()
  await expect(page.getByRole('tab', { name: 'Imprint' })).toBeVisible()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible()
})
