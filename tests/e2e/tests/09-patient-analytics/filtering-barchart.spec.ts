import { test, expect } from '../fixtures'

const TEST_NAME = 'filtering-barchart'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  test.slow()
  // Sign in
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Select demo dataset, open cohorts
  await page.getByText('Demo datasetDemo datasetTotal').click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
  await expect(page.getByText('2,694 / 2,694')).toBeVisible()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  // Wait for chart animations to settle
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot()

  // Add filter card
  await page.getByTestId('pa-add-filter-btn').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await expect(page.getByText('A filter card has been added: Condition Occurrence A')).toBeVisible()
  await expect(page.getByTestId('pa-pane-left')).toContainText('Condition Occurrence A')
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()

  // Create concept set
  await page.getByRole('button', { name: '+' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('Sinusitis')
  await page.getByRole('button', { name: 'Search' }).click()

  // Wait for search results to settle to exactly 4 data rows
  await expect(page.locator('tr.MuiTableRow-root:not(.MuiTableRow-head)')).toHaveCount(4)

  await page
    .getByRole('row', { name: /40055000.*Chronic/ })
    .locator('td')
    .first()
    .click()
  await page
    .getByRole('row', { name: /75498004.*Acute/ })
    .locator('td')
    .first()
    .click()
  await expect(page.getByRole('tablist')).toContainText('2')
  await page.getByRole('tab', { name: 'Selected concepts' }).click()
  await expect(page.locator('tbody')).toContainText('257012')
  await expect(page.locator('tbody')).toContainText('4294548')

  // Save concept set
  await page.getByRole('textbox', { name: 'Concept set name' }).fill('Sinusitis')
  await page.getByRole('button', { name: 'Create' }).click()
  // Wait for concept set to be succesfully created
  await expect(page.getByRole('button', { name: 'Update' })).toBeEnabled()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('1,132 / 2,694')).toBeVisible()

  // Dismiss popover if present
  try {
    await page.mouse.move(0, 0)
    await page.getByTestId('pa-modal-wrapper').click()
  } catch {
    // Modal not present, continue
  }

  // Wait for notification to fade away
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot()

  // reset x2-axis
  await page.getByTestId('pa-axis-menu-btn-x2').click()
  await page.getByTestId('pa-dropdown-menu-x2').getByTestId('pa-axis-dropdown-item-Reset Selection').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()

  // Set X1-axis to condition concept name
  await page.getByTestId('pa-axis-menu-btn-x1').click()
  await page.getByTestId('pa-dropdown-menu-x1').getByTestId('pa-axis-dropdown-item-Condition Occurrence A').click()
  await page.getByTestId('pa-dropdown-menu-x1').getByTestId('pa-axis-dropdown-item-Condition concept Name').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Filter condition concept name to chronic sinusitis
  const conditionOccConceptName = page.getByTitle('Condition Occurrence A - Condition concept Name')
  await conditionOccConceptName.locator('div').filter({ hasText: /^All$/ }).click()
  await conditionOccConceptName.getByPlaceholder('Enter search term').click()
  await conditionOccConceptName.getByPlaceholder('Enter search term').fill('Chronic sinusitis')
  await page.getByText('Chronic sinusitis - Chronic sinusitis').click()
  await expect(page.getByText('812 / 2,694')).toBeVisible()
  // Wait for dropdown to populate properly
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot()

  // Set X1-axis to gender
  await page.getByTestId('pa-axis-menu-btn-x1').click()
  await page.getByTestId('pa-dropdown-menu-x1').getByTestId('pa-axis-dropdown-item-Basic Data').click()
  await page.getByTestId('pa-dropdown-menu-x1').getByTestId('pa-axis-dropdown-item-Gender').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  // TODO: requires debugging of screenshot hence using maxDiffPixelRatio
  await expect(page).toHaveScreenshot()

  // Set Y-axis to month of birth
  await page.getByTestId('pa-axis-menu-btn-y').click()
  await page.getByTestId('pa-dropdown-menu-y').getByTestId('pa-axis-dropdown-item-Basic Data').click()
  await page.getByTestId('pa-dropdown-menu-y').getByTestId('pa-axis-dropdown-item-Month of Birth').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Set Y-axis to patient count
  await page.getByTestId('pa-axis-menu-btn-y').click()
  await page.getByTestId('pa-dropdown-menu-y').getByTestId('pa-axis-dropdown-item-Basic Data').click()
  await page.getByTestId('pa-dropdown-menu-y').getByTestId('pa-axis-dropdown-item-Patient Count').click()

  // Set X1-axis to condition concept name
  await page.getByTestId('pa-axis-menu-btn-x1').click()
  await page.getByTestId('pa-dropdown-menu-x1').getByTestId('pa-axis-dropdown-item-Condition Occurrence A').click()
  await page.getByTestId('pa-dropdown-menu-x1').getByTestId('pa-axis-dropdown-item-Condition concept Name').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()

  // Remove condition concept name value in filter card
  await conditionOccConceptName.locator('i').click()

  // Set X2-axis to race concept id
  await page.getByTestId('pa-axis-menu-btn-x2').click()
  await page.getByTestId('pa-dropdown-menu-x2').getByTestId('pa-axis-dropdown-item-Basic Data').click()
  await page.getByTestId('pa-dropdown-menu-x2').getByTestId('pa-axis-dropdown-item-Race concept id').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Set X2-axis to year of birth with bin size of 50
  await page.getByTestId('pa-axis-menu-btn-x2').click()
  await page.getByTestId('pa-dropdown-menu-x2').getByTestId('pa-axis-dropdown-item-Basic Data').click()
  await page.getByTestId('pa-dropdown-menu-x2').getByTestId('pa-axis-dropdown-item-Year of Birth').click()
  await page.getByTestId('pa-binning-btn-x2').click()
  await page.getByRole('textbox', { name: 'Size of the Bins' }).click()
  await page.getByRole('textbox', { name: 'Size of the Bins' }).fill('50')
  await page.getByRole('textbox', { name: 'Size of the Bins' }).press('Enter')
  await page.getByTestId('pa-modal-wrapper').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Reset X2-axis
  await page.getByTestId('pa-axis-menu-btn-x2').click()
  await page.getByTestId('pa-dropdown-menu-x2').getByTestId('pa-axis-dropdown-item-Reset Selection').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Set X3-axis attribute (was rendered as last bottom axis; originally captioned "stacked chart")
  await page.getByTestId('pa-axis-menu-btn-stack').click()
  await page.getByTestId('pa-dropdown-menu-stack').getByTestId('pa-axis-dropdown-item-Basic Data').click()
  await page.getByTestId('pa-dropdown-menu-stack').getByTestId('pa-axis-dropdown-item-Month of Birth').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  await expect(page.getByText('Confirm Selection Change')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm' }).click()

  // Set month of birth to 11 in filter card
  const basicDataMonthOfBirth = page.getByTitle('Basic Data - Month of Birth')
  await page.getByTestId('pa-filter-card-patient').getByTestId('filter-card-menu-trigger').click()
  await basicDataMonthOfBirth.getByPlaceholder('Enter search term').fill('11')
  await basicDataMonthOfBirth.getByPlaceholder('Enter search term').press('Enter')
  await expect(page.getByText('115 / 2,694')).toBeVisible()
  await expect(page).toHaveScreenshot()

  // Remove condition occurrence filter card
  await page
    .getByTestId('pa-filter-card-patient-interactions-conditionoccurrence-1')
    .getByTestId('filter-card-menu-trigger')
    .click()
  await page.getByRole('menuitem', { name: 'Remove Filter Card' }).filter({ visible: true }).click()
  await expect(page.getByText('247 / 2,694')).toBeVisible()
  await expect(page).toHaveScreenshot()

  // Switch to list view
  await page.getByTestId('pa-chart-btn-list').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await page.getByRole('cell', { name: 'Person id' }).locator('span').nth(1).click()
  await page.getByText('Sort Ascending').click()
  await expect(page).toHaveScreenshot()

  // Export to ZIP file
  await page.getByTestId('pa-download-menu-btn').click()
  await page.locator('.download-menu-container').getByTitle('Export to File').click()
  await page.getByRole('menuitem').getByText('Export to ZIP File').click()
  await expect(page.getByText('ZIP file exported successfully')).toBeVisible()
  await expect(page.getByText('ZIP file exported successfully')).toBeHidden()

  // Switch to chart view
  await page.getByTestId('pa-chart-btn-stacked').click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Reset filter card
  await page.getByTestId('pa-reset-filters-btn').click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  await expect(page).toHaveScreenshot()
})
