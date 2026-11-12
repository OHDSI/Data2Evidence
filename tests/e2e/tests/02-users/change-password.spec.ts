import { test, expect, openAdminPortalFromAtlas, resetPortalSession } from '../fixtures'

const TEST_NAME = 'change-password'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/atlas\//)
  await page.getByRole('button', { name: /admin/i }).waitFor({ state: 'visible' })

  // Switch to admin portal
  await openAdminPortalFromAtlas(page)

  // Change to new password
  await page.getByRole('row', { name: 'admin Viewer Admin User Admin' }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Newpassword12345')
  await page.getByRole('button', { name: 'Change' }).click()
  await expect(page.getByTestId('alert-message')).toContainText('admin password has been updated successfully')
  await expect(page.getByTestId('dialog-title')).toBeHidden()
  const accountLink = page.getByRole('link', { name: 'Account' })
  await expect(accountLink).toBeVisible()
  await accountLink.click()
  await expect(page).toHaveURL(/\/d2e\/portal\/(?:atlas|systemadmin)\/account/)

  // Verify by signing in again after logout.
  await page.getByRole('button', { name: 'Logout' }).click()
  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Newpassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/atlas\//)
  const licenseDialog = page.getByRole('dialog', { name: 'License Agreement' })
  const acceptDisclaimer = licenseDialog.getByRole('button', { name: 'Accept', exact: true })
  try {
    await acceptDisclaimer.waitFor({ state: 'visible', timeout: 10000 })
    await acceptDisclaimer.click()
    await licenseDialog.waitFor({ state: 'hidden' })
  } catch {
    // The license dialog is only shown on first use.
  }
  await page.getByRole('button', { name: /admin/i }).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('heading', { name: 'Users' }).waitFor({ state: 'visible' })

  // Clean up
  await page.getByRole('row', { name: 'admin Viewer Admin User Admin' }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Change' }).click()
  await expect(page.getByTestId('alert-message')).toContainText('admin password has been updated successfully')
  await expect(page.getByTestId('dialog-title')).toBeHidden()
})
