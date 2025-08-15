import { test, expect } from '@playwright/test'

const TEST_NAME = 'patient-analytics-cohort-entry-and-exit'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()

  // Go to PA config and ensure CEE is checked
  await page
    .locator('div')
    .filter({ hasText: /^Patient Analytics configConfigure patient analyticsConfigure$/ })
    .getByTestId('button')
    .click()
  await page.locator('[id="__xmlview0--dataModelConfigurationsCombo-arrow"]').click()
  await page.getByRole('option', { name: 'OMOP_DM' }).click()
  await page.locator('[id="__filter1-tab"]').click()
  await page.waitForTimeout(1000) // Wait is required for pa config to populate the buttons with selected data model
  // Ensure cohort entry exit is checked
  const notebooksCheckbox = await page.getByRole('checkbox', { name: 'Enable Cohort Entry & Exit :' })
  if (!(await notebooksCheckbox.isChecked())) {
    await notebooksCheckbox.click()
    await page.waitForTimeout(500) // Wait is required for pa config UI to change slider value
  }
  await expect(notebooksCheckbox).toBeChecked()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved.')).toBeVisible()

  // Go to cohorts screen and test CEE
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Visit' }).click()
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await page.getByRole('button', { name: 'Entry Select a Filter Card ◢' }).click()
  await page.locator('#pane-right').getByText('Visit A').click()
  await page.getByRole('button', { name: 'Exit Select a Filter Card ◢' }).click()
  await page.locator('#pane-right').getByRole('list').getByText('Condition Occurrence A').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Change AND to OR, CEE should be removed from filtercards
  await page.getByRole('button', { name: 'AND ' }).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Go to PA config and uncheck CEE
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Patient Analytics configConfigure patient analyticsConfigure$/ })
    .getByTestId('button')
    .click()
  await page.locator('[id="__xmlview0--dataModelConfigurationsCombo-arrow"]').click()
  await page.getByRole('option', { name: 'OMOP_DM' }).click()
  await page.locator('[id="__filter1-tab"]').click()
  await page.waitForTimeout(1000) // Wait is required for pa config to populate the buttons with selected data model
  // Ensure cohort entry exit is unchecked
  if (await notebooksCheckbox.isChecked()) {
    await notebooksCheckbox.click()
    await page.waitForTimeout(500) // Wait is required for pa config UI to change slider value
  }
  await expect(notebooksCheckbox).not.toBeChecked()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved.')).toBeVisible()
})
