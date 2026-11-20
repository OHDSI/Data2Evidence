import { test, expect } from '../fixtures'

const TEST_NAME = 'postgres-data-model-options'
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
  await page.getByRole('link', { name: 'Data sources' }).click()
  await page.getByRole('button', { name: 'Add data source' }).click()
  await page.getByRole('combobox', { name: 'CDM schema option' }).click()
  await page.getByRole('option', { name: 'Create new schema', exact: true }).click()
  await page.getByRole('combobox', { name: 'Databases' }).click()
  await page.getByRole('option', { name: 'demo_database-postgres' }).click()
  await expect(page.getByRole('combobox', { name: 'Management mode' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Cache data source name' })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Data model option', exact: true }).click()
  const options = page.getByRole('option')
  await expect(page.getByRole('option', { name: 'omop5-4 [omop_cdm_plugin]' })).toBeVisible()
  await expect(options.filter({ hasText: /i2b2|medical-imaging|waveform/ })).toHaveCount(0)
  for (const name of await options.allTextContents()) {
    expect(name.toLowerCase()).toMatch(/^omop/)
  }
})
