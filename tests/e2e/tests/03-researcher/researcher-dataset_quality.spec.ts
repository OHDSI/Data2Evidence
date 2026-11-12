import { test, expect, acceptAtlasLicense } from '../fixtures'

test('Researcher portal, data quality stats', async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await acceptAtlasLicense(page)

  await page.getByRole('button', { name: /Demo dataset.*Have access/ }).click()
  await page.getByTestId('datasource-sidebar-plugin:data-quality:dashboard').click()
  await expect(page.getByText('Overall pass rate')).toBeVisible()
  await expect(page.getByText(/Corrected pass rate 9[45]%/)).toBeVisible()
  await expect(page.getByText(/[\d,]+ of [\d,]+ checks/)).toBeVisible()
})
