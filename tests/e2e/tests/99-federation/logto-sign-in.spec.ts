import { test, expect } from '../fixtures'

// Runs only in the federation job, which starts a Logto-era installation and
// upgrades it. The regular e2e job has no Logto and skips this file.
test.skip(!process.env.D2E_LOGTO_FEDERATION, 'set D2E_LOGTO_FEDERATION to run')

test('an existing Logto user signs in through trex and keeps their dataset access', async ({ page }) => {
  await page.goto('/d2e/portal')

  // Logto is the only way in here, so trex's sign-in page forwards the browser
  // to it rather than waiting for a click, and Logto's own form comes next.
  // (Same selectors the Logto-era tests used.)
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Back in the portal as the migrated user, with the demo dataset still granted.
  await page.waitForURL(/\/d2e\/portal/)
  await expect(page.getByText('Demo dataset').first()).toBeVisible()
})

test('the sign-in page still offers Logto when the redirect is opted out of', async ({ page }) => {
  // `manual` is the only way to reach the page itself once it forwards, so
  // without this nothing would catch the button breaking.
  await page.goto('/d2e-login/?manual')
  await expect(page.getByRole('link', { name: 'Sign in with Logto' })).toBeVisible()
  // Users carried over from Logto have no trex password, so the form stays hidden.
  await expect(page.locator('#form')).toBeHidden()
})
