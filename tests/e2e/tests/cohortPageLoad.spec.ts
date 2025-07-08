import { test, expect } from '@playwright/test';

test('cohortPageLoad', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Demo dataset').nth(1).click();
  await page.getByRole('link', { name: 'Cohorts' }).click();
  await expect(page.getByText('Create Cohort:')).toBeVisible({timeout: 30000});
  await expect(page.getByText('D2E')).toBeVisible();
  await expect(page.getByText('Atlas')).toBeVisible();
  await expect(page.getByText('Import')).toBeVisible();
  await expect(page.getByText('Shared')).toBeVisible();
  await expect(page.getByText('Compare')).toBeVisible();
});
