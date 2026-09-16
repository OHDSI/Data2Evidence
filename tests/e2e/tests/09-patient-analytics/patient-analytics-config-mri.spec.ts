import { test, expect } from '@playwright/test'
import { confirmExplorationDialog, explorationMenuAction } from '../explorations'

const TEST_NAME = 'patient_analytics_mri'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/portal')
  await page.getByTestId('button').nth(1).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('test_researcher_1')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  // The old header - "Create Cohort:" with a D2E / Atlas / Import / Compare
  // group and a Shared toggle - was replaced by the Data Exploration toolbar.
  // Assert the controls by test id rather than re-snapshotting the aria tree:
  // the snapshot pinned copy and ordering that this test does not care about,
  // and it is what made a pure reskin fail here.
  await expect(page.getByTestId('explorations-search')).toBeVisible()
  await expect(page.getByTestId('explorations-filters-btn')).toBeVisible()
  await expect(page.getByTestId('explorations-sort-btn')).toBeVisible()
  await expect(page.getByTestId('explorations-new-btn')).toBeVisible()
  await page.getByTestId('explorations-new-btn').click()
  await expect(page.locator('#pane-left')).toContainText('New exploration')
  await page.getByTitle('Basic Data - Age').click()
  await page.getByRole('button', { name: '' }).click()
  await page.getByRole('menu').getByText('Age').click()
  await page.locator('div:nth-child(11) > .bs-checkbox > .bs-checkbox__input').click()
  await page.getByRole('button', { name: '' }).click()
  await page.getByTitle('Basic Data - Age').click()
  await page.getByRole('textbox').fill('[35-80]')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByRole('tabpanel')).toContainText('Age')
  await expect(page.locator('#optional-nav')).toContainText('Inclusion')
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - button "↺"
    - button "Add Filters":
      - button "Add Filters"
    - button "Save"
    `)
  await page.getByRole('button', { name: 'Add Filters' }).nth(1).click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await expect(page.locator('#app')).toMatchAriaSnapshot(
    `- text: "A filter card has been added: Condition Occurrence A"`
  )
  await expect(page.locator('#pane-left')).toContainText('Condition Occurrence')
  await expect(page.locator('[id="patient.interactions.conditionoccurrence.1"]')).toContainText('Condition concept set')
  await expect(page.locator('[id="patient.interactions.conditionoccurrence.1"]')).toMatchAriaSnapshot(`- button "+"`)
  await expect(page.getByTestId('terminology-container')).toMatchAriaSnapshot(`- text: Concept Sets x`)
  await expect(page.getByRole('tablist')).toMatchAriaSnapshot(`
    - tablist:
      - tab "Search" [selected]
      - tab "Selected concepts"
      - tab "Related concepts"
    `)
  await expect(page.getByTestId('terminology-container')).toMatchAriaSnapshot(`
    - paragraph: "Name:"
    - textbox "Concept set name"
    - checkbox "Shared"
    - text: Shared
    - button "Create"
    - button "Close"
    `)
  await page.getByRole('textbox', { name: 'Concept set name' }).click()
  await page.getByRole('textbox', { name: 'Concept set name' }).fill('Type 2 diabetes Mellitus')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.locator('[id="patient.interactions.conditionoccurrence.1"]')).toMatchAriaSnapshot(
    `- text: Type 2 diabetes Mellitus`
  )
  // The allow-sharing checkbox moved out of the save dialog into the filter card
  // footer (and from appCheckbox to a v-checkbox), so set it before opening the
  // dialog and drop it from the dialog's aria snapshot.
  await page.getByTestId('pa-share-cohort-checkbox').click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#pane-left')).toContainText('Save Current Filters')
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: Enter a new name if you would like to overwrite the current name (New cohort).
    - textbox "Enter name"
    `)
  await page.getByRole('textbox', { name: 'Enter name' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill('Cohort Test')
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#app')).toMatchAriaSnapshot(`- text: Filters saved.`)
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.locator('#pane-left')).toContainText('Cohort Test')
  await page.getByText('Cohort Test0. Icons/').click()
  await page.locator('.modal-wrapper').click()
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await explorationMenuAction(page, 'Cohort Test', 'Delete')
  await expect(page.locator('#pane-left')).toContainText('Delete filter?')
  await expect(page.locator('#pane-left')).toContainText(
    'Deleting this saved filter will delete any access point that you generated for it.'
  )
  await confirmExplorationDialog(page)
  await expect(page.locator('#app')).toMatchAriaSnapshot(`- text: Saved filter deleted.`)
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
})
