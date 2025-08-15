import { test, expect } from '@playwright/test';

const TEST_NAME = 'researcher-request-dataset-access'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Go to portal and log in as admin
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();

  // Select the demo dataset and update it to show request access button
  await page.getByRole('link', { name: 'Datasets' }).click();
  const demoRow = await page.locator('tr', { hasText: 'Demo dataset' }).first();
  await demoRow.getByRole('button', { name: 'Select action' }).click();
  await page.getByRole('option', { name: 'Update dataset' }).click();
  await page.getByText('Show request access button').click();
  await page.getByRole('button', { name: 'Save' }).click();

  // Create a new researcher `test_researcher`
  await page.getByRole('link', { name: 'Users' }).click();
  await page.getByTestId('button').click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('test_researcher');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Logout' }).click();

  // Login as researcher `test_researcher`
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('test_researcher');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Check that the request access button is visible and click it
  await page.getByText('Demo dataset').first().click();
  await expect(page.getByTestId('card').locator('div').filter({ hasText: 'Dataset Info' }).first()).toBeVisible();
  await expect(page.getByTestId('card-content')).toContainText('Request access');
  await page.getByTestId('button').click();
  
  // Login as admin and approve the request to dataset access
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Datasets' }).click();
  await demoRow.getByRole('button', { name: 'Select action' }).click();
  await page.getByRole('option', { name: 'Permissions' }).click();
  await page.getByRole('button', { name: 'Select action' }).click();
  await page.getByRole('option', { name: 'Approve' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  
  // Login as researcher user test_researcher and check that the dataset can be accessed
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('test_researcher');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Demo dataset').first().click();

  // Check that additional tabs on the navbar is visible after access is granted
  await expect(page.getByTestId('header')).toBeVisible();
  await expect(page.getByTestId('card').locator('div').filter({ hasText: 'Dataset InfoData QualityData' }).first()).toBeVisible();
  await expect(page.getByTestId('nav')).toContainText('Demo datasetDatasetConceptsCohortsNotebooksAnalysisAccount');
});