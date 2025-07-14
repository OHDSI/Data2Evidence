import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Datasets' }).click();
  await page.locator('tr', { hasText: 'Demo dataset' }).getByRole('button', { name: 'Select action' }).click()
  await page.getByRole('option', { name: 'Update dataset' }).click();
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Demo dataset updated');
  await page.locator('#simplemde-editor-1-wrapper').getByRole('textbox').fill('Demo dataset updated');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click();
  
  await expect(page.locator('div.dataset-card__summary').filter({ hasText: new RegExp('^Demo dataset updated$') })).toContainText('Demo dataset updated');
  
  await page.getByText('Demo dataset', { exact: true }).click();
  await expect(page.getByRole('paragraph')).toContainText('Demo dataset updated');
});