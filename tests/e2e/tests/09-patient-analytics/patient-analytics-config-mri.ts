import { test, expect } from '@playwright/test'

const TEST_NAME = 'patient_analytics_mri'
const SHOULD_SKIP = false
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
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: "Create Cohort:"
    - button "D2E"
    - button "Atlas"
    - button "Import"
    - button "Compare" [disabled]
    - text: Shared
    - checkbox
    `)
  await page.getByRole('button', { name: 'D2E' }).click()
  await expect(page.locator('#pane-left')).toContainText('New cohort')
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
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#pane-left')).toContainText('Save Current Filters')
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: Enter a new name if you would like to overwrite the current name (New cohort).
    - textbox "Enter name"
    - text: Allow sharing
    `)
  await page.locator('.app-checkbox-container').click()
  await page.getByRole('textbox', { name: 'Enter name' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill('Cohort Test')
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#app')).toMatchAriaSnapshot(`- text: Filters saved.`)
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.locator('#pane-left')).toContainText('Cohort Test')
  await page.getByText('Cohort Test0. Icons/').click()
  await page.locator('.modal-wrapper').click()
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await page.locator('div:nth-child(5) > svg').first().click()
  await expect(page.locator('#pane-left')).toContainText('Delete Saved Filter')
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(
    `- text: Deleting this saved filter will delete any access points that you generated for it. Are you sure you want to delete?`
  )
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('#app')).toMatchAriaSnapshot(`- text: Saved filter deleted.`)
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
})
