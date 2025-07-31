import { test, expect } from '@playwright/test';


const TEST_NAME = 'copy-dataset-id-schema-name'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page, context}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto(`https://localhost:443/portal`)
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('card-content').first().click();
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Datasets' }).click();

  // Get the dataset ID
  await page.locator('div.alp-text__copy-button-container').nth(0).locator('button.alp-icon-button--icon-only').click();
  const dataset_id = await page.evaluate(async () => await navigator.clipboard.readText());

  // Get the schema name
  await page.locator('div.alp-text__copy-button-container').nth(1).locator('button.alp-icon-button--icon-only').click();
  const schema_name = await page.evaluate(async () => await navigator.clipboard.readText());
  
  // Check if the cell contains the dataset ID and schema name
  await expect(page.locator('tbody')).toContainText(dataset_id);
  await expect(page.locator('tbody')).toContainText(schema_name);
});

