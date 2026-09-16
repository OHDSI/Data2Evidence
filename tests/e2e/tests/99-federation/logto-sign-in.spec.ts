import { test, expect } from '../fixtures'

// Runs only in the federation job, which starts a Logto-era installation and
// upgrades it. The regular e2e job has no Logto and skips this file.
test.skip(!process.env.D2E_LOGTO_FEDERATION, 'set D2E_LOGTO_FEDERATION to run')

test('an existing Logto user signs in through trex and keeps their dataset access', async ({ page }) => {
  await page.goto('/d2e/portal')

  // trex's login page, offering Logto.
  await page.waitForURL(/\/d2e-login\//)
  await page.getByRole('link', { name: 'Sign in with Logto' }).click()

  // Logto's own sign-in form (same selectors the Logto-era tests used).
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Back in the portal as the migrated user, with the demo dataset still granted.
  await page.waitForURL(/\/d2e\/portal/)
  await expect(page.getByText('Demo dataset').first()).toBeVisible()
})
