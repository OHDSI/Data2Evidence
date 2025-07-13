import { test, expect } from '@playwright/test';
 
test.skip('Logout', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 });
});

