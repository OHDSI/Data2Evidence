import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

test('test', async ({ page }) => {
  await page.goto('https://localhost:443/sign-in');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="identifier"]').press('Tab');
  await page.getByRole('button').filter({ hasText: /^$/ }).press('Tab');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('https://localhost:443/portal/researcher');
  await page.getByText('Demo dataset updated').click();
  await page.getByRole('link', { name: 'Cohorts' }).click();
  await page.getByRole('button', { name: 'Atlas' }).click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('button', { name: 'Accept' }).click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByText('New Cohort').click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).press('ControlOrMeta+a');
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).fill('testcohort_atlas');
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('button', { name: '' }).click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().locator('a').filter({ hasText: 'Back to Cohorts' }).click();
  await expect(page.locator('#pane-left')).toContainText('testcohort_atlas');
  await expect(page.locator('#pane-left')).toContainText('Atlas Cohort Definition');
});