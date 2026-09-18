import { test, expect } from '@playwright/test'
import { confirmExplorationDialog, explorationCard, explorationMenuAction } from '../explorations'

const TEST_NAME = 'e2e PA and Cohorts'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

const PASSWORD = 'Updatepassword12345'
const RUN_ID = Date.now().toString(36)
const RESEARCHER_1 = `researcher1_${RUN_ID}`
const RESEARCHER_2 = `researcher2_${RUN_ID}`
const COHORT_1 = `Cohort 1 ${RUN_ID}`
const COHORT_2 = `Cohort 2 ${RUN_ID}`
const COHORT_1_RENAMED = `Cohort 1 renamed ${RUN_ID}`

async function loginAs(page, username) {
  await page.locator('input[name="identifier"]').fill(username)
  await page.locator('input[name="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function logout(page) {
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
}

async function createUser(page, username) {
  await page.getByRole('button', { name: 'Add user' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill(username)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Add' }).click()
  await page.waitForTimeout(2000)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByRole('cell', { name: username })).toBeVisible()
}

async function grantDatasetAccess(page, username) {
  await page.getByRole('link', { name: 'Datasets' }).click()
  const demoRow = page.locator('tr', { hasText: 'Demo dataset' }).first()
  await demoRow.getByText('Select action').click()
  await page.getByRole('option', { name: 'Permissions' }).click()
  await page.getByRole('tab', { name: 'Access' }).click()
  const addButton = page.getByTestId('dialog').getByTestId('button')
  await expect(addButton).toBeVisible()
  await addButton.click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.waitForTimeout(5000)
  await expect(page.getByRole('menuitem', { name: username })).toBeVisible()
  await page.getByRole('menuitem', { name: username }).click()
  await expect(page.getByRole('cell', { name: username })).toBeVisible()
  await page.getByTestId('dialog-close').click()
}

async function deleteUser(page, username) {
  // Navigate to Users page
  await page.getByRole('link', { name: 'Users' }).click()
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  const userRow = page.getByRole('row', { name: new RegExp(username) })
  await userRow.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(userRow).not.toBeVisible()
}

async function navigateToCohorts(page) {
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.getByTestId('explorations-page')).toBeVisible()
}

async function dismissUnsavedChangesDialog(page) {
  try {
    await page.getByRole('button', { name: 'Leave without saving' }).click({ timeout: 3000 })
  } catch {
    // Dialog not present, continue
  }
}

async function navigateBackToCohortList(page) {
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await dismissUnsavedChangesDialog(page)
  await page.waitForTimeout(500)
}

test(TEST_NAME, async ({ page }) => {
  // === SETUP: Create two researcher users with Demo dataset access ===
  await page.goto('/d2e/portal')
  await loginAs(page, 'admin')

  // Wait for the portal to fully load after OIDC redirect
  await expect(page.getByText('Demo dataset').first()).toBeVisible()

  // Switch to admin portal (use nth(1) - first Account button is behind the banner overlay)
  await page.getByRole('button', { name: 'Account' }).nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Create researcher users
  await createUser(page, RESEARCHER_1)
  await createUser(page, RESEARCHER_2)

  // Grant both users access to Demo dataset
  await grantDatasetAccess(page, RESEARCHER_1)
  // Re-open permissions dialog for second user
  await page.getByRole('link', { name: 'Datasets' }).click()
  await grantDatasetAccess(page, RESEARCHER_2)

  // Logout admin
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()

  // === TEST: Researcher 1 creates cohorts ===
  await loginAs(page, RESEARCHER_1)

  // Select dataset
  await page.getByText('Demo dataset').first().click()
  await expect(page.getByTestId('card-content')).toContainText('Demo dataset')
  await expect(page.getByRole('tab', { name: 'Dataset Info' })).toBeVisible()

  // Navigate to Cohorts
  await navigateToCohorts(page)
  await expect(page.getByTestId('explorations-new-btn')).toBeVisible()

  // Create first cohort with MALE filter
  await page.getByTestId('explorations-new-btn').click()
  await page.getByTitle('Basic Data - Gender').getByText('All').click()
  await page.getByRole('textbox', { name: 'multiselect-searchbox' }).fill('MALE')
  await page.getByText('MALE - MALE').click()
  await expect(page.getByRole('combobox').filter({ hasText: 'MALE' }).first()).toBeVisible()

  // Save cohort 1 - the allow-sharing checkbox now lives in the filter card footer
  // rather than the save dialog, so it has to be set before the dialog opens.
  await page.getByTestId('pa-share-cohort-checkbox').click()
  await expect(page.getByTestId('pa-save-cohort-btn')).toBeVisible()
  await page.getByTestId('pa-save-cohort-btn').click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill(COHORT_1)
  await expect(page.getByRole('dialog')).toContainText('Save Current Filters')
  await expect(page.getByTestId('pa-save-dialog-save-btn')).toBeVisible()
  await page.getByTestId('pa-save-dialog-save-btn').click()

  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // Navigate back to cohorts
  await navigateBackToCohortList(page)
  await expect(explorationCard(page, COHORT_1)).toBeVisible()

  // Create second cohort with FEMALE filter
  await page.getByTestId('explorations-new-btn').click()
  await dismissUnsavedChangesDialog(page)

  await page.waitForTimeout(500)
  await page.getByText('All').first().click()
  await page.getByRole('textbox', { name: 'multiselect-searchbox' }).fill('FEMALE')
  await page.getByRole('option').filter({ hasText: 'FEMALE' }).first().click()
  await expect(page.getByRole('combobox').filter({ hasText: 'FEMALE' }).first()).toBeVisible()

  // Save cohort 2 - allow-sharing now lives in the filter card footer, so it has to
  // be set before the save dialog opens.
  await page.getByTestId('pa-share-cohort-checkbox').click()
  await page.getByTestId('pa-save-cohort-btn').click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill(COHORT_2)
  await expect(page.getByRole('dialog')).toContainText('Save Current Filters')
  await page.getByTestId('pa-save-dialog-save-btn').click()

  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // Navigate back to cohorts
  await navigateBackToCohortList(page)
  await expect(explorationCard(page, COHORT_2)).toBeVisible()

  // Select both cohorts and verify Compare.
  // `pa-cohort-card-*` and `pa-cohort-select-btn` came from BookmarkItems.vue,
  // which the Data Exploration redesign stopped mounting - the ids are not even
  // in the built bundle any more. Selection is a checkbox on the card now, and
  // Compare moved into the bulk-actions bar, keeping its 'Compare' label.
  await page.getByRole('checkbox', { name: `Select exploration ${COHORT_1}` }).check()
  await page.getByRole('checkbox', { name: `Select exploration ${COHORT_2}` }).check()

  await expect(page.getByRole('button', { name: 'Compare' })).toBeEnabled()
  await page.getByRole('button', { name: 'Compare' }).click()
  await expect(page.getByText('Group Comparison')).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()

  // === REMOVED: Researcher 2 can see shared cohorts ===
  //
  // Invalidated by the Data Exploration redesign, not by a broken selector.
  //
  // This section logged in as researcher_2, clicked the 'Shared' toggle and
  // asserted that researcher_1's shared cohorts appeared, that Rename and
  // Delete were disabled on them, and that a non-owner could still
  // materialize one.
  //
  // The new page calls getDisplayBookmarks(false, username), which keeps only
  // records the current user owns. There is no 'Shared' toggle and no shared
  // filter, so a second user cannot see these cohorts at all - the capability
  // the section tested is gone, so there is nothing to re-point the selectors
  // at.
  //
  // Coverage lost, and worth restoring if shared cohorts come back to this
  // page: a non-owner seeing a shared cohort, Rename/Delete disabled for a
  // non-owner, and materialize by a non-owner. The owner's own rename and
  // delete are still covered below.
  //
  // See also atlas_cohort_definition.spec.ts, where the Atlas entry point went
  // the same way.

  // === TEST: Researcher 1 renames and deletes own cohort ===
  // (Only the owner can modify cohorts, so switch back to researcher_1)
  await logout(page)
  await loginAs(page, RESEARCHER_1)
  await page.getByText('Demo dataset').first().click()
  await navigateToCohorts(page)

  await expect(page.getByRole('status').filter({ hasText: 'Content is loading' })).not.toBeVisible({ timeout: 60000 })

  // Rename cohort
  await explorationMenuAction(page, COHORT_1, 'Rename')
  // The reskinned dialog is titled "Rename exploration name" and its field is
  // labelled "Exploration name"; the confirm button reads Rename, not Save.
  await expect(page.getByRole('dialog')).toContainText('Rename exploration name')
  await page.getByRole('textbox', { name: 'Exploration name' }).fill(COHORT_1_RENAMED)
  await confirmExplorationDialog(page)
  await expect(explorationCard(page, COHORT_1_RENAMED)).toBeVisible()

  // Navigate back to cohort list
  await navigateBackToCohortList(page)

  // Delete cohort
  await explorationMenuAction(page, COHORT_1_RENAMED, 'Delete')
  // Reskinned: titled "Delete filter?", confirmed with "Yes, delete".
  await expect(page.getByRole('dialog')).toContainText('Delete filter?')
  await confirmExplorationDialog(page)
  await expect(page.locator('#app')).toContainText('Saved filter deleted')

  // Cleanup: delete users as admin
  await logout(page)
  await loginAs(page, 'admin')
  await expect(page.getByText('Demo dataset').first()).toBeVisible()
  await page.getByRole('button', { name: 'Account' }).nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await deleteUser(page, RESEARCHER_1)
  await deleteUser(page, RESEARCHER_2)
})
