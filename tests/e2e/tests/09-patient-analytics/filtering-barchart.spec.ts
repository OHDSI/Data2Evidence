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
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // Wait for chart animations to settle
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot()

  // Add filter card
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await expect(page.getByText('A filter card has been added: Condition Occurrence A')).toBeVisible()
  await expect(page.locator('#pane-left')).toContainText('Condition Occurrence A')
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()

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
    await page.locator('.modal-wrapper').click()
  } catch {
    // Modal not present, continue
  }

  // Wait for notification to fade away
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot()

  // reset x2-axis
  await page
    .locator('div.axis-menu-button-wrapper')
    .getByRole('button', { name: 'Basic Data Month of Birth ◢' })
    .click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Reset Selection').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()

  // Set X1-axis to condition concept name
  await page
    .locator('.axis-group--bottom .axis-subgroup')
    .last()
    .locator('button.axisMenuButton', { hasText: 'Gender' })
    .click()
  await page
    .locator('div.dropdownmenu-container .menuWrapper:not(.closed)')
    .getByRole('list')
    .getByText('Condition Occurrence A')
    .click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Condition concept Name').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Filter condition concept name to chronic sinusitis
  await page.getByText('All').nth(2).click()
  await page
    .getByTitle('Condition Occurrence A - Condition concept Name')
    .getByPlaceholder('Enter search term')
    .fill('Chronic sinusitis')
  await page.getByText('Chronic sinusitis - Chronic sinusitis').click()
  await expect(page.getByText('812 / 2,694')).toBeVisible()
  // Wait for dropdown to populate properly
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot()

  // Set X1-axis to gender
  await page.locator('.axis-group--bottom .axis-subgroup').last().locator('button.axisMenuButton').nth(1).click()
  await page
    .locator('div.dropdownmenu-container .menuWrapper:not(.closed)')
    .getByRole('list')
    .getByText('Basic Data')
    .click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Gender').nth(2).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // TODO: requires debugging of screenshot hence using maxDiffPixelRatio
  await expect(page).toHaveScreenshot()

  // Set Y-axis to month of birth
  await page.locator('.axis-group--top').getByRole('button', { name: 'Basic Data Patient Count ◢' }).click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Basic Data').click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Month of Birth').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Set Y-axis to patient count
  await page.locator('.axis-group--top').getByRole('button', { name: 'Basic Data Month of Birth ◢' }).click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Basic Data').click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Patient Count').click()

  // Set X1-axis to condition concept name
  await page.locator('.axis-group--bottom .axis-subgroup').last().locator('button.axisMenuButton').nth(1).click()
  await page
    .locator('div.dropdownmenu-container .menuWrapper:not(.closed)')
    .getByRole('list')
    .getByText('Condition Occurrence A')
    .click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Condition concept Name').click()

  // Remove condition concept name value in filter card
  await page.getByTitle('Condition Occurrence A - Condition concept Name').locator('i').click()

  // Set X2-axis to race concept id
  await page.locator('.axis-group--bottom .axis-subgroup').last().locator('button.axisMenuButton').first().click()
  await page
    .locator('div.dropdownmenu-container .menuWrapper:not(.closed)')
    .getByRole('listitem')
    .filter({ hasText: 'Basic Data' })
    .last()
    .click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Race concept id').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Set X2-axis to year of birth with bin size of 50
  await page.locator('.axis-group--bottom .axis-subgroup').last().locator('button.axisMenuButton').first().click()
  await page
    .locator('div.dropdownmenu-container .menuWrapper:not(.closed)')
    .getByRole('listitem')
    .filter({ hasText: 'Basic Data' })
    .last()
    .click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Year of Birth').click()
  await page.locator('.axis-group--bottom .axis-subgroup').last().locator('button.binningButton').first().click()
  await page.getByRole('textbox', { name: 'Size of the Bins' }).fill('50')
  await page.getByRole('textbox', { name: 'Size of the Bins' }).press('Enter')
  await page.locator('.modal-wrapper').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Reset X2-axis
  await page.locator('.axis-group--bottom .axis-subgroup').last().locator('button.axisMenuButton').first().click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Reset Selection').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Set X3-axis attribute (was rendered as last bottom axis; originally captioned "stacked chart")
  await page.locator('.axis-group--bottom .axis-subgroup').last().locator('button.axisMenuButton').last().click()
  await page
    .locator('div.dropdownmenu-container .menuWrapper:not(.closed)')
    .getByRole('listitem')
    .filter({ hasText: 'Basic Data' })
    .last()
    .click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Month of Birth').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Set month of birth to 11 in filter card
  await page.getByTitle('Basic Data - Month of Birth').first().click()
  await page.getByTitle('Basic Data - Month of Birth').getByRole('textbox').fill('11')
  await page.getByTitle('Basic Data - Month of Birth').getByRole('textbox').press('Enter')
  await expect(page.getByText('115 / 2,694')).toBeVisible()
  await expect(page).toHaveScreenshot()

  // Remove condition occurrence filter card
  await page.locator('span[title="Select Filter Attributes"]').nth(1).click()
  await page.getByRole('menuitem').getByText('Remove Filter Card').click()
  await expect(page.getByText('247 / 2,694')).toBeVisible()
  await expect(page).toHaveScreenshot()

  // Switch to list view
  await page.locator('button.chartButton').nth(1).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await page.getByRole('cell', { name: 'Person id' }).locator('span').nth(1).click()
  await page.getByText('Sort Ascending').click()
  // Sorting re-fetches the patient list; wait for the loader to clear before the
  // screenshot, otherwise it captures the faded, still-loading (unsorted) table.
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Export to ZIP file
  await page.locator('.download-menu-container').getByTitle('Export to File').click()
  await page.getByRole('menuitem').getByText('Export to ZIP File').click()
  await expect(page.getByText('ZIP file exported successfully')).toBeVisible()
  await expect(page.getByText('ZIP file exported successfully')).toBeHidden()

  // Switch to chart view
  await page.locator('button.chartButton').first().click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()

  // Reset filter card
  await page.getByRole('button', { name: '↺' }).click()
  await page.locator('button[title="Reset"]').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot()
})
