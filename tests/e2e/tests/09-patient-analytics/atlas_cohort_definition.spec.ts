import { test, expect } from '../fixtures'
const TEST_NAME = 'atlas-lite cohort creation'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForTimeout(5000)

  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()

  await page
    .locator('div')
    .filter({ hasText: /^Cohort builder configConfigure cohort builderConfigure$/ })
    .getByTestId('button')
    .click()
  await page.locator('[id="__xmlview0--dataModelConfigurationsCombo-arrow"]').click()
  await page.getByRole('option', { name: 'OMOP_DM' }).click()
  await page.locator('[id="__filter1-tab"]').click()
  await page.waitForTimeout(1000) // Wait is required for pa config to populate the buttons with selected data model

  let atlasOffCheckbox = await page.getByRole('checkbox', { name: 'Use PA-Atlas : Off' })
  await expect(atlasOffCheckbox).not.toBeChecked()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved.')).toBeVisible()

  // Go to cohorts screen and test CEE
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  // The embedded "Atlas Lite" iframe was removed (standalone Atlas3 replaces it).
  //
  // This used to assert the 'Atlas' cohort-definition button was present. The
  // Data Exploration redesign replaced the old Bookmarks header - which carried
  // a D2E / Atlas / Import / Compare button group - with a single
  // "Start new exploration" action, so that button exists in no state now and
  // the assertion cannot be rewritten against an equivalent control.
  //
  // Assert what this step is really for instead: turning PA-Atlas on leaves the
  // Cohorts screen reachable and rendering. Do not reinstate a control
  // assertion here unless an Atlas entry point comes back.
  await expect(page.getByTestId('explorations-page')).toBeVisible()

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()

  await page
    .locator('div')
    .filter({ hasText: /^Cohort builder configConfigure cohort builderConfigure$/ })
    .getByTestId('button')
    .click()
  await page.locator('[id="__xmlview0--dataModelConfigurationsCombo-arrow"]').click()
  await page.getByRole('option', { name: 'OMOP_DM' }).click()
  await page.locator('[id="__filter1-tab"]').click()
  await page.waitForTimeout(1000) // Wait is required for pa config to populate the buttons with selected data model
  atlasOffCheckbox = await page.getByRole('checkbox', { name: 'Use PA-Atlas : Off' })
  if (await atlasOffCheckbox.isVisible()) {
    await atlasOffCheckbox.click()
    await page.waitForTimeout(500) // Wait is required for pa config UI to change slider value
  }
  let atlasOnCheckbox = await page.getByRole('checkbox', { name: 'Use PA-Atlas : On' })
  await expect(atlasOnCheckbox).toBeChecked()
  await expect(atlasOffCheckbox).not.toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved.')).toBeVisible()
})
