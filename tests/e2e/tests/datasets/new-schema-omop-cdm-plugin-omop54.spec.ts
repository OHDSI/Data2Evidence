import { test, expect } from '@playwright/test';

test('dataset-new-schema-omop-cdm-plugin-54', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Datasets' }).click();
  await page.getByRole('button', { name: 'Add dataset' }).click();
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).click();
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill('Test Study 3');
  await page.getByRole('textbox', { name: 'Dataset summary' }).click();
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Test Summary');
  await page.locator('pre').nth(1).click();
  await page.locator('#simplemde-editor-1-wrapper').getByRole('textbox').fill('Test Description');
  await page.getByTestId('dialog').locator('div').filter({ hasText: 'CDM Schema Option' }).nth(4).click();
  await page.getByRole('option', { name: 'Create new schema', exact: true }).click();
  await page.locator('#mui-component-select-databaseOption').click();
  await page.getByRole('option', { name: 'demo_database-postgres' }).click();
  await page.locator('#mui-component-select-vocabSchemaOption').click();
  await page.getByRole('option', { name: 'demo_cdm' }).click();
  await page.locator('#mui-component-select-dataModelOption').click();
  await page.getByRole('option', { name: 'omop5-4 [omop_cdm_plugin]' }).click();
  await page.locator('#mui-component-select-paConfigOption').click();
  await page.getByRole('option', { name: 'OMOP', exact: true }).click();
  await page.getByRole('textbox', { name: 'Token dataset code' }).click();
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('ts3');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Test Study 3')).toBeVisible();
  await page.getByRole('link', { name: 'Jobs' }).click();
  // Get the first (top) entry link
  const firstEntry = page.locator('a:has(span:text("datamodel-create-cdm_ts3_"))').first();
  // Find the closest state badge to this entry (adjust the selector as needed)
  const stateBadge = firstEntry.locator('xpath=ancestor::div[contains(@class,"state-list-item__content")]//span[contains(@class,"state-badge")]');
  await expect(stateBadge).toHaveText(/Completed/, { timeout: 120000 });  
});