import { test, expect, openAdminPortalFromAtlas, openAtlasAccount, resetPortalSession } from '../fixtures'

const TEST_NAME = 'deactivate-activate-user'
const USERNAME = `e2euser${Date.now().toString().slice(-8)}`
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
  await openAdminPortalFromAtlas(page)
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

  await page.getByTestId('button').click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME)
  await page.getByRole('textbox', { name: 'Password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('J*%YqaKNbnqH@')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.waitForTimeout(2000)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByRole('cell', { name: USERNAME })).toBeVisible()
  await expect(
    page.getByRole('row').filter({ hasText: USERNAME }).getByRole('cell', { name: 'Viewer', exact: true })
  ).toBeVisible()

  await page.getByRole('row').filter({ hasText: USERNAME }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Deactivate' }).click()
  await page.waitForTimeout(2000)
  await page.reload()
  await expect(page.getByRole('cell', { name: 'Inactive' }).locator('div').first()).toBeVisible()

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill(USERNAME)
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('J*%YqaKNbnqH@')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('This account is suspended.')).toBeVisible()

  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)

  await page.getByRole('row').filter({ hasText: USERNAME }).getByRole('button').nth(2).click()
  await page.getByRole('menuitem', { name: 'Activate' }).click()
  await page.waitForTimeout(2000)
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: USERNAME }).locator('div').first()).toBeVisible()

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill(USERNAME)
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('J*%YqaKNbnqH@')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAtlasAccount(page, new RegExp(USERNAME, 'i'))
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  await page.getByRole('button', { name: 'Logout' }).click()

  // Delete the user
  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await page.getByRole('button', { name: 'Delete' }).nth(1).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page.getByText('Delete userAre you sure you')).toBeHidden()
})
