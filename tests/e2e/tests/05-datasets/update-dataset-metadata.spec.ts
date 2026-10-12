import { test, expect } from '../fixtures'
import { MINUTE_10, MINUTE_5 } from '../const'

const TEST_NAME = 'update-dataset-metadata'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  test.setTimeout(MINUTE_10)
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  await test.step('Update dataset metadata', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click()
    await page.getByRole('button', { name: 'Update dataset metadata' }).click()

    // Make sure the dqd and dc jobs are completed before switching to Researcher portal
    await page.getByRole('link', { name: 'Jobs' }).click()
    await expect(page.locator('a:has-text("Job Runs")')).toBeVisible()
    const dqd_entry = page
      .locator('.flow-run-list-item')
      .filter({ has: page.locator('a:has-text("dqd_plugin")') })
      .first()
    const dc_entry = page
      .locator('.flow-run-list-item')
      .filter({ has: page.locator('a:text("data_characterization_plugin")') })
      .first()
    const omop_entry = page
      .locator('.flow-run-list-item')
      .filter({ has: page.locator('a:text("omop_cdm_plugin")') })
      .first()
    // Find the closest state badge to this entry (adjust the selector as needed)
    const dqd_state = dqd_entry.locator('.state-badge')
    await expect(dqd_state).toHaveText('Completed', { timeout: MINUTE_5 })
    const dc_state = dc_entry.locator('.state-badge')
    await expect(dc_state).toHaveText('Completed', { timeout: MINUTE_5 })
    const omop_state = omop_entry.locator('.state-badge')
    await expect(omop_state).toHaveText('Completed', { timeout: MINUTE_5 })
  })
})
