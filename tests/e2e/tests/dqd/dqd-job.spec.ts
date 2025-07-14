import { test, expect } from '@playwright/test';

test('dqd_job', async ({ page }) => {
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

  console.log('Go to Jobs')
  await page.getByRole('link', { name: 'Jobs' }).click();

  console.log('Filter by dqd_plugin')
  await page.getByRole('button', { name: 'All flows' }).click();
  await page.getByRole('option', { name: 'dqd_plugin' }).click();
  await page.locator('div').filter({ hasText: /^Flowsdqd_plugin\+0$/ }).locator('svg').nth(1).click();

  console.log('Check if dqd_plugin deployment tag is visible')
  await expect(page.getByText('Deployment dqd_pluginWork')).toBeVisible();
});