import { test, expect } from '@playwright/test';

test('Researcher portal, data quality stats', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForTimeout(5000)
  await page.locator('div.dataset-card__title').filter({ hasText: new RegExp('^Demo dataset$') }).click();  

  await page.getByRole('tab', { name: 'Data Quality' }).click();
  await expect(page.getByTestId('card-content')).toContainText('Corrected pass percentage for NA and Errors: 94% (886/943).');
});