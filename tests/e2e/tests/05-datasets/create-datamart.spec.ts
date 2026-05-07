import { test, expect } from '@playwright/test'

const TEST_NAME = 'create-datamart'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto(`/portal`)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Create bookmark
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('textbox', { name: 'Enter name' }).fill('datamart-test')
  await page.locator('footer').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()

  // Materialize cohort
  await page
    .getByText('datamart-test')
    .locator('..')
    .locator('..')
    .locator('..')
    .locator('..')
    .locator('.footer')
    .locator('div:nth-child(3) > svg')
    .first()
    .click()
  await page.getByRole('textbox', { name: 'Enter description' }).click()
  await page.getByRole('textbox', { name: 'Enter description' }).fill('datamart-test-cohort')
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByText('Materialized Cohort')).toBeVisible()
  await expect(page.getByText('Patient Count:2694')).toBeVisible()

  // Navigate to datamart
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Select action' }).first().click()

  // Create datamart
  await page.getByRole('option', { name: 'Create data mart' }).click()
  await page.locator('div').filter({ hasText: 'Create data mart - Demo' }).nth(1).press('Tab')
  await page.getByPlaceholder(' ').click()
  await page.getByPlaceholder(' ').fill('datamart-test')

  // Test date filter
  await page.getByText('Date Filter').click()
  await page.locator('#date').fill('2025-08-13')
  await expect(page.locator('#date')).toHaveValue('2025-08-13')

  // Add cohort filter
  await page.getByText('Cohort Filter').click()
  await page
    .locator('form div')
    .filter({ hasText: 'Cohort FilterSelect cohort filterSelect cohort filter' })
    .getByRole('button')
    .click()
  await page.getByRole('option', { name: 'Cohort' }).click()

  // Add table filter
  await page.getByText('Table Filter').click()
  await expect(page.getByRole('button', { name: 'person' })).toBeVisible()
  await page.getByRole('button', { name: 'person' }).click()
  await expect(page.locator('form')).toContainText('person_id')
  await page.getByRole('button', { name: 'Create' }).click()
  // Check if datamart dataset was created successfully
  await expect(page.getByRole('cell', { name: 'datamart-test' })).toBeVisible()

  // Wait for 90 seconds for the datamart schema to be created in the database
  await page.waitForTimeout(90000)

  // Add user permission to newly created datamart dataset
  await page.getByRole('cell', { name: 'datamart-test' }).locator('..').getByRole('button').nth(2).click()
  await page.getByRole('option', { name: 'Permissions' }).click()
  await page.getByRole('tab', { name: 'Access' }).click()
  await page.getByTestId('dialog').getByTestId('button').click()
  await page.getByRole('menuitem', { name: 'admin', exact: true }).click({ timeout: 30000 })
  await expect(page.getByTestId('snackbar')).toContainText("You've added access for admin")
  await page.getByTestId('dialog-close').click()

  // Check if datamart dataset details are correct
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByText('datamart-test').click()
  await expect(page.getByRole('cell', { name: 'Patient Count' }).locator('..').getByRole('cell').nth(1)).toContainText(
    '2694'
  )
  await expect(
    page.getByRole('cell', { name: 'Entity Count', exact: true }).locator('..').getByRole('cell').nth(1)
  ).toContainText('215785')

  // Cleanup datamart dataset
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('cell', { name: 'datamart-test' }).locator('..').getByRole('button').nth(2).click()
  await page.getByRole('option', { name: 'Delete dataset' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  // Check if datamart was deleted successfully
  await expect(page.getByRole('cell', { name: 'datamart-test' })).not.toBeVisible()

  // Cleanup bookmark
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page
    .getByText('datamart-test')
    .locator('..')
    .locator('..')
    .locator('..')
    .locator('..')
    .locator('.footer')
    .locator('div:nth-child(5) > svg')
    .first()
    .click()
  await page.getByRole('button', { name: 'Delete' }).click()
  // Check if bookmark was deleted successfully
  await expect(page.getByText('datamart-test').first()).not.toBeVisible()
})
