import { test, expect } from '@playwright/test';

test('dataset-user-permission', async ({ page }) => {
  console.log('Sign in')
  await page.goto(`https://localhost:443/portal`)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  console.log('Switch to Admin portal')
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();

  console.log('Go to Datasets')
  await page.getByRole('link', { name: 'Datasets' }).click();
  await expect(page.getByRole('button', { name: 'Select action' }).first()).toBeVisible();

  console.log('Manage dataset permissions')
  await page.getByRole('button', { name: 'Select action' }).first().click();
  await page.getByRole('option', { name: 'Permissions' }).click();
  await page.getByRole('tab', { name: 'Access' }).click();

  console.log('Grant access to admin user')
  const addButton = page.getByTestId('dialog').getByTestId('button');
  await expect(addButton).toBeVisible();
  console.log('Add button is visible');
  await addButton.click();
  // Wait for 5 seconds to ensure the menu items are visible
  await page.waitForTimeout(5000);
  await expect(page.getByRole('menu')).toBeVisible({ timeout: 10000 });
  console.log('Menu is visible');
  await expect(page.getByRole('menuitem', { name: 'admin' })).toBeVisible({ timeout: 10000 });
  console.log('Admin user is visible');
  await page.getByRole('menuitem', { name: 'admin' }).click();
  await expect(page.getByRole('cell', { name: 'admin' })).toBeVisible({ timeout: 10000 });
  console.log('Admin user is added to the table');

  console.log('Revoke access to admin user')
  await expect(page.getByRole('button', { name: 'Revoke' })).toBeVisible();
  await page.getByRole('button', { name: 'Revoke' }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('snackbar').locator('div').filter({ hasText: 'You\'ve revoked access for' }).first()).toBeVisible();
});