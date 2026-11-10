import { test, expect, openAdminPortalFromAtlas } from '../fixtures'

test('Switch to admin portal', async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await openAdminPortalFromAtlas(page)

  await expect(page.getByRole('heading')).toContainText('Users')
  await expect(page.getByTestId('button')).toContainText('Add user')
})
