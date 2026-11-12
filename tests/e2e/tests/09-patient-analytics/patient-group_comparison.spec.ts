import { test, expect, openAtlasDataExploration } from '../fixtures'
import { confirmExplorationDialog, explorationCard, explorationMenuAction } from '../explorations'

test('pa-compare-cohorts', async ({ page }) => {
  test.slow()
  // Generate unique cohort name to avoid conflicts with other tests
  const cohortA = `CohortA_${new Date().getTime()}`
  const cohortB = `CohortB_${new Date().getTime()}`
  const createdCohorts: string[] = []

  try {

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
  await openAtlasDataExploration(page)
  await createCohortWithOneConditionOccurrenceFilercard(page, cohortA)
  createdCohorts.push(cohortA)
  await addMonthOfBirthFilter(page, '[1-2]')
  // do not add the concept set for "Acute allergic reaction"
  // await createConceptSet(page, 'Acute allergic reaction', 'Acute allergic reaction', '4084167 241929008 Acute')

  // ========================
  // COHORT RESULTS VERIFICATION
  // ========================
  // Verify that the combined filters (age 35-80 + acute allergic reaction) result in 104 patients
  await expect(page.locator('#pane-right')).toContainText('439')

  // Save the final cohort configuration
  // Re-saving an already-saved cohort owned by the current user no longer opens the
  // naming dialog - FiltersFooter.openSaveBookmark() only does that when
  // needsSaveDialog (isNewCohort || isNotUserSharedBookmark) is true.
  await saveUpdatedCohort(page)

  // Navigate back to the cohorts list
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  // The fullscreen toggle expanded the old bookmark list inside the builder's
  // pane. The exploration list replaces that pane, so there is nothing to
  // expand and no such control.
  await expect(explorationCard(page, cohortA)).toBeVisible()

  // Cohort B creation: with Condition Occurrence A filtercard
  await createCohortWithOneConditionOccurrenceFilercard(page, cohortB)
  createdCohorts.push(cohortB)
  await addMonthOfBirthFilter(page, '[2-4]')
  await expect(page.locator('#pane-right')).toContainText('642')

  // Add Condition Occurrence B filter card
  // await page.getByTitle('Add Filter Card').getByRole('button').click();
  // await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click();
  // add a new concept set for "Acute allergic reaction"
  // await createConceptSet(page, 'Acute allergic reaction', 'Acute allergic reaction', '4084167 241929008 Acute')

  // Save the final cohort configuration
  // Re-saving an already-saved cohort owned by the current user no longer opens the
  // naming dialog - FiltersFooter.openSaveBookmark() only does that when
  // needsSaveDialog (isNewCohort || isNotUserSharedBookmark) is true.
  await saveUpdatedCohort(page)

  // Navigate back to the cohorts list
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  // The fullscreen toggle expanded the old bookmark list inside the builder's
  // pane. The exploration list replaces that pane, so there is nothing to
  // expand and no such control.
  await expect(explorationCard(page, cohortB)).toBeVisible()

  // Selection moved from an icon in each card's footer to a checkbox on the
  // card, and Compare moved from the page header into the bulk-actions bar
  // that appears once something is selected. The bar's button keeps the
  // 'Compare' label, so only the selection changes here.
  // Naming the cohorts beats positional selectors: the list sorts by last
  // updated, so nth-child(1) and (2) were never guaranteed to be these two.
  await page.getByRole('checkbox', { name: `Select exploration ${cohortA}` }).check()
  await page.getByRole('checkbox', { name: `Select exploration ${cohortB}` }).check()
  await expect(page.getByRole('button', { name: 'Compare' })).toBeEnabled()

  await page.getByRole('button', { name: 'Compare' }).click()

  // Verify the comparison modal is visible
  const compareModal = page.getByTestId('pa-compare-modal')
  await expect(compareModal).toBeVisible()
  await expect(compareModal.locator('.loading-animation-component')).toBeHidden()
  await expect(
    compareModal
      .locator('#columnbar-chart svg')
      .filter({ hasText: cohortA })
      .filter({ hasText: cohortB })
  ).toBeVisible()
  await expect(compareModal).toContainText(cohortA)
  await expect(compareModal).toContainText(cohortB)
  await page.locator('.mainChartToolbar').getByTitle('Export to File').click()

  const downloadPromise = page.waitForEvent('download')
  // The download menu renders inline in the chart toolbar
  // (CohortComparisonContainer.vue: .mainChartToolbar > .download-wrapper).
  // The Compare modal opens over the Data Exploration list, which has no
  // `#pane-left`, so the old scope matched nothing.
  await page.locator('.mainChartToolbar').getByText('Export to PNG File').click()
  const download = await downloadPromise
  // the downloaded PNG should be prefixed with the active cohort and follows {cohortName}_{chartType}_{DD-MM-YYYY}.png format
  expect(download.suggestedFilename()).toMatch(new RegExp(`^${cohortB}_.*\\d{2}-\\d{2}-\\d{4}\\.png$`))
  } finally {
    await cleanupCreatedCohorts(page, createdCohorts)
  }
})

async function createCohortWithOneConditionOccurrenceFilercard(page, cohortName) {
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

async function saveUpdatedCohort(page) {
  const savedToast = page.getByText('Saved filter updated.', { exact: true })
  await page.getByTestId('pa-save-cohort-btn').click()
  await expect(savedToast).toBeVisible()
  await expect(savedToast).toBeHidden()
}

async function cleanupCreatedCohorts(page, cohortNames: string[]) {
  if (cohortNames.length === 0) return

  const compareModal = page.getByTestId('pa-compare-modal')
  if (await compareModal.isVisible().catch(() => false)) {
    await compareModal.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(compareModal).toBeHidden()
  }

  const cohortsLink = page.locator('#pane-left').getByRole('link', { name: 'Cohorts' })
  if (await cohortsLink.isVisible().catch(() => false)) {
    await cohortsLink.click()
  }

  for (const cohortName of cohortNames) {
    const checkbox = page.getByRole('checkbox', { name: `Select exploration ${cohortName}` })
    if (await checkbox.isChecked().catch(() => false)) {
      await checkbox.uncheck()
    }
  }

  await expect(page.getByTestId('explorations-bulk-bar')).toBeHidden()

  for (const cohortName of cohortNames) {
    const card = explorationCard(page, cohortName)
    if (!(await card.isVisible().catch(() => false))) continue

    await explorationMenuAction(page, cohortName, 'Delete')
    await confirmExplorationDialog(page)
    await expect(card).toBeHidden()
  }
}

async function addMonthOfBirthFilter(page, ageRange) {
  // ========================
  // AGE FILTER CONFIGURATION
  // ========================
  const basicData = page.getByRole('tab', { name: /Basic Data/ })
  const attributeMenu = basicData.getByTitle('Select Filter Attributes')
  await attributeMenu.click()
  await page.getByRole('menu').getByText('Month of Birth', { exact: true }).click()
  await attributeMenu.click()
  const monthOfBirthFilter = page.getByTitle('Basic Data - Month of Birth')
  await monthOfBirthFilter.click()
  await monthOfBirthFilter.getByRole('textbox').fill(ageRange)
  await monthOfBirthFilter.getByRole('textbox').press('Enter')
}

async function createConceptSet(page, conceptSetName, searchTerm, conceptIdRowName) {
  // ========================
  // CONCEPT SET CREATION
  // ========================
  // Create a new concept set for "Acute allergic reaction"
  await page.getByRole('button', { name: '+' }).click()
  await page.getByRole('textbox', { name: 'Name' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill(conceptSetName)

  // Search for the acute allergic reaction concept in the OMOP vocabulary
  await page.getByRole('textbox', { name: 'Search', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search', exact: true }).fill(searchTerm)
  await page.getByRole('textbox', { name: 'Search', exact: true }).press('Enter')

  // Select the specific concept (ID: 4084167, SNOMED: 241929008)
  await page.getByRole('row', { name: conceptIdRowName }).getByRole('checkbox').check()
  await page.getByTestId('add-selected').click()

  // Create the concept set and verify it's ready for use
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Update' })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
}
