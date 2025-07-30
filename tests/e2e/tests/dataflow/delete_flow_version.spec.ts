import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'ETL' }).click();
  await page.waitForTimeout(5000);

  await page.locator('div.alp-button__container').filter({ hasText: new RegExp('^Create your first dataflow$') }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('testflow');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.locator('div.node-type-selection__title').filter({ hasText: new RegExp('^Python$') }).click();  
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('textbox', { name: 'Describe your changes' }).fill('init 1');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Add node' }).click();
  
  await page.locator('div.node-type-selection__title').filter({ hasText: new RegExp('^SQL$') }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('textbox', { name: 'Describe your changes' }).fill('init 2');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByLabel('Show version history').getByRole('button').click();
  await page.getByRole('button', { name: 'Delete' }).first().click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('list')).toContainText('Version #2');
  await expect(page.getByRole('list')).toContainText('Version #1');
  await page.getByRole('button', { name: 'close' }).click();

  await page.getByLabel('Delete flow').getByRole('button').click();
  await page.getByRole('textbox').click();
  await page.getByRole('textbox').fill('testflow');
  await page.getByRole('button', { name: 'Delete' }).click();

  await page.waitForTimeout(5000);
  await expect(page.getByRole('main')).toContainText('There is no dataflow to show');
});