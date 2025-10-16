import { test, expect } from '@playwright/test'

const TEST_NAME = 'pa-filter-cards'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ browser }) => {
  // Start browser in fullscreen mode
  const context = await browser.newContext({
    viewport: {
      width: 1920,
      height: 1080
    }
  })
  const page = await context.newPage()

  // Step 1 - navigate to the portal
  await page.goto('/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()

  // Step 2 - Add conditional occurrence filter card
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  await page.getByText('filter card has been added', { exact: false }).waitFor({ state: 'hidden' })
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()

  // Step 3 - Select condition concept name for filter card
  await page.locator('button:has(span[title="Select Filter Attributes"])').nth(1).click()
  await page
    .locator('div')
    .filter({ hasText: /^Condition concept Name$/ })
    .first()
    .click()
  await page
    .locator('div')
    .filter({ hasText: /^Condition concept set$/ })
    .first()
    .click()
  await page.locator('#stacked-chart').click()

  // Step 8 - Show that there are no elements found
  await page.getByTitle('Condition Occurrence A -').locator('div').nth(1).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('abc')
  await expect(page.locator('[id="patient.interactions.conditionoccurrence.1"]')).toMatchAriaSnapshot(
    `- text: abc No suggestions available`
  )

  // Step 4&5 - Searching term for a given substring
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('nemi')
  await expect(page.getByText('Anemia - Anemia')).toBeVisible()

  // Step 6 - Full term search
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('')
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Hypothyroidism')
  await expect(page.getByText('Hypothyroidism - Hypothyroidism')).toBeVisible()
  await page.getByRole('textbox', { name: 'Enter search term' }).press('Escape')

  // Step 7 - Validate supported syntax help appears
  await page.getByText('Supported SyntaxEnter a').click()
  await expect(page.getByRole('application')).toContainText('Supported Syntax')

  // Step 8 - Create concept set
  await page.locator('button:has(span[title="Select Filter Attributes"])').nth(1).click()
  await page
    .locator('div')
    .filter({ hasText: /^Condition concept set$/ })
    .first()
    .click()
  await page.locator('#stacked-chart').click()
  await page.getByRole('button', { name: '+' }).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await page.getByRole('textbox', { name: 'Concept set name' }).click()
  await page.getByRole('textbox', { name: 'Concept set name' }).fill('test_concept_set')
  await page.getByRole('textbox', { name: 'search terms' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('260139 10509002 Acute bronchitis')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.locator('tbody')).toContainText('Acute bronchitis')
  await page.getByRole('row', { name: '260139 10509002 Acute bronchitis' }).getByRole('img').click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('439777 271737000 Anemia')
  await page.getByRole('button', { name: 'Search' }).click()
  await page.getByRole('row', { name: '439777 271737000 Anemia 102.' }).getByRole('img').click()
  await page.getByRole('button', { name: 'Create' }).click()
  await page.getByRole('tab', { name: 'Selected concepts' }).click()
  await page.getByRole('button', { name: 'Close' }).click()

  // Step 8 - Select concept set
  await page.getByTitle('Condition Occurrence A - Condition concept Set').locator('div').nth(1).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('')
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('test_concept_set')
  await expect(page.getByText('test_concept_set', { exact: false }).first()).toBeVisible()
  await page.getByText('test_concept_set', { exact: false }).first().click()
  await page.getByRole('textbox', { name: 'Enter search term' }).press('Escape')

  // Step 8 - Entering incorrect condition occurrence concept
  await page.getByTitle('Condition Occurrence A - Condition concept Name').locator('div').nth(1).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('')
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('abc')
  await page.getByText('abc').click()
  const conditionOccuErrorBgcolor = await page
    .getByText('abc')
    .locator('..')
    .evaluate(el => window.getComputedStyle(el).backgroundColor)
  expect(conditionOccuErrorBgcolor).toBe('rgb(226, 49, 1)')

  // Step 8 - Entering month of birth with correct input
  await page.getByRole('button', { name: '' }).first().click()
  await page.getByText('Month of Birth').click()
  await page.getByText('Select an AttributeSelect').click()
  await page.getByTitle('Basic Data - Month of Birth').click()
  await page.getByRole('textbox').fill('[1-10]')
  await page.getByRole('textbox').press('Enter')

  // Step 8 - Entering month of birth with incorrect input
  await page.getByTitle('Basic Data - Month of Birth').click()
  await page.getByRole('textbox').fill('5.x')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByText('Invalid input. Use a number,')).toBeVisible()

  // Step 9 - Remove condition occurrence filter card
  const alertBanner = await page.getByRole('alert')
  const closeBannerBtn = await page.getByRole('button', { name: 'Close' })
  if (alertBanner) {
    await closeBannerBtn.click()
  }
  await page.getByRole('button', { name: '' }).nth(1).click()
  await page.getByRole('menuitem', { name: 'Remove Filter Card' }).click()
  await page.waitForSelector('.loading-animation-component', { state: 'hidden' })
  await page.getByText('Select an AttributeSelect').click()
  await page.waitForSelector('text=2226 / 2694', { state: 'visible' })

  // Step 10 - Reset filters
  await page.getByRole('button', { name: '↺' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByText('Condition Occurrence A')).not.toBeVisible()

  // Step 12 - Basic data filter for gender
  await page.getByTitle('Basic Data - Gender').locator('div').nth(1).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('')
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Female')
  await page.getByText('FEMALE - FEMALE').click()
  await page.getByRole('button', { name: '' }).click()

  // Step 12 - Basic data filter for gender concept id
  await page.locator('.dropdown-scroll >> text=Gender concept id').scrollIntoViewIfNeeded()
  await page.getByText('Gender concept id').click()
  await page.getByText('Select an AttributeSelect').click()
  await page.getByTitle('Basic Data - Gender concept id').locator('div').nth(1).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('')
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('8532')
  await page.getByText('- FEMALE').click()

  // Step 13 - Add filter card for Measurement concept name
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Measurement' }).click()
  await page.getByText('filter card has been added', { exact: false }).waitFor({ state: 'hidden' })
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await page.getByText('Select an AttributeSelect').click()
  await page.getByRole('button', { name: '' }).nth(1).click()
  await page.locator('.dropdown-scroll >> text=Measurement concept Name').scrollIntoViewIfNeeded()
  await page.getByText('Measurement concept name').click()
  await page
    .locator('div')
    .filter({ hasText: /^Measurement concept set$/ })
    .first()
    .click()
  await page.locator('#stacked-chart').click()
  await page.getByTitle('Measurement A - Measurement concept name').locator('div').nth(1).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('')
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('glucose')
  await page.getByText('Glucose lab - Glucose lab').click()
  await page.locator('#stacked-chart').click()

  // Step 16 - Add filter card dfor Observation concept name
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name: 'Observation', exact: true }).click()
  await page.getByText('Select an AttributeSelect').click()
  await page.getByRole('button', { name: '' }).nth(2).click()
  await page.locator('.dropdown-scroll >> text=Observation concept name').scrollIntoViewIfNeeded()
  await page.getByText('Observation concept name').click()
  await page.locator('.dropdown-scroll >> text=Observation concept set').scrollIntoViewIfNeeded()
  await page.getByRole('menu').getByText('Observation concept set').click()
  await page.locator('#stacked-chart').click()
  await page.getByTitle('Observation A - Observation').locator('div').nth(1).click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('')
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Shell')
  await page.getByText('Shellfish allergy - Shellfish').click()

  // // Reset filters
  await page.getByRole('button', { name: '↺' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
})
