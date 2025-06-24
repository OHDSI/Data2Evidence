import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

test('Researcher-Dataset information', async ({ page }) => {
  await page.goto('https://localhost:443/sign-in');
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('https://localhost:443/portal/researcher');
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Datasets' }).click();
  await page.getByRole('button', { name: 'Add dataset' }).click();
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).click();
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill('test_dataset1');
  await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).press('Tab');
  await page.getByRole('textbox', { name: 'Dataset summary' }).fill('test dataset');
  await page.locator('pre').nth(1).click();
  await page.locator('#simplemde-editor-1-wrapper').getByRole('textbox').fill('test dataset');
  await page.locator('#mui-component-select-schemaOption').click();
  await page.getByRole('option', { name: 'Create new schema' }).click();
  await page.locator('#mui-component-select-databaseOption').click();
  await page.getByRole('option', { name: 'demo_database-postgres' }).click();
  await page.locator('#mui-component-select-vocabSchemaOption').click();
  await page.getByRole('option', { name: 'demo_cdm' }).click();
  await page.locator('#mui-component-select-dataModelOption').click();
  await page.getByRole('option', { name: 'omop5-4 [omop_cdm_plugin]' }).click();
  await page.locator('#mui-component-select-paConfigOption').click();
  await page.getByRole('option', { name: 'OMOP', exact: true }).click();
  await page.getByRole('textbox', { name: 'Token dataset code' }).click();
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('test_dataset1');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click();
  await page.getByRole('img', { name: 'Data2Evidence' }).click();

  await page.getByText('Demo datasetDemo datasetTotal').click();
  await expect(page.locator('tbody')).toContainText('2694');
  await expect(page.getByTestId('card-content')).toContainText('Demo dataset');
  await expect(page.getByTestId('select').locator('div')).toContainText('Demo dataset');

  await page.getByRole('img', { name: 'Data2Evidence' }).click();
  await page.getByText('Demo datasetDemo datasetTotal').click();

  await page.getByRole('button', { name: 'Demo dataset' }).click();
  await page.getByRole('option', { name: 'test_dataset1' }).click();
  await expect(page.getByTestId('title')).toContainText('test_dataset1');
  await expect(page.getByTestId('select').locator('div')).toContainText('test_dataset1');
});