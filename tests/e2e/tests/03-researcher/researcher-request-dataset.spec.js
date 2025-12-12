import { test, expect } from '@playwright/test'

const TEST_NAME = 'researcher-request-dataset-access'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Go to portal and log in as admin
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Select the demo dataset and update it to show request access button
  await page.getByRole('link', { name: 'Datasets' }).click();
  const datasetTable = page.locator('.studyoverview__list').first();
  await expect(datasetTable).toBeVisible({ timeout: 30000 });
  await expect(datasetTable.locator('tbody tr').first()).toBeVisible({ timeout: 30000 });
  const demoRow = datasetTable.locator('tr', { hasText: /Demo dataset/i }).first();
  await expect(demoRow).toBeVisible({ timeout: 30000 });
  
  // Child rows are now expanded by default, so we can directly access the nested table
  await expect(page.locator('table table')).toBeVisible({ timeout: 10000 });
  const childRow = page.locator('table table tbody tr').first();
  await expect(childRow).toBeVisible({ timeout: 10000 });
  
  // Get the cache dataset name from the Name column (index 2: icon, dataset_id, name)
  // The table structure is: [icon] [Dataset ID] [Name] [Schema name] [Schema version] ...
  const cacheDatasetNameCell = childRow.locator('td').nth(2);
  const cacheDatasetName = (await cacheDatasetNameCell.textContent()).trim();
  
  // Click "Select action" on the child dataset row
  await childRow.getByText('Select action').click();
  await page.getByRole('option', { name: 'Update dataset' }).click();
  await page.getByText('Show request access button').click();
  await page.getByRole('button', { name: 'Save' }).click();

  // Create a new researcher `test_researcher`
  await page.getByRole('link', { name: 'Users' }).click()
  await page.getByTestId('button').click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill('test_researcher')
  await page.getByRole('textbox', { name: 'Password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()

  // Login as researcher `test_researcher`
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('test_researcher')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByTestId('card').first()).toBeVisible({ timeout: 30000 })
  
  // Find and click on the cache dataset card by looking for a card with the dataset name
  await page.waitForTimeout(2000)
  const allCards = await page.getByTestId('card').all()
  let clicked = false
  for (const card of allCards) {
    const cardText = await card.textContent()
    if (cardText.includes(cacheDatasetName)) {
      await card.click()
      clicked = true
      break
    }
  }
  if (!clicked) {
    throw new Error(`Could not find card with cache dataset name: ${cacheDatasetName}`)
  }
  
  // Check that the request access button is visible and click it
  await expect(page.getByTestId('card').locator('div').filter({ hasText: 'Dataset Info' }).first()).toBeVisible()
  await expect(page.getByTestId('card-content')).toContainText('Request access')
  await page.getByTestId('button').click()

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
  const datasetTableAgain = page.locator('.studyoverview__list').first();
  await expect(datasetTableAgain).toBeVisible({ timeout: 30000 });
  await expect(datasetTableAgain.locator('tbody tr').first()).toBeVisible({ timeout: 30000 });
  // Find the demo row again (can't reuse locator after navigation)
  const demoRowAgain = datasetTableAgain.locator('tr', { hasText: /Demo dataset/i }).first();
  await expect(demoRowAgain).toBeVisible({ timeout: 30000 });
  // Child rows are expanded by default, find child row directly
  const childRowAgain = page.locator('table table tbody tr').first();
  await expect(childRowAgain).toBeVisible({ timeout: 10000 });
  await childRowAgain.getByText('Select action').click();
  await page.getByRole('option', { name: 'Permissions' }).click();
  await page.getByTestId('dialog').getByText('Select action').click();
  await page.getByRole('option', { name: 'Approve' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  
  // Login as researcher user test_researcher and check that the dataset can be accessed
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('test_researcher')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByTestId('card').first()).toBeVisible({ timeout: 30000 })
  
  // Find and click on the cache dataset card after approval
  await page.waitForTimeout(2000)
  const allCardsAfterApproval = await page.getByTestId('card').all()
  let clickedAfterApproval = false
  for (const card of allCardsAfterApproval) {
    const cardText = await card.textContent()
    if (cardText.includes(cacheDatasetName)) {
      await card.click()
      clickedAfterApproval = true
      break
    }
  }
  if (!clickedAfterApproval) {
    throw new Error(`Could not find card with cache dataset name after approval: ${cacheDatasetName}`)
  }

  // Check that additional tabs on the navbar is visible after access is granted
  await expect(page.getByTestId('header')).toBeVisible()
  await expect(
    page.getByTestId('card').locator('div').filter({ hasText: 'Dataset InfoData QualityData' }).first()
  ).toBeVisible()
  // Check that the nav bar contains the cache dataset name (not the parent dataset)
  await expect(page.getByTestId('nav')).toContainText(`${cacheDatasetName}DatasetConceptsCohortsNotebooksAnalysisAccount`)
})
