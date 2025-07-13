import { test, expect } from '@playwright/test';

test.skip('example', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Demo dataset').first().click();
  await page.getByRole('link', { name: 'Cohorts' }).click();
  await page.getByRole('button', { name: 'D2E' }).click();
  await page.getByTitle('Basic Data - Gender', { exact: true }).locator('div').nth(1).click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill("MALE");
  await page.locator('#patient').getByText('MALE - MALE').waitFor({ state: 'visible' });
  await page.locator('#patient').getByText('MALE - MALE').click();
  await expect(page.getByText('1321 / 2694')).toBeVisible();
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 });
});
