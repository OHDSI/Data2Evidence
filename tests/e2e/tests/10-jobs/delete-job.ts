import { test, expect } from '@playwright/test'

const TEST_NAME = 'Delete Job'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Jobs' }).click()
  await page.getByRole('button', { name: 'Jobs' }).click()
  await expect(page.locator('#jobs-main')).toMatchAriaSnapshot(`
    - button "Job Runs"
    - button "Jobs"
    - button "Blocks"
    - button "Variables"
    `)
  await page.getByRole('row', { name: 'cohort_generator_plugin' }).getByRole('button').click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('dialog')).toMatchAriaSnapshot(`
    - text: Delete Deployment
    - button
    `)
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('row', { name: 'create_cachedb_fhir_plugin' }).getByRole('button').click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('body')).toMatchAriaSnapshot(`- paragraph: Deployment deleted`)
  await page.getByRole('link', { name: 'Setup' }).click()
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`- text: Setup`)
  await page
    .locator('div')
    .filter({ hasText: /^PluginsManage pluginsConfigure$/ })
    .getByTestId('button')
    .click()
  await expect(page.getByTestId('title')).toMatchAriaSnapshot(`- text: Plugins`)
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`- button "Install new plugin"`)
  await page.getByRole('row', { name: 'd2e-flows 0.0.99-1758782375-' }).getByRole('button').nth(1).click()
  await expect(page.getByTestId('dialog-title')).toMatchAriaSnapshot(`- text: Uninstall plugin`)
  await expect(page.getByRole('dialog')).toMatchAriaSnapshot(`- text: Type the plugin name to confirm.`)
  await page.getByPlaceholder(' ').click()
  await page.getByPlaceholder(' ').fill('d2e-flows')
  await page.getByRole('button', { name: 'Confirm uninstall' }).click()
})
