import { test, expect } from '@playwright/test'

test('Concepts', async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Concepts' }).click()
  await expect(page.getByText('1–25 of 444')).toBeVisible()
  await expect(page).toHaveScreenshot('concept-sets-1.png', { maxDiffPixels: 100 })
  await page.getByRole('tab', { name: 'Concept Sets' }).click()
  await page.getByTestId('button').click() // click on the "Add concept set" button
  await page.getByRole('textbox', { name: 'search terms' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('Type 2 diabetes mellitus')
  await page.getByRole('button', { name: 'Search' }).click()
  await page.getByRole('row', { name: '4144583 427089005 Diabetes' }).locator('path').click()
  await page.getByRole('tab', { name: 'Selected concepts' }).click()
  await expect(page.getByRole('checkbox').nth(1)).toBeVisible()
  await page.getByRole('tab', { name: 'Related concepts' }).click()
  await page.getByRole('textbox', { name: 'Concept set name' }).click()
  await page.getByRole('textbox', { name: 'Concept set name' }).fill('Concept Set Test1')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
  // Add a filter card
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  // Select the "Condition concept set" filter
  await page.locator('button:has(span[title="Select Filter Attributes"])').nth(1).click()
  const conceptSet = page.locator('.bs-checkbox:has-text("Condition concept set")')
  const conceptChecked = await conceptSet.locator('input[type="checkbox"]').isChecked()
  if (!conceptChecked) {
    await conceptSet.click()
  }
  await page.locator('button:has(span[title="Select Filter Attributes"])').nth(1).click()
  // Select the concept set we just created
  await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Concept Set Test1')
  await page.waitForTimeout(2000)
  await page.getByRole('textbox', { name: 'Enter search term' }).press('Enter')
  await page.getByText('✎').click()
  await page.getByRole('textbox', { name: 'search terms' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('Ulcerative colitis')
  await page.getByRole('textbox', { name: 'search terms' }).press('Enter')
  await expect(page.getByRole('cell', { name: '81893' })).toBeVisible({ timeout: 10000 })
  // Only try to click the row if "81893 64766004 Ulcerative" is not already selected
  const selectedCount = await page.getByRole('tab', { name: /Selected concepts/ }).count()
  if (selectedCount < 2) {
    await page.getByRole('row', { name: '81893 64766004 Ulcerative' }).locator('path').click()
  }

  await page.getByRole('button', { name: 'Update' }).click()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('413 / 2694')).toBeVisible({ timeout: 10000 })
  await expect(page).toHaveScreenshot('concept-sets-2.png', { maxDiffPixels: 100 })
})
