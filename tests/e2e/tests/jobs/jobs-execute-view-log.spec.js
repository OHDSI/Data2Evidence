import { test, expect } from '@playwright/test';

test('jobs-execute-view-log-and-result', async ({ page }) => {

  // Jobs: Execute Job - Create DQD job with name dqd_demo
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Datasets' }).click();
  await expect(page.getByRole('cell', { name: 'Demo dataset' })).toBeVisible();
  const value = await page.getByRole('cell').nth(1).textContent();
  await page.getByRole('link', { name: 'Jobs' }).click();
  await expect(page.getByRole('button', { name: 'Jobs' })).toBeVisible();
  await page.getByRole('button', { name: 'Jobs' }).click();
  await page.getByRole('searchbox', { name: 'Search deployments' }).click();
  await page.getByRole('searchbox', { name: 'Search deployments' }).fill('dqd');
  await expect(page.getByRole('link', { name: 'dqd_plugin' }).first()).toBeVisible();
  await page.getByRole('row', { name: 'dqd_plugin dqd_plugin Ready' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Custom run' }).click();
  await page.locator('input[type="text"]').click();
  await page.locator('input[type="text"]').fill('dqd_demo');
  await page.locator('.p-textarea__control').first().click();
  await page.locator('.p-textarea__control').first().fill(value);
  await page.locator('div:nth-child(3) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').click();
  await page.locator('div:nth-child(3) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').fill('demo_cdm');
  await page.locator('div:nth-child(4) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').click();
  const date = new Date();
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  let currentDate = `${year}-${month}-${day}`;
  await page.locator('div:nth-child(4) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').fill(currentDate);
  await page.locator('div:nth-child(5) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').click();
  await page.locator('div:nth-child(5) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').fill('demo_database');
  await page.locator('div:nth-child(7) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').click();
  await page.locator('div:nth-child(7) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').fill('demo_cdm');
  await page.locator('div:nth-child(8) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').click();
  await page.locator('div:nth-child(8) > .p-label__body > .schema-form-property__fields > .p-base-input > .p-textarea__control').fill('5.3');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Job Runs' }).click();
  await expect(page.getByRole('heading', { name: 'Job Runs' })).toBeVisible();
  await expect(page.locator('.p-content > .p-content')).toBeVisible();
  await page.getByText('data_quality_dashboard').first().waitFor({ state: 'visible' });
  await expect(page.getByRole('link', { name: 'dqd_demo' }).first()).toBeVisible();
  
  // Jobs: View Logs - Check job logs for job: dqd_demo
  await page.waitForTimeout(50000);
  await page.getByRole('link', { name: 'dqd_demo' }).first().click();
  await page.waitForTimeout(5000);
  await page.getByText('Logs', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('Logs', { exact: true }).click();
  const logsPage = await page.locator('pre');
  await logsPage.scrollIntoViewIfNeeded();
  await expect(page.getByText('Worker \'prefect-docker-worker')).toBeVisible();

  // Jobs: View Results - View results for job dqd_demo
  await page.getByText('Job RunsJobsBlocksVariables', { timeout: 1000 }).scrollIntoViewIfNeeded();
  await page.getByText('Completed', { exact: true }).waitFor({ state: 'visible', timeout: 300000 });
  await page.getByRole('button', { name: 'View Results' }).waitFor({ state: 'visible', timeout: 300000 });
  await page.getByRole('button', { name: 'View Results' }).click();
  await expect(page.locator('.loading-animation-component')).not.toBeVisible();
  await expect(page.getByTestId('dialog-title')).toHaveText(/Results for dataset: demo_cdm .+/);
  await expect(page.getByRole('dialog')).toHaveText(/.+1047 out of 1933 passed checks are Not Applicable, due to empty tables or fields.+/);
});