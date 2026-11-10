import { test, expect, openAdminPortalFromAtlas, resetPortalSession } from '../fixtures'

const TEST_NAME = 'grant-user-admin-role'
const USERNAME = `useradmin${Date.now().toString().slice(-8)}`
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)

  //create a new user
  await page.getByTestId('button').click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME)
  await page.getByRole('textbox', { name: 'Password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).dblclick()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled()
  await expect(page.getByText('Add userUsernameUsername')).toBeHidden()

  await page.reload()
  const userRow = page.getByRole('row').filter({ hasText: USERNAME })
  await userRow.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByTestId('dialog').getByText('User Admin')).toBeVisible()
  await page.getByTestId('dialog').getByText('User Admin').click()
  await expect(page.getByTestId('dialog').getByText('User Admin')).toBeChecked()
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByTestId('dialog')).toBeHidden()
  await expect(userRow).toContainText('User Admin')

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill(USERNAME)
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible()
  await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.05 })

  // Delete the user
  await page.getByRole('button', { name: 'Delete' }).nth(1).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page.getByText('Delete userAre you sure you')).toBeHidden()
})
