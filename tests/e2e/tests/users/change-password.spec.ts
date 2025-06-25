import { test, expect } from '@playwright/test'

test('change-password', async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Change to new password
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('row', { name: 'admin Viewer Admin User Admin' }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Newpassword12345')
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByTestId('snackbar-message')).toContainText('Password updated')
  await page.getByTestId('dialog-close').click()

  // Verify by login with new password
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Newpassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()

  // Reset to existing password
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('row', { name: 'admin Viewer Admin User Admin' }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByTestId('snackbar-message')).toContainText('Password updated')
  await page.getByTestId('dialog-close').click()
})
