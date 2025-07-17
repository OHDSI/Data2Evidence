import { test, expect } from '@playwright/test';

test('add-delete-user', async ({ page }) => {
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

  console.log('Go to Users')
  await page.getByRole('link', { name: 'Users' }).click();

  console.log('Add user')
  await expect(page.getByTestId('button')).toBeVisible();
  await page.getByTestId('button').click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('test_user');
  await page.getByRole('button', { name: 'Generate' }).click();
  await page.getByRole('button', { name: 'Hide password' }).click();
  await page.getByRole('button', { name: 'Show password' }).click();
  await page.getByRole('button', { name: 'Add' }).click();
  console.log('Check if user is added')
  await page.waitForTimeout(3000);
  await expect(page.getByRole('cell', { name: 'test_user' })).toBeVisible();

  console.log('Delete user')
  await page.getByRole('button', { name: 'Delete' }).nth(1).click();
  await page.getByRole('button', { name: 'Yes, delete' }).click();
  console.log('Check if user is deleted')
  await page.reload();
  await page.waitForTimeout(3000);
  await expect(page.getByRole('cell', { name: 'test_user' })).not.toBeVisible();
});