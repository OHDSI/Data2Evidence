import { test, expect } from '@playwright/test'

test.skip('change-password', async ({ page }) => {
  console.log('Sign in')
  await page.goto(`https://localhost:443/portal`)
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  console.log('Switch to admin portal')
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  console.log('Change to new password')
  await page.getByRole('row', { name: 'admin Viewer Admin User Admin' }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Newpassword12345')
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByTestId('snackbar-message')).toContainText('Password updated')
  await page.getByTestId('dialog-close').click()

  console.log('Verify by login with new password')
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Newpassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()

  console.log('Clean up')
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('row', { name: 'admin Viewer Admin User Admin' }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByTestId('snackbar-message')).toContainText('Password updated')
  await page.getByTestId('dialog-close').click()
})
