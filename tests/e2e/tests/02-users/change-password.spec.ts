import { test, expect } from '../fixtures'

const TEST_NAME = 'change-password'
// An administrator resetting another user's password needs the identity
// provider's admin endpoint, which the pinned image does not yet serve. Re-enable
// once the base image carries it.
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Switch to admin portal
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Change to new password
  await page.getByRole('row', { name: 'admin Viewer Admin User Admin' }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Newpassword12345')
  await page.getByRole('button', { name: 'Change' }).click()
  await expect(page.getByTestId('alert-message')).toContainText('admin password has been updated successfully')
  await expect(page.getByTestId('dialog-title')).toBeHidden()

  // Verify by login with new password
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Newpassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()

  // Clean up
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('row', { name: 'admin Viewer Admin User Admin' }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Change' }).click()
  await expect(page.getByTestId('alert-message')).toContainText('admin password has been updated successfully')
  await expect(page.getByTestId('dialog-title')).toBeHidden()
})
