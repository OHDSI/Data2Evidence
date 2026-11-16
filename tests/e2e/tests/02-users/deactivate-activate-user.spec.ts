import { test, expect } from '../fixtures'

const TEST_NAME = 'deactivate-activate-user'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test.use({
  ignoreHTTPSErrors: true
})

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click() // account button
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

  await page.getByRole('button', { name: 'Add new user' }).click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill('testuser')
  await page.getByRole('textbox', { name: 'Password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('J*%YqaKNbnqH@')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.waitForTimeout(2000)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'testuser' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Viewer', exact: true })).toBeVisible()

  await page
    .getByRole('row', { name: /^testuser / })
    .getByRole('button', { name: 'Actions' })
    .click()
  await page.getByRole('menuitem', { name: 'Deactivate' }).click()
  await page.waitForTimeout(2000)
  await page.reload()
  await expect(page.getByRole('row', { name: /^testuser / })).toContainText('Inactive')

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('testuser')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('J*%YqaKNbnqH@')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('This account is suspended.')).toBeVisible()

  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  await page
    .getByRole('row', { name: /^testuser / })
    .getByRole('button', { name: 'Actions' })
    .click()
  await page.getByRole('menuitem', { name: 'Activate' }).click()
  await page.waitForTimeout(2000)
  await page.reload()
  await expect(page.getByRole('row', { name: /^testuser / })).toContainText('Viewer')

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('testuser')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('J*%YqaKNbnqH@')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click() // account button
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  await page.getByRole('button', { name: 'Logout' }).click()

  // Delete the user
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page
    .getByRole('row', { name: /^testuser / })
    .getByRole('button', { name: 'Actions' })
    .click()
  await page.getByRole('menuitem', { name: 'Delete user' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page.getByText('Delete userAre you sure you')).toBeHidden()
})
