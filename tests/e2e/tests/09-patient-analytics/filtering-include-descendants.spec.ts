import { test, expect } from '../fixtures'

const TEST_NAME = 'filtering-include-descendants'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  test.slow()

  // Sign in
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await test.step('Open Demo dataset and start a new D2E cohort', async () => {
    await page.getByText('Demo dataset').first().click()
    await page.getByRole('link', { name: 'Cohorts' }).click()
    await page.getByRole('button', { name: 'D2E' }).click()
    await expect(page.getByText('2,694 / 2,694')).toBeVisible()
    await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  })

  await test.step("Add Condition Occurrence inclusion filter (Alzheimer's disease)", async () => {
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
    await page.getByRole('tab', { name: ' Condition Occurrence A ' }).locator('button').last().click()
    await page.getByText('Condition Source Concept Code').click()
    await page.getByTitle('Condition Source Concept Code', { exact: true }).click()
    await page.getByTitle('Condition Occurrence A - Condition Source Concept Code').locator('div').nth(1).click()
    await page.getByTitle('Condition Occurrence A -').getByPlaceholder('Enter search term').fill('Alzhiemer')
    await expect(page.getByText("Alzheimer's disease")).toBeVisible({ timeout: 10000 })
    await page.getByText("Alzheimer's disease").click()
    await expect(page.getByTestId('pa-loading-indicator')).not.toBeVisible()
  })

  await expect(page.getByText('136 / 2,694')).toBeVisible()
})
