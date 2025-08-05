import { test, expect } from '@playwright/test'

const TEST_NAME = 'add-delete-user'
// const SHOULD_SKIP = true
// test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto(`https://localhost:443/portal`)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Switch to Admin portal
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Go to Users
  await page.getByRole('link', { name: 'Users' }).click()

  // Add user
  await expect(page.getByTestId('button')).toBeVisible()
  await page.getByTestId('button').click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill('test_user')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Hide password' }).click()
  await page.getByRole('button', { name: 'Show password' }).click()
  await page.getByRole('button', { name: 'Add' }).click()
  console.log("adding user...")
  // Check if user is added
  await page.waitForTimeout(3000)
  console.log("after wait timeout")
  await expect(page.getByRole('cell', { name: 'test_user' })).toBeVisible()

  // Delete user
  await page.getByRole('button', { name: 'Delete' }).nth(1).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  console.log("deleting user...")
  // Check if user is deleted
  await page.reload()
  await page.waitForTimeout(3000)
  console.log("refreshed after wait timeout")
  await expect(page.getByRole('cell', { name: 'test_user' })).not.toBeVisible()
})
