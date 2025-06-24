import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

test('test', async ({ page }) => {
  await page.goto('https://localhost:443/sign-in');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('https://localhost:443/portal/researcher');
  await page.getByText('Demo dataset').first().click();
  await page.getByRole('tab', { name: 'Data Quality' }).click();
  await expect(page.getByTestId('card-content')).toContainText('Corrected pass percentage for NA and Errors: 94% (886/943).');
});