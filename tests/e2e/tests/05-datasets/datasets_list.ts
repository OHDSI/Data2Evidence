import { test, expect } from '@playwright/test'

const TEST_NAME = 'Datasets List'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.getByRole('heading')).toContainText('Datasets')
  await expect(page.locator('thead')).toContainText('Dataset ID')
  await expect(page.locator('thead')).toContainText('Name')
  await expect(page.locator('thead')).toContainText('Schema name')
})
