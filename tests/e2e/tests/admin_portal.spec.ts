import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

test('test', async ({ page }) => {
  await page.goto('https://localhost:443/sign-in');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="identifier"]').press('Tab');
  await page.getByRole('button').filter({ hasText: /^$/ }).press('Tab');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('https://localhost:41100/portal/researcher');
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await expect(page.getByRole('heading')).toContainText('Users');
  await expect(page.getByTestId('button')).toContainText('Add user');
});