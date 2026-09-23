import { test, expect } from '../fixtures'
import { deleteExploration } from '../explorations'

const TEST_NAME = 'cohort-generation'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test('cohort-generation', async ({ page }) => {
  // Generate unique cohort name to avoid conflicts with other tests
  const timestamp = Date.now()
  const cohortName = `TestCohort_${timestamp}`

  // ========================
  // AUTHENTICATION SECTION
  // ========================
  // Navigate to the D2E portal login page
  await page.goto('/d2e/portal')

  // Fill in admin credentials and sign in
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // ========================
  // DATASET SELECTION AND NAVIGATION
  // ========================
  // Select the demo dataset for testing
  await page.getByText('Demo dataset').first().click()

  // Navigate to the Cohorts section for patient analytics
  await page.getByRole('link', { name: 'Cohorts' }).click()

  // ========================
  // COHORT CREATION SECTION
  // ========================
  // Start creating a new cohort using D2E cohort builder
  await page.getByTestId('explorations-new-btn').click()
  await expect(page.locator('#pane-left')).toContainText('New exploration')

  // Configure cohort sharing settings. The allow-sharing checkbox now lives in the
  // filter card footer instead of the save dialog, so it has to be set before the
  // dialog opens - once open, the modal overlay intercepts the click.
  await page.getByTestId('pa-share-cohort-checkbox').click()

  // Save the initial cohort configuration
  await page.getByTestId('pa-save-cohort-btn').click()

  // Name the cohort with unique timestamp-based name and save
  await page.getByRole('textbox', { name: 'Enter name' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill(cohortName)
  await page.getByTestId('pa-save-dialog-save-btn').click()
  await expect(page.locator('#pane-left')).toContainText(cohortName)

  // ========================
  // AGE FILTER CONFIGURATION
  // ========================
  // Add age restriction filter: patients between 35-80 years old
  await page.getByTitle('Basic Data - Age').click()
  await page.getByRole('textbox').fill('[35-80]')
  await page.getByRole('textbox').press('Enter')

  // Verify that age filter results in 2223 patients
  await expect(page.locator('#pane-right')).toContainText('2,223')

  // ========================
  // CONDITION OCCURRENCE FILTER
  // ========================
  // Add a new condition occurrence filter to further narrow the cohort
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()

  // Verify the condition occurrence filter was added
  await expect(page.locator('#pane-left')).toContainText('Condition Occurrence A')
  await expect(page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]')).toContainText(
    'Condition concept set'
  )

  // ========================
  // CONCEPT SET CREATION
  // ========================
  // Create a new concept set for "Acute allergic reaction"
  await page.getByRole('button', { name: '+' }).click()
  await page.getByRole('textbox', { name: 'Concept set name' }).click()
  await page.getByRole('textbox', { name: 'Concept set name' }).fill('Acute allergic reaction')

  // Search for the acute allergic reaction concept in the OMOP vocabulary
  await page.getByRole('textbox', { name: 'search terms' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('Acute allergic reaction')
  await page.getByRole('textbox', { name: 'search terms' }).press('Enter')

  // Select the specific concept (ID: 4084167, SNOMED: 241929008)
  await page.getByRole('row', { name: '4084167 241929008 Acute' }).getByRole('img').click()

  // Create the concept set and verify it's ready for use
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Update' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()

  // ========================
  // COHORT RESULTS VERIFICATION
  // ========================
  // Verify that the combined filters (age 35-80 + acute allergic reaction) result in 104 patients
  await expect(page.locator('#pane-right')).toContainText('104')

  // Save the final cohort configuration
  // Re-saving an already-saved cohort owned by the current user no longer opens the
  // naming dialog - FiltersFooter.openSaveBookmark() only does that when
  // needsSaveDialog (isNewCohort || isNotUserSharedBookmark) is true.
  await page.getByTestId('pa-save-cohort-btn').click()
  await expect(page.locator('#app')).toContainText('Saved filter updated.')

  // ========================
  // CLEANUP SECTION
  // ========================
  // Navigate back to cohorts list and delete the specific test cohort
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()

  // Delete by name. The old selector took the fifth icon of the first card's
  // footer, which was the delete action only by position - and only ever
  // deleted the first card, despite the comment.
  await deleteExploration(page, cohortName)
})
