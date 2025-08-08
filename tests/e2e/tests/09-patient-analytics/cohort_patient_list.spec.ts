import { test, expect } from '@playwright/test'

const TEST_NAME = 'patient-analytics-patient-list'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  //Navigate to Cohort page
  await test.step('Navigate to Cohort page', async () => {
    await page.getByText('Demo dataset').first().click()
    await page.getByRole('link', { name: 'Cohorts' }).click()
    await page.getByRole('button', { name: 'D2E' }).click()
    await expect(page.getByText('2694 / 2694')).toBeVisible()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })
  //Add Age filter
  await test.step('Add Age filter', async () => {
    await page.getByTitle('Basic Data - Age').click()
    await page.getByRole('textbox').fill('>55')
    await page.getByRole('textbox').press('Enter')
    await expect(page.getByText('1971 / 2694')).toBeVisible()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })
  //Add Condition Occurrence filter card
  await test.step('Add filter card for Condition Occurrence', async () => {
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
    await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click()
    await page.getByRole('textbox', { name: 'Enter search term' }).fill('Chronic sinusitis')
    try {
      await expect(page.getByText('Chronic sinusitis')).toBeVisible({ timeout: 10000 })
      await page.getByText('Chronic sinusitis').click()
    } catch (e) {
      // If not visible in 2 seconds, continue without failing
      await page.getByTitle('Condition Occurrence A -').getByRole('button').click()
      await page.getByRole('textbox', { name: 'Concept set name' }).click()
      await page.getByRole('textbox', { name: 'Concept set name' }).fill('Chronic sinusitis')
      await page.getByRole('textbox', { name: 'search terms' }).click()
      await page.getByRole('textbox', { name: 'search terms' }).click()
      await page.getByRole('textbox', { name: 'search terms' }).fill('Chronic sinusitis')
      await page.getByRole('button', { name: 'Search' }).click()
      await page.getByRole('row', { name: '40055000 Chronic sinusitis' }).locator('path').click()
      await page.getByRole('button', { name: 'Create' }).click()
      await page.getByRole('button', { name: 'Close' }).click()
      await expect(page.locator('.loading-animation-component')).not.toBeVisible()
      await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click()
      await page.getByRole('textbox', { name: 'Enter search term' }).fill('')
      await page.getByRole('textbox', { name: 'Enter search term' }).fill('Chronic sinusitis')
      await page.getByText('Chronic sinusitis').click()
    }
    await expect(page.locator('.loading-animation-component')).not.toBeVisible({ timeout: 20000 })
    await expect(page.getByText('629 / 2694')).toBeVisible()
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Current Patient Group' })).toBeVisible()
  })
  //Save the filter card
  await test.step('Save the filter card', async () => {
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByRole('textbox', { name: 'Enter name' }).fill('Cohort Test')
    await page.getByRole('textbox', { name: 'Enter name' }).click()
    await page.getByTitle('Allow bookmark to be visible').locator('div').click()
    await page.locator('footer').getByRole('button', { name: 'Save' }).click()
    // await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })
  //Check if the cohort is saved
  await test.step('Check if the cohort is saved', async () => {
    await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
    await expect(page.getByText('Cohort Test0. Icons/')).toBeVisible({ timeout: 20000 })
  })
  //Go to patient list
  await test.step('Go to patient list', async () => {
    await page.getByRole('button', { name: '' }).click()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    //Remove Race
    await page.getByRole('cell', { name: 'Race ' }).locator('span').nth(1).click()
    // If multiple 'Remove' buttons are found, click the one closest to the 'Race ' cell
    const raceCell = await page.getByRole('cell', { name: 'Race ' })
    const removeButtons = await page.getByText('Remove').elementHandles()
    if (removeButtons.length === 1) {
      await removeButtons[0].click()
    } else if (removeButtons.length > 1) {
      // Find the closest Remove button to the Race cell
      const raceBox = await raceCell.boundingBox()
      let minDistance = Infinity
      let closestButton = removeButtons[0]
      for (const btn of removeButtons) {
        const btnBox = await btn.boundingBox()
        if (btnBox && raceBox) {
          const distance = Math.abs(btnBox.y - raceBox.y) + Math.abs(btnBox.x - raceBox.x)
          if (distance < minDistance) {
            minDistance = distance
            closestButton = btn
          }
        }
      }
      await closestButton.click()
    }
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    // Check if tbody has more than 1 row
    const rowCount = await page.locator('tbody tr').count()
    expect(rowCount).toBeGreaterThan(1)
    // Confirm patientlist-control has rowcount="812"
    const rowCountAttr = await page.locator('.patientlist-control').getAttribute('rowcount')
    expect(rowCountAttr).toBe('629')
    await page.getByRole('cell', { name: 'Age ' }).locator('span').nth(1).click()
    await page.getByText(' Sort Ascending').click()
    await page.getByRole('cell', { name: 'Ethnicity concept id ' }).locator('span').nth(1).click()
    await page.getByText(' Sort Descending').click()
    await page.getByRole('cell', { name: 'Race concept id ' }).locator('span').nth(1).click()
    await page.getByText('Remove', { exact: true }).click()
    //Add Observation interaction
    await page.getByRole('button', { name: 'Add Interaction' }).click()
    await page.locator('#pane-right').getByText('Observation', { exact: true }).click()
    // Confirm that 'Observation' exists in the table header
    await expect(page.locator('thead')).toContainText('Observation')
    await page.getByRole('cell', { name: 'Basic Data ' }).locator('span').click()
    //Add attribute
    await page.locator('#pane-right').getByText('Ethnicity concept id').click()
    await page.getByTitle('Basic Data - Ethnicity concept id').locator('span').click()
    //Export to ZIP file
    await page.getByTitle('Export to File').click()
    await page.getByRole('menuitem', { name: 'Export to ZIP File' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export' }).click()
    const download = await downloadPromise
  })
  //Delete cohort
  await test.step('Delete cohort', async () => {
    // await page.getByRole('button', { name: '' }).click();
    await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
    await expect(page.getByText('Cohort Test0. Icons/')).toBeVisible({ timeout: 20000 })
    await page.locator('div:nth-child(5) > svg').first().click()
    // await page.getByRole('row', { name: 'Cohort Test' }).getByRole('button').nth(2).click();
    await page.getByRole('button', { name: 'Delete' }).click({ timeout: 40000 })
    await expect(page.getByText('Cohort Test0. Icons/')).not.toBeVisible({ timeout: 20000 })
  })
})
