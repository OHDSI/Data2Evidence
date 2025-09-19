import { test, expect } from '@playwright/test'

const TEST_NAME = 'dataset-overview-chart'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  test.setTimeout(5 * 60 * 1000)
  await page.goto('/portal')
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
    await expect(page.getByRole('button', { name: 'Update dataset metadata' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Update dataset metadata' })).toBeEnabled()
    // Make sure the dqd and dc jobs are completed before switching to Researcher portal
    await page.getByRole('link', { name: 'Jobs' }).click()
    await expect(page.locator('a:has-text("Job Runs")')).toBeVisible({ timeout: 3000 })
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
    await expect(dqd_state).toHaveText('Completed', { timeout: 120000 })
    const dc_state = dc_entry.locator('.state-badge')
    await expect(dc_state).toHaveText('Completed', { timeout: 120000 })
    const omop_state = omop_entry.locator('.state-badge')
    await expect(omop_state).toHaveText('Completed', { timeout: 120000 })
  })

  await test.step('overview-chart', async () => {
    await page.getByRole('link', { name: 'Account' }).click()
    await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()

    // Hover over the ECharts container
    await expect(page.locator('canvas').first()).toBeVisible()
    await page.waitForTimeout(500)
    const bb = (await page.locator('.echarts-for-react ').first().boundingBox())!
    await page
      .locator('.echarts-for-react ')
      .first()
      .locator('canvas')
      .hover({ position: { x: (1 / 2) * bb.width, y: (3 / 4) * bb.height } })
    await expect(page.locator('div:has-text("Entity distribution")').last()).toBeVisible({ timeout: 3000 })
    await page.getByText('Data2Evidence').click()
    await expect(page.getByText('Entity distribution')).not.toBeVisible()
    await expect(page).toHaveScreenshot('dataset-overview-chart.png')
  })

  await test.step('Update Entity Count DistributionValue', async () => {
    await page.getByText('Demo dataset').first().click()
    const tbodyText = await page.getByRole('cell', { name: '{"Observation Period Count' }).innerText()
    const hasMetadata = tbodyText.includes('"Observation Period Count":')

    if (hasMetadata) {
      await page.getByText('Account').click()
      await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
      await page.getByRole('link', { name: 'Datasets' }).click()
      await page.getByRole('button', { name: 'Select action' }).first().click()
      await page.getByRole('option', { name: 'Update dataset' }).click()
      await page
        .locator('div')
        .filter({ hasText: /^Entity Count DistributionValue$/ })
        .getByPlaceholder(' ')
        .click()
      await page
        .locator('div')
        .filter({ hasText: /^Entity Count DistributionValue$/ })
        .getByPlaceholder(' ')
        .fill(
          '{"Observation Period Count": "2000", "Death Count": "52", "Visit Occurrence Count": "55261", "Visit Detail Count": "0", "Condition Occurrence Count": "147186", "Drug Exposure Count": "57095", "Procedure Occurrence Count": "137522", "Device Exposure Count": "2262", "Measurement Count": "34556", "Observation Count": "19339", "Note Count": "0", "Episode Count": "0", "Specimen Count": "0"}'
        )
      await page.waitForTimeout(1000)
      await page.getByRole('button', { name: 'Save' }).click()
      await page.getByRole('link', { name: 'Account' }).click()
      await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
      await page.getByTestId('card').first().click()
      await expect(page.locator('tbody')).toContainText(
        '{"Observation Period Count": "2000", "Death Count": "52", "Visit Occurrence Count": "55261", "Visit Detail Count": "0", "Condition Occurrence Count": "147186", "Drug Exposure Count": "57095", "Procedure Occurrence Count": "137522", "Device Exposure Count": "2262", "Measurement Count": "34556", "Observation Count": "19339", "Note Count": "0", "Episode Count": "0", "Specimen Count": "0"}'
      )
    }
  })
})
