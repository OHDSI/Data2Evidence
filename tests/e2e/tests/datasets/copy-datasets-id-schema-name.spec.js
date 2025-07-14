import { test, expect } from '@playwright/test';

test('copy-dataset-id-schema-name', async ({ page }) => {
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

  // Click button for dataset ID and schema name
  const dataset_id = await page.locator('button.alp-icon-button--icon-only').first().locator('xpath=ancestor::td').textContent();
  const schema_name = await page.locator('button.alp-icon-button--icon-only').nth(1).locator('xpath=ancestor::td').textContent();

  // Check if the cell contains the dataset ID and schema name
  await expect(page.locator('tbody')).toContainText(dataset_id);
  await expect(page.locator('tbody')).toContainText(schema_name);
});

