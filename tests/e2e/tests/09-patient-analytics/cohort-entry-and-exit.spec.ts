import type { Page } from '@playwright/test'
import {
  test,
  expect,
  openAdminPortalFromAtlas,
  openAtlasDataExploration,
  openAtlasPortalFromAdmin
} from '../fixtures'

const TEST_NAME = 'patient-analytics-cohort-entry-and-exit'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

async function openPaConfigAppTab(page: Page) {
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Data exploration configurationConfigure data explorationConfigure$/ })
    .getByTestId('button')
    .click()
  await page.locator('[id="__xmlview0--dataModelConfigurationsCombo-arrow"]').click()
  await page.getByRole('option', { name: 'OMOP_DM' }).click()
  await page.locator('[id="__filter1-tab"]').click()
  await page.waitForTimeout(1000) // Wait is required for pa config to populate the buttons with selected data model
}

// Set "Enable Cohort Entry & Exit" and save. The UI5 form keeps filling in for a moment after
// the tab opens, so a single click can be undone; retry until the switch holds the value.
async function setCohortEntryExit(page: Page, enabled: boolean) {
  await openPaConfigAppTab(page)
  const checkbox = page.getByRole('checkbox', { name: 'Enable Cohort Entry & Exit :' })
  await expect(async () => {
    if ((await checkbox.isChecked()) !== enabled) await checkbox.click()
    await expect(checkbox).toBeChecked({ checked: enabled, timeout: 2000 })
  }).toPass({ timeout: 30000 })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Configuration saved.')).toBeVisible()
}

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)

  await setCohortEntryExit(page, true)
  try {
    // Go to cohorts screen and test CEE
    await openAtlasPortalFromAdmin(page)
    await openAtlasDataExploration(page)
    await page.getByTestId('explorations-new-btn').click()
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Visit' }).click()
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await page.getByRole('button', { name: 'Entry Select a Filter Card ◢' }).click()
    await page.locator('#pane-right').getByText('Visit A').click()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await page.getByRole('button', { name: 'Exit Select a Filter Card ◢' }).click()
    await page.locator('#pane-right').getByRole('list').getByText('Condition Occurrence A').click()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await page.waitForTimeout(2000) // Wait 2 seconds for "A filter card has been added..." popup in previous action to disappear
    await expect.soft(page).toHaveScreenshot()

    // Change AND to OR, CEE should be removed from filtercards
    await page.getByRole('button', { name: 'AND ' }).click()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await expect.soft(page).toHaveScreenshot()
  } finally {
    // Always switch CEE off again: later PA specs and their screenshots assume it is off.
    // The cohort has unsaved changes (filter cards + Entry/Exit + AND→OR), so navigating
    // away prompts the unsaved-changes dialog (#2636). Confirm leaving so nav proceeds.
    if (!(await page.getByRole('link', { name: 'Setup' }).isVisible())) {
      await page.getByRole('button', { name: 'admin', exact: true }).click()
      await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
      await page
        .getByRole('button', { name: 'Leave without saving' })
        .click({ timeout: 3000 })
        .catch(() => {})
    }
    await setCohortEntryExit(page, false)
  }
})
