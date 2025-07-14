import { test, expect } from '@playwright/test';

test('Researcher-Dataset information', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByText(new RegExp('^Demo dataset$')).click();
  await expect(page.getByTestId('card-content')).toContainText('Demo dataset');
  await expect(page.getByTestId('select').locator('div')).toContainText('Demo dataset');
});