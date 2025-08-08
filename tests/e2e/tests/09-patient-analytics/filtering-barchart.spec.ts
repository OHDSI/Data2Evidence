import { test, expect } from '@playwright/test'

const CONCEPT_SET_DELAY = 5000 // Delay to wait for concept set creation
const CHART_UPDATE_DELAY = 5000 // Delay to wait for chart updates

const TEST_NAME = 'filtering-barchart'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto(`https://localhost:443/portal`)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Select demo dataset, open cohorts
  await page.getByText('Demo datasetDemo datasetTotal').click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
  await expect(page.getByText('2694 / 2694')).toBeVisible()
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Add filter card
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await expect(page.getByText('A filter card has been added: Condition Occurrence A')).toBeVisible()
  await expect(page.locator('#pane-left')).toContainText('Condition Occurrence A')

  // Create concept set
  await page.getByRole('button', { name: '+' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('Sinusitis')
  await page.getByRole('button', { name: 'Search' }).click()
  await page.getByRole('row', { name: '257012 40055000 Chronic' }).locator('path').click()
  await page.getByRole('row', { name: '4294548 75498004 Acute' }).locator('path').click()
  await expect(page.getByRole('tablist')).toContainText('2')
  await page.getByRole('tab', { name: 'Selected concepts' }).click()
  await expect(page.locator('tbody')).toContainText('257012')
  await expect(page.locator('tbody')).toContainText('4294548')

  // Save concept set
  await page.getByRole('textbox', { name: 'Concept set name' }).fill('Sinusitis')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.waitForTimeout(CONCEPT_SET_DELAY)
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('1132 / 2694')).toBeVisible()
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Set X1-axis to condition concept name
  await page.locator('div.axis-menu-button-wrapper').first().getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Condition Occurrence A').click()
  await page.locator('#pane-right').getByText('Condition concept Name').click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Filter condition concept name to chronic sinusitis
  await page.getByText('All').nth(2).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Chronic sinusitis')
  await page.getByText('Chronic sinusitis - Chronic').click()
  await expect(page.getByText('812 / 2694')).toBeVisible()
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Set X1-axis to gender
  await page.locator('div.axis-menu-button-wrapper').first().getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').click()
  await page.locator('#pane-right').getByText('Gender').nth(2).click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Set Y-axis to month of birth
  await page.locator('div.axis-menu-button-wrapper').nth(6).getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').nth(1).click()
  await page.locator('div.dropdownmenu-container').getByText('Month of Birth').nth(1).click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Set Y-axis to patient count
  await page.locator('div.axis-menu-button-wrapper').nth(6).getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').nth(1).click()
  await page.locator('div.dropdownmenu-container').getByText('Patient Count').first().click()

  // Set X1-axis to condition concept name
  await page.locator('div.axis-menu-button-wrapper').first().getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Condition Occurrence A').click()
  await page.locator('#pane-right').getByText('Condition concept Name').click()

  // Remove condition concept name value in filter card
  await page.getByTitle('Condition Occurrence A - Condition concept Name').locator('i').click()

  // Set X2-axis to race concept id
  await page.locator('div.axis-menu-button-wrapper').nth(2).getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').nth(1).click()
  await page.locator('#pane-right').getByText('Race concept id').click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixelRatio: 0.02 })

  // Set X2-axis to year of birth with bin size of 50
  await page.locator('div.axis-menu-button-wrapper').nth(2).getByRole('button').first().click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').nth(1).click()
  await page.locator('#pane-right').getByText('Year of Birth').first().click()
  await page.locator('button.binningButton').nth(1).click()
  await page.getByRole('textbox', { name: 'Size of the Bins' }).fill('50')
  await page.getByRole('textbox', { name: 'Size of the Bins' }).press('Enter')
  await page.locator('.modal-wrapper').click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixelRatio: 0.02 })

  // Reset X2-axis
  await page.locator('div.axis-menu-button-wrapper').nth(2).getByRole('button').first().click()
  await page.locator('div.dropdownmenu-container').getByText('Reset Selection').nth(1).click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixelRatio: 0.02 })

  // Set attribute for stacked chart
  await page.locator('div.axis-menu-button-wrapper').nth(4).getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').nth(2).click()
  await page.locator('#pane-right').getByText('Month of Birth').first().click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Set month of birth to 11 in filter card
  await page.getByTitle('Basic Data - Month of Birth').first().click()
  await page.getByRole('textbox').fill('11')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByText('115 / 2694')).toBeVisible()
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Remove condition occurrence filter card
  await page.locator('span[title="Select Filter Attributes"]').nth(1).click()
  await page.getByRole('menuitem').getByText('Remove Filter Card').click()
  await expect(page.getByText('247 / 2694')).toBeVisible()
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Switch to list view
  await page.locator('button.chartButton').nth(1).click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Export to ZIP file
  await page.locator('button.toolbarButton').nth(1).click()
  await page.getByRole('menuitem').getByText('Export to ZIP File').click()
  await page.locator('span.buttonContent').nth(1).click()
  await page.waitForTimeout(5000) // Wait for download to complete
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 }) // Not sure what to expect

  // Switch to chart view
  await page.locator('button.chartButton').first().click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Reset filter card
  await page.getByRole('button', { name: '↺' }).click()
  await page.locator('button[title="Reset"]').click()
  await page.waitForTimeout(CHART_UPDATE_DELAY)
  await expect.soft(page).toHaveScreenshot({ maxDiffPixels: 100 })
})
