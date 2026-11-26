import { test, expect, acceptAtlasLicense } from '../fixtures'

test('Researcher-Dataset information', async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await acceptAtlasLicense(page)

  await page.getByRole('button', { name: /Demo dataset.*Have access/ }).click()
  await page.getByRole('listitem').filter({ hasText: 'Description' }).click()
  await expect(page.getByRole('heading', { name: 'Description' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText('Demo dataset')
})
