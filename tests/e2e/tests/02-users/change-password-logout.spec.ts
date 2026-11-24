import type { Page } from '@playwright/test'
import { test, expect, openAtlasAccount, resetPortalSession } from '../fixtures'

const TEST_NAME = 'Change Password and Logout'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

// Every later spec signs in as admin with ORIGINAL_PASSWORD, so this test must
// always leave it in place — even when a step fails half-way.
const ORIGINAL_PASSWORD = 'Updatepassword12345'
const TEMP_PASSWORD = 'Updatepassword123456'

async function signIn(page: Page, password: string) {
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/atlas\//)
}

async function changeOwnPassword(page: Page, oldPassword: string, newPassword: string) {
  await openAtlasAccount(page)
  await page.getByRole('button', { name: 'Change password' }).click()
  await page.getByRole('textbox', { name: 'Old password' }).fill(oldPassword)
  await page.getByRole('textbox', { name: 'New password' }).fill(newPassword)
  await page.getByRole('button', { name: 'Change' }).click()
  await expect(page.getByTestId('dialog-title')).toBeHidden()
}

test(TEST_NAME, async ({ page }) => {
  let passwordChanged = false
  try {
    await page.goto('/d2e/portal')
    await page.locator('input[name="identifier"]').fill('admin')
    await page.locator('input[name="password"]').fill(ORIGINAL_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await openAtlasAccount(page)
    await expect(page.getByRole('main')).toContainText('admin')
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByTestId('dialog-title')).toContainText('Change password')
    await page.getByRole('textbox', { name: 'Old password' }).fill(ORIGINAL_PASSWORD)
    await page.getByRole('button', { name: 'Generate' }).click()
    await expect(page.getByRole('textbox', { name: 'New password' })).not.toHaveValue('')
    await page.getByRole('textbox', { name: 'New password' }).fill(TEMP_PASSWORD)
    await page.getByRole('button', { name: 'Hide password' }).click()
    await page.getByRole('button', { name: 'Change' }).click()
    passwordChanged = true
    await expect(page.getByTestId('dialog-title')).toBeHidden()

    // Logout starts a redirect; a bare page.reload() here races it and aborts
    // (net::ERR_ABORTED). resetPortalSession waits for the sign-in form instead.
    await page.getByRole('button', { name: 'Logout' }).click()
    await resetPortalSession(page)
    await signIn(page, TEMP_PASSWORD)

    await changeOwnPassword(page, TEMP_PASSWORD, ORIGINAL_PASSWORD)
    passwordChanged = false
    await page.getByRole('button', { name: 'Logout' }).click()
    await expect.soft(page).toHaveScreenshot({ maxDiffPixelRatio: 0.05 })
  } finally {
    if (passwordChanged) {
      // Restore so one failure here does not fail every later admin sign-in.
      try {
        await resetPortalSession(page)
        await signIn(page, TEMP_PASSWORD)
        await changeOwnPassword(page, TEMP_PASSWORD, ORIGINAL_PASSWORD)
      } catch (restoreError) {
        console.error(`[${TEST_NAME}] could not restore admin password:`, restoreError)
      }
    }
  }
})
