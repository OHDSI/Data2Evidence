import {
  test,
  expect,
  acceptAtlasLicense,
  openAdminPortalFromAtlas,
  openAtlasAccount,
  resetPortalSession
} from '../fixtures'

const TEST_NAME = 'researcher-request-dataset-access'
const DATASET_NAME = 'Demo dataset'
const USERNAME = `researcher${Date.now().toString().slice(-8)}`
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

let userMayExist = false

test.afterEach(async ({ page }) => {
  if (!userMayExist) return

  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)

  const userRow = page.getByRole('row').filter({ hasText: USERNAME })
  if ((await userRow.count()) > 0) {
    await userRow.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Yes, delete' }).click()
    await expect(userRow).toHaveCount(0)
  }

  userMayExist = false
})

test(TEST_NAME, async ({ page }) => {
  // Go to portal and log in as admin
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)

  // Select the demo dataset and update it to show request access button
  await page.getByRole('link', { name: 'Data sources' }).click()
  const datasetTable = page.locator('.d2e-table').first()
  await expect(datasetTable).toBeVisible()
  await expect(datasetTable.locator('tbody tr').first()).toBeVisible()
  const demoRow = datasetTable
    .locator('tbody tr')
    .filter({ hasText: /Demo dataset/i })
    .filter({ hasText: /webapi/i })
  await expect(demoRow).toBeVisible()

  await demoRow.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit data source' }).click()
  const requestAccessCheckbox = page.getByRole('checkbox', { name: 'Show request access button' })
  await requestAccessCheckbox.check()
  await expect(requestAccessCheckbox).toBeChecked()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('dialog')).toBeHidden()

  // Create a new researcher
  await page.getByRole('link', { name: 'Users' }).click()
  await page.getByTestId('button').click()
  await page.getByRole('textbox', { name: 'Username' }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME)
  await page.getByRole('textbox', { name: 'Password' }).click()
  await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345')
  userMayExist = true
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await resetPortalSession(page)

  // Login as researcher
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill(USERNAME)
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await acceptAtlasLicense(page)

  const datasetButton = page.getByRole('button', { name: new RegExp(`${DATASET_NAME}.*No access`, 'i') })
  await expect(datasetButton).toBeVisible()
  await datasetButton.click()

  // Check that the request access button is visible and click it
  const requestAccessButton = page.getByTestId('request-access-button')
  await expect(requestAccessButton).toBeVisible()
  await requestAccessButton.click()
  await expect(page.getByTestId('access-badge')).toContainText('Pending access')

  // Login as admin and approve the request to dataset access
  await openAtlasAccount(page, new RegExp(USERNAME, 'i'))
  await page.getByRole('button', { name: 'Logout' }).click()
  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'Data sources' }).click()
  const datasetTableAgain = page.locator('.d2e-table').first()
  await expect(datasetTableAgain).toBeVisible()
  await expect(datasetTableAgain.locator('tbody tr').first()).toBeVisible()
  // Find the demo row again (can't reuse locator after navigation)
  const demoRowAgain = datasetTableAgain
    .locator('tbody tr')
    .filter({ hasText: /Demo dataset/i })
    .filter({ hasText: /webapi/i })
  await expect(demoRowAgain).toBeVisible()
  await demoRowAgain.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Update permissions' }).click()
  await page.getByTestId('dialog').getByText('Select action').click()
  await page.getByRole('option', { name: 'Approve' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  // Login as researcher and check that the dataset can be accessed
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()
  await resetPortalSession(page)
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill(USERNAME)
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await acceptAtlasLicense(page)
  await page.getByRole('button', { name: new RegExp(`${DATASET_NAME}.*Have access`, 'i') }).click()

  // Check that Atlas dataset details are available after access is granted
  await expect(page.getByRole('heading', { name: DATASET_NAME })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Description' })).toBeVisible()
})
