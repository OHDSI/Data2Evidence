import { test, expect } from '@playwright/test';

test('Datasets', async ({ page }) => {
  await test.step('Login as admin and navigate to Datasets', async () => {
    await page.goto('/portal');
    await page.locator('input[name="identifier"]').click();
    await page.locator('input[name="identifier"]').fill('admin');
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill('Updatepassword12345');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByTestId('button').nth(1).click();
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  });

  await test.step('Add new dataset - omop5-3', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click();
    await page.getByRole('button', { name: 'Add dataset' }).click();
    await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).click();
    await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill('Test Study 1');
    await page.getByRole('textbox', { name: 'Dataset summary' }).click();
    await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Test Summary');
    await page.locator('#simplemde-editor-1-wrapper').getByRole('textbox').fill('Test Description');
    await page.getByTestId('dialog').locator('div').filter({ hasText: 'CDM Schema Option' }).nth(4).click();
    await page.getByRole('option', { name: 'Create new schema', exact: true }).click();
    await page.locator('#mui-component-select-databaseOption').click();
    await page.getByRole('option', { name: 'demo_database-postgres' }).click();
    await page.locator('#mui-component-select-vocabSchemaOption').click();
    await page.getByRole('option', { name: 'demo_cdm' }).click();
    await page.locator('#mui-component-select-dataModelOption').click();
    await page.getByRole('option', { name: 'omop5-3 [omop_cdm_plugin]' }).click();
    await page.locator('#mui-component-select-paConfigOption').click();
    await page.getByRole('option', { name: 'OMOP', exact: true }).click();
    await page.getByRole('textbox', { name: 'Token dataset code' }).click();
    await page.getByRole('textbox', { name: 'Token dataset code' }).fill('ts1');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Test Study 1')).toBeVisible();
  });

  await test.step('Add new dataset - omop5-4', async () => {
    await page.getByRole('button', { name: 'Add dataset' }).click();
    await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).click();
    await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill('Test Study 2');
    await page.getByRole('textbox', { name: 'Dataset summary' }).click();
    await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Test Summary');
    await page.locator('pre').nth(1).click();
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
    await page.getByRole('textbox', { name: 'Token dataset code' }).fill('ts2');
    await page.getByRole('button', { name: 'Add', exact: true }).click({timeout:30000});
    // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 });
    await expect(page.getByText('Test Study 2')).toBeVisible({timeout:30000});
  });

  await test.step('Check job completion - cdm omop 5.3', async () => {
    await page.getByRole('link', { name: 'Jobs' }).click();
    // Get the first (top) entry link
    const firstEntry = page.locator('a:has(span:text("datamodel-create-cdm_ts1_"))').first();
    // Find the closest state badge to this entry (adjust the selector as needed)
    const stateBadge = firstEntry.locator('xpath=ancestor::div[contains(@class,"state-list-item__content")]//span[contains(@class,"state-badge")]');
    await expect(stateBadge).toHaveText(/Completed/, { timeout: 120000 });
  });

  await test.step('Check job completion - cdm omop 5.4', async () => {
    // Get the first (top) entry link
    const firstEntry = page.locator('a:has(span:text("datamodel-create-cdm_ts2_"))').first();
    // Find the closest state badge to this entry (adjust the selector as needed)
    const stateBadge = firstEntry.locator('xpath=ancestor::div[contains(@class,"state-list-item__content")]//span[contains(@class,"state-badge")]');
    await expect(stateBadge).toHaveText(/Completed/, { timeout: 120000 });
  });

  await test.step('Update dataset summary and description', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click();
    await page.getByRole('row', { name: /Test Study 1/ }).getByRole('button').nth(2).click();
    await page.getByRole('option', { name: 'Update dataset' }).click();
    await page.getByRole('textbox', { name: 'Dataset summary' }).click();
    await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Updated Summary');
    await page.getByRole('button', { name: 'Save' }).click();
  });

  await test.step('Switch to Researcher portal', async () => {
    await page.getByRole('link', { name: 'Account' }).click();
    await page.getByRole('button', { name: 'Switch to Researcher portal' }).click();
    // Scroll to the element before clicking, in case it is not in view
    const study1 = page.getByText('Test Study 1');
    await expect(page.getByText('Updated Summary')).toBeVisible();
    await study1.scrollIntoViewIfNeeded();
    await study1.click();
    await expect(page.getByText('Test Description')).toBeVisible();
  });

  await test.step('Switch to admin portal', async () => {
    await page.getByRole('link', { name: 'Account' }).click();
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  })

  await test.step('Create user', async () => {
    await page.getByRole('button', { name: 'Add user' }).click();
    await page.getByRole('textbox', { name: 'Username' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill('testuser1');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345');
    await page.getByRole('button', { name: 'Add' }).click({ timeout: 30000 });
    // Wait for the user to appear after clicking Add
    await page.waitForTimeout(2000)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'testuser1' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Viewer', exact: true })).toBeVisible()
    // await expect(page.getByText('testuser1')).toBeVisible({ timeout: 30000 });
  });

  await test.step('Hide dataset', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click();
    await page.getByRole('row', { name: /Test Study 1/ }).getByRole('button').nth(2).click();
    await page.getByRole('option', { name: 'Update dataset' }).click();
    await page.getByRole('radio', { name: 'Hidden (only researchers and' }).check();
    await page.getByRole('button', { name: 'Save' }).click(); 
  });

  await test.step('Logout admin', async () => {
    await page.getByRole('link', { name: 'Account' }).click();
    await page.getByRole('button', { name: 'Logout' }).click();
  });

  await test.step('Login as user and check dataset visibility', async () => {
    await page.locator('input[name="identifier"]').click();
    await page.locator('input[name="identifier"]').fill('testuser1');
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill('Updatepassword12345');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Test Study 1')).not.toBeVisible();
  });

  await test.step('Logout as researcher and login as admin', async () => {
    await page.getByTestId('button').nth(1).click();
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.locator('input[name="identifier"]').click();
    await page.locator('input[name="identifier"]').fill('admin');
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill('Updatepassword12345');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByTestId('button').nth(1).click();
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  })

  // Cleanup: Delete the user created for testing
  await test.step('Delete test user', async () => {  
    const userRow = page.getByRole('row', { name: /testuser1/ });
    await page.getByRole('button', { name: 'Delete' }).nth(2).click();
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    // Wait for the user row to be removed from the table, not just any text
    await expect(page.getByRole('row', { name: /testuser1/ })).not.toBeVisible({ timeout: 20000 }); // Verify user is deleted
  });
  
  // Cleanup: Delete the datasets created for testing
  await test.step('Delete datasets', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click();
    //Delete Test Study 1
    await page.getByRole('row', { name: /Test Study 1/ }).getByRole('button').nth(2).click();
    await page.getByRole('option', { name: 'Delete dataset' }).click();
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    // Wait for the deletion to complete before proceeding
    await expect(page.getByRole('row', { name: /Test Study 1/ })).not.toBeVisible({ timeout: 20000 });

    //Delete Test Study 2
    await page.getByRole('row', { name: /Test Study 2/ }).getByRole('button').nth(2).click();
    await page.getByRole('option', { name: 'Delete dataset' }).click();
    await page.getByRole('button', { name: 'Yes, delete' }).click();
     // Wait for the deletion to complete before proceeding
    await expect(page.getByRole('row', { name: /Test Study 2/ })).not.toBeVisible({ timeout: 20000 });
  });
});
