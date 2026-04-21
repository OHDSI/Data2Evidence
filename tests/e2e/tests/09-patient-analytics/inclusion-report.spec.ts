import { test, expect } from '../fixtures'

const TEST_NAME = 'inclusion-report'
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
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })

  await test.step('Add Basic Data: Age > 60', async () => {
    await page.getByTitle('Basic Data - Age').click()
    await page.getByTitle('Basic Data - Age').getByRole('textbox').fill('>60')
    await page.getByTitle('Basic Data - Age').getByRole('textbox').press('Enter')
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })

  await test.step('Add Basic Data: Gender = Female', async () => {
    await page.getByTitle('Basic Data - Gender').getByText('All').click()
    await page.getByPlaceholder('Enter search term').fill('Female')
    await page.getByText('FEMALE - FEMALE').click()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })

  await test.step('Add Condition Occurrence inclusion filter (Chronic sinusitis)', async () => {
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
    await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click()
    await page.getByTitle('Condition Occurrence A -').getByPlaceholder('Enter search term').fill('Chronic sinusitis')
    try {
      await expect(page.getByText('Chronic sinusitis')).toBeVisible({ timeout: 2000 })
      await page.getByText('Chronic sinusitis').click()
    } catch {
      await page.getByTitle('Condition Occurrence A -').getByRole('button').click()
      await page.getByRole('textbox', { name: 'Concept set name' }).fill('Chronic sinusitis')
      await page.getByRole('textbox', { name: 'search terms' }).fill('Chronic sinusitis')
      await page.getByRole('button', { name: 'Search' }).click()
      await page
        .getByRole('row', { name: /40055000.*Chronic sinusitis/ })
        .locator('td')
        .first()
        .click()
      await page.getByRole('button', { name: 'Create' }).click()
      await expect(page.getByRole('button', { name: 'Update' })).toBeVisible()
      await page.getByRole('button', { name: 'Close' }).click()
      await expect(page.locator('.loading-animation-component')).not.toBeVisible()
      try {
        await page.mouse.move(0, 0)
        await page.locator('.modal-wrapper').click()
      } catch {
        // modal not present, continue
      }
    }
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })

  await test.step('Add Visit exclusion filter card', async () => {
    await page.getByRole('link', { name: /Exclusion \(\d+\)/ }).click()
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Visit' }).click()
    await expect(page.getByText('A filter card has been added: Visit A')).toBeVisible()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })

  const dialog = page.locator('.inclusion-report-dialog')

  await test.step('Open Inclusion Report dialog and wait for data', async () => {
    await expect(page.getByRole('button', { name: 'Attrition Plot' })).toBeVisible()
    const reportResponse = page.waitForResponse(
      r => /\/analytics-svc\/api\/services\/population\/.*(inclusionreport|attrition)/i.test(r.url()) && r.ok(),
      { timeout: 60000 }
    )
    await page.getByRole('button', { name: 'Attrition Plot' }).click()
    await reportResponse
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.inclusion-report-dialog__title-text')).toHaveText('Attrition Plot')
    await expect(dialog.locator('.status-message.loading')).not.toBeVisible()
    await expect(dialog.locator('.inclusion-report-container')).toBeVisible()
  })

  await test.step('Assert ChartToolbar integration props (no viz tabs, no PERSON/EVENT switch)', async () => {
    await expect(dialog.locator('.visualization-tabs')).toHaveCount(0)
    await expect(dialog.locator('.person-event-view-buttons')).toHaveCount(0)
  })

  await test.step('Verify SummaryTable and RulesTable content', async () => {
    await expect(dialog.getByText('Summary Statistics')).toBeVisible()
    await expect(dialog.getByText('Total Persons: 2,694')).toBeVisible()
    await expect(dialog.getByText('Matches: 171 (6.35%)')).toBeVisible()

    const rulesRows = dialog.locator('table.rules-table tbody tr')
    await expect(rulesRows).toHaveCount(4)

    const ageRow = rulesRows.nth(0)
    await expect(ageRow.locator('td.rule-name')).toContainText('Age')
    await expect(ageRow.locator('td.rule-name')).toContainText('>60')
    await expect(ageRow).toContainText('1,692')
    await expect(ageRow).toContainText('62.81%')

    const genderRow = rulesRows.nth(1)
    await expect(genderRow.locator('td.rule-name')).toContainText('Gender')
    await expect(genderRow.locator('td.rule-name')).toContainText('FEMALE')
    await expect(genderRow).toContainText('855')
    await expect(genderRow).toContainText('31.74%')

    const conditionRow = rulesRows.nth(2)
    await expect(conditionRow.locator('td.rule-name')).toContainText('Condition Occurrence A')
    await expect(conditionRow).toContainText('288')
    await expect(conditionRow).toContainText('10.69%')

    const visitRow = rulesRows.nth(3)
    await expect(visitRow.locator('td.rule-name')).toContainText('Visit A')
    await expect(visitRow).toContainText('171')
    await expect(visitRow).toContainText('6.35%')
  })

  await test.step('Verify attrition funnel chart screenshot', async () => {
    const funnelChart = dialog.locator('.funnel-chart')
    await funnelChart.scrollIntoViewIfNeeded()
    await expect(funnelChart).toBeVisible()
    await expect(funnelChart).toHaveScreenshot()
  })

  await test.step('Reorder rules via Move up button', async () => {
    const rulesRows = dialog.locator('table.rules-table tbody tr')
    await rulesRows.nth(1).getByTitle('Move up').click()
    await expect(dialog.locator('.reorder-loading-overlay')).not.toBeVisible({ timeout: 30000 })
    await rulesRows.nth(2).getByTitle('Move up').click()
    await expect(dialog.locator('.reorder-loading-overlay')).not.toBeVisible({ timeout: 30000 })

    const genderRow = rulesRows.nth(0)
    await expect(genderRow.locator('td.rule-name')).toContainText('Gender')
    await expect(genderRow).toContainText('1,373')
    await expect(genderRow).toContainText('50.97%')

    const conditionRow = rulesRows.nth(1)
    await expect(conditionRow.locator('td.rule-name')).toContainText('Condition Occurrence A')
    await expect(conditionRow).toContainText('424')
    await expect(conditionRow).toContainText('15.74%')

    const ageRow = rulesRows.nth(2)
    await expect(ageRow.locator('td.rule-name')).toContainText('Age')
    await expect(ageRow).toContainText('288')
    await expect(ageRow).toContainText('10.69%')

    const visitRow = rulesRows.nth(3)
    await expect(visitRow.locator('td.rule-name')).toContainText('Visit A')
    await expect(visitRow).toContainText('171')
    await expect(visitRow).toContainText('6.35%')
  })

  await test.step('Verify updated attrition funnel chart screenshot', async () => {
    const funnelChart = dialog.locator('.funnel-chart')
    await funnelChart.scrollIntoViewIfNeeded()
    await expect(funnelChart).toBeVisible()
    await expect(funnelChart).toHaveScreenshot()
  })

  await test.step('Close Inclusion Report dialog', async () => {
    await dialog.locator('.inclusion-report-dialog__close-btn').click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Attrition Plot' })).toBeVisible()
  })
})
