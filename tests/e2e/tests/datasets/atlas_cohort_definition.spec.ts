// import { test, expect } from '@playwright/test';

// TODO: The test case in the manual test suite is not relevant, as the old Atlas is not available in the D2E setup.

// test('test', async ({ page }) => {
//   await page.goto('https://localhost:443/portal');
//   await page.locator('input[name="identifier"]').fill('admin');
//   await page.locator('input[name="password"]').fill('Updatepassword12345');
//   await page.getByRole('button', { name: 'Sign in' }).click();

//   await page.waitForTimeout(5000)
//   await page.locator('div.dataset-card__title').filter({ hasText: new RegExp('^Demo dataset$') }).click();  

//   await page.getByRole('link', { name: 'Cohorts' }).click();
//   await page.getByRole('button', { name: 'Atlas' }).click();

//   await page.waitForTimeout(10000)
//   await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('button', { name: 'Accept' }).click();
//   await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByText('New Cohort').click();
//   await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).click();
//   await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).fill('testcohort_atlas');
//   await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByTitle(new RegExp('^Save$')).click();
//   await page.locator('iframe[title="Atlas Lite"]').contentFrame().locator('a').filter({ hasText: 'Back to Cohorts' }).click();
//   await expect(page.locator('#pane-left')).toContainText('testcohort_atlas');
//   await expect(page.locator('#pane-left')).toContainText('Atlas Cohort Definition');
// });