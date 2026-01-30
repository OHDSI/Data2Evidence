import { test, expect } from '../fixtures'

test('Researcher portal, data quality stats', async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForTimeout(5000)
  await page
    .locator('div.dataset-card__title')
    .filter({ hasText: new RegExp('^Demo dataset$') })
    .click()

  await page.getByRole('tab', { name: 'Data Quality' }).click()
  // Check for corrected pass percentage - value may vary slightly based on CDM version
  await expect(page.getByTestId('card-content')).toContainText(
    /Corrected pass percentage for NA and Errors: 9[45]% \(\d+\/\d+\)\./
  )
})
