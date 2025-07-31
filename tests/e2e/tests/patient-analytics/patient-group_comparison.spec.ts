import { test, expect } from '@playwright/test'



test('cohort-generation', async ({ page }) => {
  test.slow();
  // Generate unique cohort name to avoid conflicts with other tests
  const cohortA = `CohortA_${new Date().getTime()}`
  const cohortB = `CohortB_${new Date().getTime()}`

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
  await page.waitForTimeout(5000)

  // ========================
  // DATASET SELECTION AND NAVIGATION
  // ========================
  // Select the demo dataset for testing
  await page.getByText('Demo dataset').first().click()
  // Navigate to the Cohorts section for patient analytics
  await page.getByRole('link', { name: 'Cohorts' }).click()

  await page.waitForTimeout(10000)
  await createCohortWithOneConditionOccurrenceFilercard(page, cohortA);
  await addAgeFilter(page, '[35-80]')
  await page.waitForTimeout(3000)
  // do not add the concept set for "Acute allergic reaction"
  // await createConceptSet(page, 'Acute allergic reaction', 'Acute allergic reaction', '4084167 241929008 Acute')
  
  // ========================
  // COHORT RESULTS VERIFICATION
  // ========================
  // Verify that the combined filters (age 35-80 + acute allergic reaction) result in 104 patients
  await expect(page.locator('#pane-right')).toContainText('2223')
  
  // Save the final cohort configuration
  await page.getByRole('button', { name: 'Save' }).click()
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#app')).toContainText('Saved filter updated.')

  // Navigate back to the cohorts list
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click();
  await page.getByTitle('Enter Fullscreen').click();
  await expect(page.locator('#pane-left')).toContainText(cohortA);

  // Cohort B creation: with Condition Occurrence A filtercard
  await page.waitForTimeout(10000)
  await createCohortWithOneConditionOccurrenceFilercard(page, cohortB);
  await addAgeFilter(page, '[10-50]')
  await page.waitForTimeout(3000)
  await expect(page.locator('#pane-right')).toContainText('358')

  // Add Condition Occurrence B filter card
  // await page.getByTitle('Add Filter Card').getByRole('button').click();
  // await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click();
  // add a new concept set for "Acute allergic reaction"
  // await createConceptSet(page, 'Acute allergic reaction', 'Acute allergic reaction', '4084167 241929008 Acute')

  // Save the final cohort configuration
  await page.getByRole('button', { name: 'Save' }).click()
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#app')).toContainText('Saved filter updated.')

  // Navigate back to the cohorts list
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click();
  await page.getByTitle('Enter Fullscreen').click();
  await expect(page.locator('#pane-left')).toContainText(cohortB);

  await page.locator('div:nth-child(1) > .footer > div > svg').first().click();
  await page.locator('div:nth-child(2) > .footer > div > svg').first().click();
  await expect(page.getByRole('button', { name: 'Compare' })).toBeEnabled();

  await page.getByRole('button', { name: 'Compare' }).click();
  await page.waitForTimeout(10000);
  await page.getByTitle('Export to File').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#pane-left').getByText('Export to PNG File').click();
  const download = await downloadPromise;

  // Verify the downloaded file is a PNG
  expect(download.suggestedFilename()).toMatch(/\.png$/);

  // ========================
  // CLEANUP SECTION
  // ========================
  // Navigate back to cohorts list and delete the specific test cohort
  await page.getByRole('button', { name: 'Close' }).click()
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()

  // Find and delete the specific cohort by name to avoid deleting wrong cohorts
  // The delete button is the last img element in the action buttons container for each cohort
  // Navigate from cohort title to its parent container, then to the action buttons container
  // await page.locator('.footer > div:nth-child(5)').first().click()
  // await page.getByRole('button', { name: 'Delete' }).click()

  await page.getByTitle('Delete Saved Filter').first().click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByTitle('Delete Saved Filter').nth(1)
  await page.getByRole('button', { name: 'Delete' }).click();
  
  await expect(page.getByText('You have not yet saved any')).toBeVisible();
})

async function createCohortWithOneConditionOccurrenceFilercard(page, cohortName) {
// ========================
  // COHORT CREATION SECTION
  // ========================
  // Start creating a new cohort using D2E cohort builder
  await page.getByRole('button', { name: 'D2E' }).click()
  await expect(page.locator('#pane-left')).toContainText('New cohort')

  // Save the initial cohort configuration
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(5000)

  // Configure cohort sharing settings
  await page
    .locator('div')
    .filter({ hasText: /^Allow sharing$/ })
    .first()
    .click()

  // Name the cohort with unique timestamp-based name and save
  await page.getByRole('textbox', { name: 'Enter name' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill(cohortName)
  await page.waitForTimeout(10000)
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  // await expect(page.locator('#pane-left')).toContainText(cohortName)

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
}

async function addAgeFilter(page, ageRange) {
  // ========================
  // AGE FILTER CONFIGURATION
  // ========================
  // Add age restriction filter: patients between 35-80 years old
  await page.getByTitle('Basic Data - Age').click()
  await page.getByRole('textbox').fill(ageRange)
  await page.getByRole('textbox').press('Enter')

  await page.waitForTimeout(3000)
}
async function createConceptSet(page, conceptSetName, searchTerm, conceptIdRowName) {
  // ========================
  // CONCEPT SET CREATION
  // ========================
  // Create a new concept set for "Acute allergic reaction"
  await page.getByRole('button', { name: '+' }).click()
  await page.getByRole('textbox', { name: 'Concept set name' }).click()
  await page.getByRole('textbox', { name: 'Concept set name' }).fill(conceptSetName)

  // Search for the acute allergic reaction concept in the OMOP vocabulary
  await page.getByRole('textbox', { name: 'search terms' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill(searchTerm)
  await page.getByRole('textbox', { name: 'search terms' }).press('Enter')

  // Select the specific concept (ID: 4084167, SNOMED: 241929008)
  await page.getByRole('row', { name: conceptIdRowName }).getByRole('img').click()

  // Create the concept set and verify it's ready for use
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Update' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
}