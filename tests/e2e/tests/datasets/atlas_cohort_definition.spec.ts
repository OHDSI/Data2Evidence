import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForTimeout(5000)

  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'Setup' }).click();
  
  await page.locator('div').filter({ hasText: /^Patient Analytics configConfigure patient analyticsConfigure$/ }).getByTestId('button').click();
  await page.waitForTimeout(3000)
  await page.locator('[id="__xmlview0--dataModelConfigurationsCombo-arrow"]').click();
  await page.getByRole('option', { name: 'OMOP_DM' }).click();
  await page.waitForTimeout(3000)
  await page.locator('[id="__filter1-icon"]').click();
  await page.getByRole('checkbox', { name: 'Use PA-Atlas : On' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(6000)

  await page.getByRole('button').filter({ hasText: /^$/ }).first().click();
  await page.locator('div').filter({ hasText: /^Patient Analytics configConfigure patient analyticsConfigure$/ }).getByTestId('button').click();
  await page.getByRole('button', { name: 'Arrow Down' }).click();
  await page.getByRole('option', { name: 'OMOP_DM' }).click();
  await page.locator('[id="__box1-__xmlview0--anConfigList--mriConfigList-0"]').click();
  await page.locator('[id="__filter1-icon"]').click();
  await expect(page.locator('[id="__switch5-switch"]')).toContainText('Off');

  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click();
  await page.locator('div.dataset-card__title').filter({ hasText: new RegExp('^Demo dataset$') }).click();  

  await page.getByRole('link', { name: 'Cohorts' }).click();
  await page.getByRole('button', { name: 'Atlas' }).click();

  await page.waitForTimeout(10000)
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('button', { name: 'Accept' }).click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByText('New Cohort').click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByRole('textbox', { name: 'New Cohort Definition' }).fill('testcohort_atlas');
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().getByTitle(new RegExp('^Save$')).click();
  await page.locator('iframe[title="Atlas Lite"]').contentFrame().locator('a').filter({ hasText: 'Back to Cohorts' }).click();
  await expect(page.locator('#pane-left')).toContainText('testcohort_atlas');
  await expect(page.locator('#pane-left')).toContainText('Atlas Cohort Definition');

//   await page.getByRole('link', { name: 'Account' }).click()
//   await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
//   await page.getByRole('link', { name: 'Setup' }).click();
//   await page.locator('div').filter({ hasText: /^Patient Analytics configConfigure patient analyticsConfigure$/ }).getByTestId('button').click();
//   await page.getByRole('button', { name: 'Arrow Down' }).click();
//   await page.getByRole('option', { name: 'OMOP_DM' }).click();
//   await page.locator('[id="__box1-__xmlview0--anConfigList--mriConfigList-0"]').click();
//   await page.locator('[id="__filter1-icon"]').click();
//   await page.getByRole('checkbox', { name: 'Use PA-Atlas : Off' }).click();
//   await page.getByRole('button', { name: 'Save' }).click();

//   await page.waitForTimeout(20000)
});