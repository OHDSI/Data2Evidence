import { test, expect } from '@playwright/test';

test('dataset-id-schema-name-copy', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('card-content').first().click();
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Datasets' }).click();
  const dataset_id = await page.getByRole('cell').nth(1).textContent();
  const schema_name = await page.getByRole('cell').nth(3).textContent();
  await expect(page.locator('tbody')).toContainText(dataset_id);
  await expect(page.locator('tbody')).toContainText(schema_name);
});

