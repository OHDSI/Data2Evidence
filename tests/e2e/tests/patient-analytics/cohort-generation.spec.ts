import { test, expect } from '@playwright/test'

test('cohort-generation', async ({ page }) => {
  // Generate unique cohort name to avoid conflicts with other tests
  const timestamp = Date.now()
  const cohortName = `TestCohort_${timestamp}`

  // ========================
  // AUTHENTICATION SECTION
  // ========================
  // Navigate to the D2E portal login page
  await page.goto('https://localhost:443')

  // Fill in admin credentials and sign in
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="identifier"]').press('Tab')
  await page.getByRole('button').filter({ hasText: /^$/ }).press('Tab')
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
  await page.getByRole('button', { name: 'D2E' }).click()
  await expect(page.locator('#pane-left')).toContainText('New cohort')

  // Save the initial cohort configuration
  await page.getByRole('button', { name: 'Save' }).click()

  // Configure cohort sharing settings
  await page
    .locator('div')
    .filter({ hasText: /^Allow sharing$/ })
    .first()
    .click()

  // Name the cohort with unique timestamp-based name and save
  await page.getByRole('textbox', { name: 'Enter name' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill(cohortName)
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#pane-left')).toContainText(cohortName)

  // ========================
  // AGE FILTER CONFIGURATION
  // ========================
  // Add age restriction filter: patients between 35-80 years old
  await page.getByTitle('Basic Data - Age').click()
  await page.getByRole('textbox').fill('[35-80]')
  await page.getByRole('textbox').press('Enter')

  // Verify that age filter results in 2223 patients
  await expect(page.locator('#pane-right')).toContainText('2223')

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
  await page.getByRole('button', { name: 'Save' }).click()
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#app')).toContainText('Saved filter updated.')

  // ========================
  // CLEANUP SECTION
  // ========================
  // Navigate back to cohorts list and delete the specific test cohort
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()

  // Find and delete the specific cohort by name to avoid deleting wrong cohorts
  // The delete button is the last img element in the action buttons container for each cohort
  // Navigate from cohort title to its parent container, then to the action buttons container
  await page.locator('.footer > div:nth-child(5)').first().click()
  await page.getByRole('button', { name: 'Delete' }).click()
})
