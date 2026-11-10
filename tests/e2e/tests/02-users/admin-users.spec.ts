import { test, expect, openAdminPortalFromAtlas } from '../fixtures'

test.use({
  ignoreHTTPSErrors: true
})

const TEST_NAME = 'admin-users'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByTestId('button')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'admin', exact: true })).toBeVisible()
})
