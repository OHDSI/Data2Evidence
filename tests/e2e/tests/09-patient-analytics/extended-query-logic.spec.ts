import { test, expect } from '@playwright/test'

const TEST_NAME = 'patient-analytics-extended-query-logic'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
  await expect(page.getByText('2694 / 2694')).toBeVisible()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()

  // Add filtercards
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Drug Exposure' }).click()
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page.getByText('2694 / 2694')).toBeVisible()
  // Add basic data - month of birth
  await page.locator('#pane-left').getByText('Basic Data').locator('..').locator('..').locator('.dropdown').click()
  await page.getByText('Month of Birth').click()
  await page.locator('#pane-left').getByText('Basic Data').locator('..').locator('..').locator('.dropdown').click()
  await page.getByTitle('Basic Data - Month of Birth').click()
  await page.getByRole('textbox').fill('6')
  await page.getByRole('textbox').press('Enter')
  // Add basic data - gender === MALE
  await page.getByTitle('Basic Data - Gender', { exact: true }).locator('div').nth(1).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('MALE')
  await page.locator('#patient').getByText('MALE - MALE').waitFor({ state: 'visible' })
  await page.locator('#patient').getByText('MALE - MALE').click()
  await expect(page.getByText('248 / 2694')).toBeVisible()

  // Click AND to change into OR
  await page.getByRole('button', { name: 'AND ' }).first().click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Click OR to change into AND
  await page.getByRole('button', { name: 'OR ' }).first().click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Click AND to change into OR
  await page.getByRole('button', { name: 'AND ' }).first().click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()

  // Click x1 and ensure only the filtercards that do not associate with any OR condition should be available to select
  await page.getByRole('button', { name: 'Select an Attribute ◢' }).first().click()
  await expect(page.locator('#pane-right').getByText('Condition Occurrence B')).toBeVisible()
  // await page.getByRole('button', { name: 'Select an Attribute ◢' }).first().click()
  await expect(page.locator('#pane-right').getByText('Condition Occurrence A')).not.toBeVisible()
  // await page.getByRole('button', { name: 'Select an Attribute ◢' }).first().click()
  await expect(page.locator('#pane-right').getByText('Device Exposure A')).not.toBeVisible()

  // Add condition start date to x1
  await page.getByText('Condition Occurrence B').nth(1).hover()
  await page.locator('#pane-right').getByText('Condition Start Date').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Click and Drag and press drilldown
  await page.mouse.move(800, 200)
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(1200, 600, { steps: 10 })
  await page.mouse.up()
  await page.getByTitle('Filter by Selection').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()

  // Save filter
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill('Extended Logic Filter')
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  // Wait for save dialog to disappear
  await expect(page.getByText('Save Current Filters')).not.toBeVisible()

  // Remove condition occurrence B and drug exposure A filter cards
  await page.getByText('Drug Exposure A').locator('..').locator('..').locator(' .dropdown').click()
  await page.getByRole('menuitem', { name: 'Remove Filter Card' }).click()
  await page.getByText('Condition Occurrence B').locator('..').locator('..').locator(' .dropdown').click()
  await page.getByRole('menuitem', { name: 'Remove Filter Card' }).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Reload saved filter
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
  await page.getByRole('button', { name: 'Discard' }).click()
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await page.getByText('Extended Logic Filter').click()
  await page.getByRole('button', { name: 'Discard' }).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Delete saved filter
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await page
    .getByText('Extended Logic Filter')
    .locator('..')
    .locator('..')
    .locator('..')
    .locator('..')
    .locator('> .footer')
    .locator('div:nth-child(5) > svg')
    .first()
    .click()
  await page.getByRole('button', { name: 'Delete' }).click()
  // Wait for delete dialog to disappear
  await expect(page.getByText('Delete Saved Filter')).not.toBeVisible()
  await expect(page.getByText('Extended Logic Filter')).not.toBeVisible()
})
