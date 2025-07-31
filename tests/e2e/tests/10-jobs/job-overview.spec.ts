import { test, expect } from '@playwright/test'

const TEST_NAME = 'jobs-overview'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto(`https://localhost:443/portal`)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Switch to admin portal
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Open jobs
  await page.getByRole('link', { name: 'Jobs' }).click()

  // Verify all tabs are present
  await expect(page.getByRole('heading')).toContainText('Job Runs')
  await page.getByRole('button', { name: 'Jobs' }).click()
  await expect(page.getByRole('heading')).toContainText('Jobs')
  await page.getByRole('button', { name: 'Blocks' }).click()
  await expect(page.getByRole('navigation')).toContainText('Blocks')
  await page.getByRole('button', { name: 'Variables' }).click()
  await expect(page.getByRole('navigation')).toContainText('Variables')
})
