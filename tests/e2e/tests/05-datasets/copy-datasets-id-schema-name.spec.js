import { test, expect, openAdminPortalFromAtlas } from '../fixtures'

const TEST_NAME = 'copy-dataset-id-schema-name'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
test.describe.configure({ retries: 3 }) // Re-try up to 3 times for flaky tests

test(TEST_NAME, async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'Data sources' }).click()

  // Get the dataset ID
  await page.locator('.d2e-ds__copy.d2e-ds__mono').first().click()
  const dataset_id = await page.evaluate(async () => await navigator.clipboard.readText())

  // Get the schema name
  await page.locator('.d2e-ds__copy.d2e-ds__trunc').first().click()
  const schema_name = await page.evaluate(async () => await navigator.clipboard.readText())

  // Check if the cell contains the dataset ID and schema name
  // With parent-child structure, the dataset ID might appear in multiple rows (parent + children with error messages)
  // Use .first() to avoid strict mode violation, or search in the dataset ID column specifically
  await expect(page.locator('tr', { hasText: dataset_id }).first()).toBeVisible()
  await expect(page.locator('tr', { hasText: schema_name }).first()).toBeVisible()
})
