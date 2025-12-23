import { test, expect } from '@playwright/test'

const TEST_NAME = 'filtering-barchart'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

let screenshotCounter = 0
async function takeScreenshot(page: any, testInfo: any) {
  screenshotCounter++
  const screenshotPath = testInfo.outputPath(`${TEST_NAME}-${screenshotCounter}-linux.png`)
  await page.screenshot({ path: screenshotPath })
}

test(TEST_NAME, async ({ page }, testInfo) => {
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
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await takeScreenshot(page, testInfo)

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

  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Set X1-axis to condition concept name
  await page.locator('div.axis-menu-button-wrapper').first().getByRole('button', { name: 'Basic Data Age ◢' }).click()
  await page.locator('div.dropdownmenu-container').getByText('Condition Occurrence A').click()
  await page.locator('#pane-right').getByText('Condition concept Name').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Filter condition concept name to chronic sinusitis
  await page.getByText('All').nth(2).click()
  await page
    .getByTitle('Condition Occurrence A - Condition concept Name')
    .getByPlaceholder('Enter search term')
    .fill('Chronic sinusitis')
  await page.getByText('Chronic sinusitis - Chronic sinusitis').click()
  await expect(page.getByText('812 / 2,694')).toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Set X1-axis to gender
  await page.getByRole('button', { name: 'Basic Data Gender ◢' }).click()
  await page.locator('#pane-right').getByRole('list').getByText('Reset Selection').click()
  await page.locator('div.axis-menu-button-wrapper').first().getByRole('button').click()
  await page.locator('#pane-right').getByRole('list').getByText('Basic Data').click()
  await page.locator('#pane-right').getByText('Gender').nth(2).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Set Y-axis to month of birth
  await page.locator('div.axis-menu-button-wrapper').nth(6).getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').last().click()
  await page.locator('div.dropdownmenu-container').getByText('Month of Birth').last().click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Set Y-axis to patient count
  await page.locator('div.axis-menu-button-wrapper').nth(6).getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').last().click()
  await page.locator('div.dropdownmenu-container').getByText('Patient Count').first().click()

  // Set X1-axis to condition concept name
  await page.locator('div.axis-menu-button-wrapper').first().getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Condition Occurrence A').click()
  await page.locator('#pane-right').getByText('Condition concept Name').click()

  // Remove condition concept name value in filter card
  await page.getByTitle('Condition Occurrence A - Condition concept Name').locator('i').click()

  // Set X2-axis to race concept id
  await page.locator('div.axis-menu-button-wrapper').nth(2).getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').last().click()
  await page.locator('#pane-right').getByText('Race concept id').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.02 })
  await takeScreenshot(page, testInfo)

  // Set X2-axis to year of birth with bin size of 50
  await page.locator('div.axis-menu-button-wrapper').nth(2).getByRole('button').first().click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').last().click()
  await page.locator('#pane-right').getByText('Year of Birth').first().click()
  await page.locator('button.binningButton').nth(1).click()
  await page.getByRole('textbox', { name: 'Size of the Bins' }).fill('50')
  await page.getByRole('textbox', { name: 'Size of the Bins' }).press('Enter')
  await page.locator('.modal-wrapper').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.02 })
  await takeScreenshot(page, testInfo)

  // Reset X2-axis
  await page.locator('div.axis-menu-button-wrapper').nth(2).getByRole('button').first().click()
  await page.locator('div.dropdownmenu-container').getByText('Reset Selection').nth(1).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.02 })
  await takeScreenshot(page, testInfo)

  // Set attribute for stacked chart
  await page.locator('div.axis-menu-button-wrapper').nth(4).getByRole('button').click()
  await page.locator('div.dropdownmenu-container').getByText('Basic Data').nth(2).click()
  await page.locator('#pane-right').getByText('Month of Birth').first().click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 1200 })
  await takeScreenshot(page, testInfo)

  // Set month of birth to 11 in filter card
  await page.getByTitle('Basic Data - Month of Birth').first().click()
  await page.getByTitle('Basic Data - Month of Birth').getByRole('textbox').fill('11')
  await page.getByTitle('Basic Data - Month of Birth').getByRole('textbox').press('Enter')
  await expect(page.getByText('115 / 2,694')).toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Remove condition occurrence filter card
  await page.locator('span[title="Select Filter Attributes"]').nth(1).click()
  await page.getByRole('menuitem').getByText('Remove Filter Card').click()
  await expect(page.getByText('247 / 2,694')).toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Switch to list view
  await page.locator('button.chartButton').nth(1).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Export to ZIP file
  await page.locator('button.toolbarButton').nth(1).click()
  await page.getByRole('menuitem').getByText('Export to ZIP File').click()
  await page.locator('span.buttonContent').nth(1).click()
  await page.waitForTimeout(5000) // Wait for download to complete
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 }) // Not sure what to expect
  await takeScreenshot(page, testInfo)

  // Switch to chart view
  await page.locator('button.chartButton').first().click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)

  // Reset filter card
  await page.getByRole('button', { name: '↺' }).click()
  await page.locator('button[title="Reset"]').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  await takeScreenshot(page, testInfo)
})
