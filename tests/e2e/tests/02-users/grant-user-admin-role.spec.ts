import { test, expect } from '@playwright/test'

const TEST_NAME = 'grant-user-admin-role'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  //create a new user
  await page.getByTestId('button').click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill('researcher_1')
  await page.getByRole('textbox', { name: 'Password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).dblclick()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled()
  await expect(page.getByText('Add userUsernameUsername')).toBeHidden()

  await page.reload()
  await page.getByRole('button', { name: 'Edit' }).nth(1).click()
  await page.getByTestId('dialog').getByText('User Admin').click()
  await expect(page.getByTestId('dialog').getByText('User Admin')).toBeChecked()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()
  await expect(page.getByRole('row', { name: 'researcher_1 Viewer User' }).locator('div').nth(2)).toBeVisible()

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('researcher_1')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })

  // Delete the user
  await page.getByRole('button', { name: 'Delete' }).nth(1).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page.getByText('Delete userAre you sure you')).toBeHidden()
})
