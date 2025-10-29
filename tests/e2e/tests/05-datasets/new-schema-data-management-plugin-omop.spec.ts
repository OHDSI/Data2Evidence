import { test, expect } from '@playwright/test';

const TEST_NAME = 'dataset-new-schema-data-management-plugin-omop'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
const randomString = Math.random().toString(36).substring(2, 10)

test(TEST_NAME, async ({ page }) => {
    await page.goto('/portal');
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
    await page.getByRole('textbox', { name: 'Dataset name - Displayed on' }).fill('Test Study');
    await page.getByRole('textbox', { name: 'Dataset summary' }).click();
    await page.getByRole('textbox', { name: 'Dataset summary' }).fill('Test Summary');
    await page.locator('pre').nth(1).click();
    await page.locator('#simplemde-editor-1-wrapper').getByRole('textbox').fill('Test Description');
    await page.getByTestId('dialog').locator('div').filter({ hasText: 'CDM Schema Option' }).nth(4).click();
    await page.getByRole('option', { name: 'Create new schema', exact: true }).click();
    await page.locator('#mui-component-select-databaseOption').click();
    await page.getByRole('option', { name: 'demo_database-postgres' }).click();
    await page.getByRole('textbox', { name: 'Result Schema Name' }).fill(`result_schema_${randomString}`);
    await page.locator('#mui-component-select-dataModelOption').click();
    await page.getByRole('option', { name: 'omop5-4 [data_management_plugin]' }).click();
    await page.locator('#mui-component-select-paConfigOption').click();
    await page.getByRole('option', { name: 'OMOP', exact: true }).click();
    await page.getByRole('textbox', { name: 'Token dataset code' }).click();
    await page.getByRole('textbox', { name: 'Token dataset code' }).fill('tsdmomop54');
    await page.getByRole('textbox', { name: 'Cache Dataset Name' }).click()
    await page.getByRole('textbox', { name: 'Cache Dataset Name' }).fill('Test Cache')
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('tbody')).toContainText('Test Study')
    await expect(page.locator('tbody')).toContainText('Test Cache')
    await page.getByRole('link', { name: 'Jobs' }).click();
    // Get the first (top) entry link
    const firstEntry = page.locator('a:has(span:text("datamodel-create-cdm_tsdmomop54_"))').first();
    // Find the closest state badge to this entry (adjust the selector as needed)
    const stateBadge = firstEntry.locator('xpath=ancestor::div[contains(@class,"state-list-item__content")]//span[contains(@class,"state-badge")]');
    await expect(stateBadge).toHaveText(/Completed/, { timeout: 120000 });
    // Clean up - delete the created dataset
    await page.getByRole('link', { name: 'Datasets' }).click()
    await page
        .getByRole('row', { name: /Test Study/ })
        .filter({ hasText: 'Not Available' })
        .getByRole('button')
        .nth(2)
        .click()
    await page.getByRole('option', { name: 'Delete dataset' }).click({ timeout: 30000 })
    await page.getByRole('button', { name: 'Yes, delete' }).click({ timeout: 30000 });
    await page.locator('tr', { hasText: 'Test Cache' }).getByText('Select action').click()
    await page.getByRole('option', { name: 'Delete dataset' }).click({ timeout: 30000 })
    await page.getByRole('button', { name: 'Yes, delete' }).click({ timeout: 30000 })
});
