import { test, expect } from '@playwright/test'

const TEST_NAME = 'concept-sets'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  async function assertCount(count: string) {
    return page.locator('button').filter({ hasText: 'Selected concepts' }).getByText(count).isVisible({ timeout: 5000 })
  }

  await page.goto('/d2e/portal')
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

  // Concept set
  const conceptSetName = `Concept Set Test 1`
  // If the concept set already exists (retry), remove the second conept set we added last time
  if (await page.getByRole('cell', { name: conceptSetName }).isVisible()) {
    await page.getByRole('row').filter({ hasText: conceptSetName }).getByRole('button').click()
    await expect(page.getByRole('button', { name: 'Update' })).toBeEnabled()
    console.log(`assertCount ${await assertCount('2')}`)
    if (await assertCount('2')) {
      await page.getByRole('tab', { name: 'Selected concepts' }).click()
      await page.getByRole('row', { name: '81893 64766004 Ulcerative' }).locator('path').first().click()
      await expect(await assertCount('1')).toBeTruthy()
      await page.getByRole('button', { name: 'Update' }).dblclick()
      await expect(page.getByRole('button', { name: 'Update' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Update' })).toBeEnabled()
    }
    await page.getByRole('button', { name: 'Close' }).click()
  } else {
    // Create a new concept set
    await page.getByTestId('button').click() // click on the "Add concept set" button
    await page.getByRole('textbox', { name: 'search terms' }).click()
    await page.getByRole('textbox', { name: 'search terms' }).fill('Streptococcal sore throat')
    await page.getByRole('button', { name: 'Search' }).click()
    await page.getByRole('row', { name: '28060 43878008 Streptococcal sore throat' }).locator('path').click()
    await page.getByRole('tab', { name: 'Selected concepts' }).click()
    await expect(page.getByRole('row')).toHaveCount(2) // including the header row
    await page.getByRole('tab', { name: 'Related concepts' }).click()
    await page.getByRole('textbox', { name: 'Concept set name' }).click()
    await page.getByRole('textbox', { name: 'Concept set name' }).fill(conceptSetName)
    await page.getByRole('button', { name: 'Create' }).click()
    await page.getByRole('button', { name: 'Close' }).click()
  }

  // await test.step('Attempt to create another concept set with the same name', async () => {
  //   await page.getByTestId('button').click()
  //   await page.getByRole('textbox', { name: 'Concept set name' }).click()
  //   await page.getByRole('textbox', { name: 'Concept set name' }).fill(conceptSetName)
  //   await page.getByRole('button', { name: 'Create' }).click()
  //   await expect(
  //     page.getByText(`Concept set name "${conceptSetName}" already exists. Please enter another name.`)
  //   ).toBeVisible()
  //   await page.getByRole('button', { name: 'Close' }).click()
  // })

  // Cohort builder
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
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
  await page.getByPlaceholder('Enter search term').fill(conceptSetName)
  await expect(page.getByText('Concept Set Test 1 -')).toBeVisible()
  await page.waitForTimeout(3000)
  await page.getByPlaceholder('Enter search term').press('Enter')
  await expect(page.getByText('1,677 / 2,694')).toBeVisible({ timeout: 10000 })
  await expect(page).toHaveScreenshot('concept-sets-2.png', { maxDiffPixelRatio: 1 })
  await page.getByText('✎').click()
  await page.getByRole('textbox', { name: 'search terms' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('Ulcerative colitis')
  await page.getByRole('textbox', { name: 'search terms' }).press('Enter')
  await expect(page.getByRole('cell', { name: '81893' })).toBeVisible({ timeout: 10000 })
  // Only add "81893 64766004 Ulcerative" when it is not already selected, in the scenario of re-running the test
  if (await assertCount('1')) {
    await page.getByRole('row', { name: '81893 64766004 Ulcerative' }).locator('path').click()
    await expect(await assertCount('2')).toBeTruthy()
  }
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Update' }).dblclick()
  await expect(page.getByRole('button', { name: 'Update' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Update' })).toBeEnabled()
  await page.getByRole('button', { name: 'Close' }).click()

  await expect(page.getByText('1,836 / 2,694')).toBeVisible({ timeout: 10000 })

  // Dismiss popover if present
  try {
    await page.mouse.move(0, 0)
    await page.locator('.modal-wrapper').click()
  } catch {
    // Modal not present, continue
  }

  await expect(page).toHaveScreenshot('concept-sets-3.png', { maxDiffPixelRatio: 1 })
})
