import { test, expect } from '@playwright/test'

const TEST_NAME = 'e2e PA and Cohorts'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/portal')
  await page.getByTestId('button').nth(1).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('test_researcher_1')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('Demo dataset').first().click()
  await expect(page.getByTestId('card-content')).toContainText('Demo dataset')
  await expect(page.getByTestId('card')).toMatchAriaSnapshot(`
    - tablist:
      - tab "Dataset Info" [selected]
      - tab "Data Quality"
      - tab "Data Characterization"
    `)
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: "Create Cohort:"
    - button "D2E"
    - button "Atlas"
    - button "Import"
    - button "Compare" [disabled]
    - text: Shared
    - checkbox
    `)
  await page.getByRole('button', { name: 'D2E' }).click()
  await page.getByText('All').click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('MALE')
  await page.getByText('MALE - MALE').click()
  await expect(page.getByRole('tabpanel')).toMatchAriaSnapshot(`
    - text: MALE
    - textbox "Enter search term"
    `)
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - button "↺"
    - button "Add Filters":
      - button "Add Filters"
    - button "Save"
    `)
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill('Test cohort 1')
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text:  Save Current Filters`)
  await page.locator('.app-checkbox-container').click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: Enter a new name if you would like to overwrite the current name (New cohort).
    - textbox "Enter name": Test cohort 1
    - text:  Allow sharing
    `)
  await expect(page.locator('footer')).toMatchAriaSnapshot(`
    - button "Save"
    - button "Cancel"
    `)
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text: `)
  await page.getByRole('button', { name: '' }).click()
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.locator('#pane-left')).toContainText('Test cohort 1')
  await page.getByRole('button', { name: 'D2E' }).click()
  await page.getByText('All').click()
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Female')
  await page.getByText('Female').click()
  await expect(page.getByRole('tabpanel')).toMatchAriaSnapshot(`- text: Gender  Clear All FEMALE`)
  await expect(page.getByRole('tabpanel')).toMatchAriaSnapshot(`
    - text: FEMALE
    - textbox "Enter search term"
    `)
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill('Test cohort 2')
  await page.locator('.app-checkbox-container').click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text: Save Current Filters`)
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: Enter a new name if you would like to overwrite the current name (New cohort).
    - textbox "Enter name": Test cohort 2
    - text:  Allow sharing
    `)
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text: `)
  await page.getByRole('button', { name: '' }).click()
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: Test cohort 2
    - img
    `)
  await page.locator('div:nth-child(2) > .footer > div > svg').first().click()
  await page.getByRole('img').nth(4).click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: "Create Cohort:"
    - button "D2E"
    - button "Atlas"
    - button "Import"
    - button "Compare"
    - text: Shared
    - checkbox
    `)
  await page.getByRole('button', { name: 'Compare' }).click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text: Group Comparison`)
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('test_researcher_2')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.locator('.slider').click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`
    - text: Shared
    - checkbox [checked]
    `)
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text: Test cohort 2`)
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text: Test cohort 1`)
  await page.locator('div:nth-child(2) > .footer > div:nth-child(3) > svg').click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text: Add Patients to Cohort (Test cohort 1)`)
  await page
    .locator('div')
    .filter({ hasText: /^Cohort Description:$/ })
    .first()
    .click()
  await page.getByRole('textbox', { name: 'Enter description' }).click()
  await page.getByRole('textbox', { name: 'Enter description' }).fill('Test cohort 1')
  await page.getByRole('button', { name: 'OK' }).click()
  await page.locator('div:nth-child(2) > .footer > div:nth-child(2) > svg').click()
  await expect(page.locator('#pane-left')).toContainText('Rename Saved Filter')
  await expect(page.locator('#pane-left')).toContainText('Specify a new name for bookmark.')
  await page.getByRole('textbox').click()
  await page.getByRole('textbox').fill('Test cohort 1 renamed')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(`- text: Test cohort 1 renamed`)
  await page.locator('div:nth-child(5) > svg > path').first().click()
  await page.locator('div:nth-child(5) > svg').first().click()
  await expect(page.locator('#pane-left')).toContainText('Delete Saved Filter')
  await expect(page.locator('#pane-left')).toMatchAriaSnapshot(
    `- text: Deleting this saved filter will delete any access points that you generated for it. Are you sure you want to delete?`
  )
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('#app')).toMatchAriaSnapshot(`- text: Saved filter deleted.`)
})
