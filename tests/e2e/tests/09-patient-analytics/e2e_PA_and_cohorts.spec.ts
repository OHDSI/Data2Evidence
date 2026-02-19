import { test, expect } from '@playwright/test'

const TEST_NAME = 'e2e PA and Cohorts'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

// Helper to clean up test cohorts from previous runs
async function cleanupTestCohorts(page) {
  const cohortNames = ['Test cohort 1', 'Test cohort 2', 'Test cohort 1 renamed']
  for (const name of cohortNames) {
    try {
      const cohort = page.locator('#pane-left').getByText(name, { exact: true })
      if (await cohort.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cohort.click()
        // Try to find and click delete button
        const deleteBtn = page.getByRole('button', { name: /delete/i })
        if (await deleteBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await deleteBtn.click()
          await page
            .getByRole('button', { name: 'Delete' })
            .click()
            .catch(() => {})
        }
      }
    } catch {
      // Cohort not found, continue
    }
  }
}

test(TEST_NAME, async ({ page }) => {
  // Login
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Select dataset
  await page.getByText('Demo dataset').first().click()
  await expect(page.getByTestId('card-content')).toContainText('Demo dataset')
  await expect(page.getByRole('tab', { name: 'Dataset Info' })).toBeVisible()

  // Navigate to Cohorts and clean up any leftover test data
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.getByText('Create Cohort:')).toBeVisible()
  await cleanupTestCohorts(page)

  await expect(page.getByRole('button', { name: 'D2E' })).toBeVisible()

  // Create first cohort with MALE filter
  await page.getByRole('button', { name: 'D2E' }).click()
  await page.getByText('All').click()
  await page.getByRole('textbox', { name: 'multiselect-searchbox' }).fill('MALE')
  await page.getByText('MALE - MALE').click()
  await expect(page.getByRole('combobox').filter({ hasText: 'MALE' }).first()).toBeVisible()

  // Save cohort 1
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill('Test cohort 1')
  await expect(page.locator('#pane-left')).toContainText('Save Current Filters')
  await expect(page.locator('#pane-left')).toContainText('Enter a new name')
  await page.locator('.app-checkbox-container').click()
  await expect(page.locator('footer').getByRole('button', { name: 'Save' })).toBeVisible()
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()

  // Dismiss modal if present
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // Navigate back to cohorts
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()

  // Handle unsaved changes dialog - always try to dismiss
  try {
    await page.getByRole('button', { name: 'Discard' }).click({ timeout: 3000 })
  } catch {
    // Dialog not present, continue
  }

  await expect(page.locator('#pane-left')).toContainText('Test cohort 1')

  // Create second cohort with FEMALE filter
  await page.getByRole('button', { name: 'D2E' }).click()

  // Dismiss unsaved changes dialog if it appears
  try {
    await page.getByRole('button', { name: 'Discard' }).click({ timeout: 2000 })
  } catch {
    // Dialog not present, continue
  }

  await page.waitForTimeout(500)
  await page.getByText('All').first().click()
  await page.getByRole('textbox', { name: 'multiselect-searchbox' }).fill('FEMALE')
  await page.getByRole('option').filter({ hasText: 'FEMALE' }).first().click()
  await expect(page.getByRole('combobox').filter({ hasText: 'FEMALE' }).first()).toBeVisible()

  // Save cohort 2
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill('Test cohort 2')
  await expect(page.locator('#pane-left')).toContainText('Save Current Filters')
  await page.locator('.app-checkbox-container').click()
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()

  // Dismiss modal if present
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // Navigate back to cohorts
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()

  // Handle unsaved changes dialog if present
  try {
    await page.getByRole('button', { name: 'Discard' }).click({ timeout: 3000 })
  } catch {
    // Dialog not present, continue
  }

  await expect(page.locator('#pane-left')).toContainText('Test cohort 2')

  // Delete cohorts to reset state
  await page.locator('div:nth-child(2) > .footer > div > svg').first().click()
  await page.getByRole('img').nth(4).click()

  // Verify Compare button is now enabled
  await expect(page.getByRole('button', { name: 'Compare' })).toBeEnabled()
  await page.getByRole('button', { name: 'Compare' }).click()
  await expect(page.getByText('Group Comparison')).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()

  // Logout
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()

  // Login again
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Navigate to cohorts and check shared cohorts
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.locator('.slider').click()

  // Verify shared checkbox is checked
  await expect(page.locator('#pane-left')).toContainText('Shared')

  // Verify shared cohorts are visible
  await expect(page.locator('#pane-left')).toContainText('Test cohort 2')
  await expect(page.locator('#pane-left')).toContainText('Test cohort 1')

  // Materialize cohort (add patients)
  await page.locator('div:nth-child(2) > .footer > div:nth-child(3) > svg').click()
  await expect(page.locator('#pane-left')).toContainText('Add Patients to Cohort')
  await page
    .locator('div')
    .filter({ hasText: /^Cohort Description:$/ })
    .first()
    .click()
  await page.getByRole('textbox', { name: 'Enter description' }).fill('Test cohort 1')
  await page.getByRole('button', { name: 'OK' }).click()

  // Validate success message after materializing cohort (Issue #1758)
  await expect(page.getByText('Patients added to cohort.')).toBeVisible()

  // Rename cohort
  await page.locator('div:nth-child(2) > .footer > div:nth-child(2) > svg').click()
  await expect(page.locator('#pane-left')).toContainText('Rename Saved Filter')
  await expect(page.locator('#pane-left')).toContainText('Specify a new name for bookmark')
  await page.getByRole('textbox').fill('Test cohort 1 renamed')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#pane-left')).toContainText('Test cohort 1 renamed')

  // Delete cohort
  await page.locator('div:nth-child(5) > svg > path').first().click()
  await page.locator('div:nth-child(5) > svg').first().click()
  await expect(page.locator('#pane-left')).toContainText('Delete Saved Filter')
  await expect(page.locator('#pane-left')).toContainText(
    'Deleting this saved filter will delete any access points that you generated for it. Are you sure you want to delete?'
  )
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('#app')).toContainText('Saved filter deleted')
})
