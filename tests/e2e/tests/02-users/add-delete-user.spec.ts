import { test, expect, openAdminPortalFromAtlas } from '../fixtures'

const TEST_NAME = 'add-delete-user'
const USERNAME = `e2eadd${Date.now().toString().slice(-8)}`
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled`)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  const acceptDisclaimer = page
    .locator('.v-overlay-container')
    .getByRole('button', { name: 'Accept', exact: true })
  try {
    await acceptDisclaimer.waitFor({ state: 'visible', timeout: 5000 })
    await acceptDisclaimer.scrollIntoViewIfNeeded()
    await acceptDisclaimer.click()
  } catch {
    // The license dialog is only shown on first use.
  }

  // Switch to Admin portal
  await openAdminPortalFromAtlas(page)

  // Go to Users
  await page.getByRole('link', { name: 'Users' }).click()

  // Add user
  await expect(page.getByTestId('button')).toBeVisible()
  await page.getByTestId('button').click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME)
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Hide password' }).click()
  await page.getByRole('button', { name: 'Show password' }).click()
  await page.getByRole('button', { name: 'Add' }).click()
  // Check if user is added
  await page.waitForTimeout(5000)
  await page.reload()
  await expect(page.getByRole('cell', { name: USERNAME })).toBeVisible()

  // Delete user
  await page.getByRole('row').filter({ hasText: USERNAME }).getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  // Check if user is deleted
  await page.waitForTimeout(500)
  await page.reload()
  await expect(page.getByRole('cell', { name: USERNAME })).not.toBeVisible()
})
