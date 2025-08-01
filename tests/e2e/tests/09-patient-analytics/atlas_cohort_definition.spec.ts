import { test, expect } from '@playwright/test';

test('atlas-lite cohort creation', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForTimeout(5000)

  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Setup' }).click();

  await page
  .locator('div')
  .filter({ hasText: /^Patient Analytics configConfigure patient analyticsConfigure$/ })
  .getByTestId('button')
  .click()
  await page.locator('[id="__xmlview0--dataModelConfigurationsCombo-arrow"]').click()
  await page.getByRole('option', { name: 'OMOP_DM' }).click()
  await page.locator('[id="__filter1-tab"]').click()
  await page.waitForTimeout(1000) // Wait is required for pa config to populate the buttons with selected data model
  let atlasOnCheckbox = await page.getByRole('checkbox', { name: 'Use PA-Atlas : On' });
  if ((await atlasOnCheckbox.isChecked())) {
    await atlasOnCheckbox.click()
    await page.waitForTimeout(500) // Wait is required for pa config UI to change slider value
  }
  let atlasOffCheckbox = await page.getByRole('checkbox', { name: 'Use PA-Atlas : Off' });
  await expect(atlasOnCheckbox).not.toBeVisible();
  await expect(atlasOffCheckbox).not.toBeChecked();
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved.')).toBeVisible()

  // Go to cohorts screen and test CEE
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'Atlas' }).click();
  await page.waitForTimeout(50000)
  const agreement = await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByText('License Agreement', { exact: true })
  if(await agreement.isVisible()) {
    await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('button', { name: 'Accept' }).click();
  }
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByText('New Cohort').click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).clear();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).fill('testcohort_atlas');
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().locator('div[class="asset-heading"]').getByTitle(new RegExp('^Save$')).click();
  await page.waitForTimeout(10000);

  await expect(page.locator('iframe[title="Atlas Lite"]').contentFrame().locator('div[class="authorship__container"]')).toContainText(new RegExp('created by anonymous on'));
  
  // Set up dialog handler for deletion confirmation
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('Delete cohort definition? Warning: deletion can not be undone!');
    await dialog.accept();
  });
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().locator('div[class="asset-heading"]').getByTitle(new RegExp('^Delete$')).click();
  await page.waitForTimeout(10000);
  await expect(page.locator('iframe[title="Atlas Lite"]').contentFrame().locator('.conceptTable.stripe.compact.hover.dataTable.no-footer')).toBeVisible()
  await expect(page.locator('iframe[title="Atlas Lite"]').contentFrame().locator('.conceptTable.stripe.compact.hover.dataTable.no-footer')).toContainText('No data available in table');

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Setup' }).click();

  await page
  .locator('div')
  .filter({ hasText: /^Patient Analytics configConfigure patient analyticsConfigure$/ })
  .getByTestId('button')
  .click()
  await page.locator('[id="__xmlview0--dataModelConfigurationsCombo-arrow"]').click()
  await page.getByRole('option', { name: 'OMOP_DM' }).click()
  await page.locator('[id="__filter1-tab"]').click()
  await page.waitForTimeout(1000) // Wait is required for pa config to populate the buttons with selected data model
  atlasOffCheckbox = await page.getByRole('checkbox', { name: 'Use PA-Atlas : Off' });
  if ((await atlasOffCheckbox.isVisible())) {
    await atlasOffCheckbox.click()
    await page.waitForTimeout(500) // Wait is required for pa config UI to change slider value
  }
  atlasOnCheckbox = await page.getByRole('checkbox', { name: 'Use PA-Atlas : On' });
  await expect(atlasOnCheckbox).toBeChecked();
  await expect(atlasOffCheckbox).not.toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved.')).toBeVisible()

});