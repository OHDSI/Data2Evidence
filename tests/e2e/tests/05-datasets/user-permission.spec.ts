import { test, expect } from '@playwright/test'

const TEST_NAME = 'dataset-user-permission'
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

  // Switch to Admin portal
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  // Create user - testuserC
  await page.getByRole('button', { name: 'Add user' }).click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill('testuserC')
  await page.getByRole('textbox', { name: 'Password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Add' }).click({ timeout: 30000 })
  // Wait for the user to appear after clicking Add
  await page.waitForTimeout(2000)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'testuserC' })).toBeVisible()

  // Go to Datasets
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.getByRole('button', { name: 'Select action' }).first()).toBeVisible()

  // Manage dataset permissions
  await page.getByRole('button', { name: 'Select action' }).first().click()
  await page.getByRole('option', { name: 'Permissions' }).click()
  await page.getByRole('tab', { name: 'Access' }).click()

  // Grant access to testuserC user
  const addButton = page.getByTestId('dialog').getByTestId('button')
  await expect(addButton).toBeVisible()
  await addButton.click()
  await expect(page.getByRole('menu')).toBeVisible({ timeout: 10000 })
  // Wait for 10 seconds to ensure the menu items are visible
  await page.waitForTimeout(10000)
  await expect(page.getByRole('menuitem', { name: 'testuserC' })).toBeVisible({ timeout: 10000 })
  await page.getByRole('menuitem', { name: 'testuserC' }).click()
  await expect(page.getByRole('cell', { name: 'testuserC' })).toBeVisible({ timeout: 10000 })

  // Revoke access to testuserC user
  const testuserCRow = page.getByRole('row', { name: /testuserC/ })
  const revokeButton = testuserCRow.getByRole('button', { name: 'Revoke' })
  await expect(revokeButton).toBeVisible()
  await revokeButton.click()
  await page.waitForTimeout(3000)
  await expect(
    page.getByTestId('snackbar').locator('div').filter({ hasText: "You've revoked access for" }).first()
  ).toBeVisible()
})
