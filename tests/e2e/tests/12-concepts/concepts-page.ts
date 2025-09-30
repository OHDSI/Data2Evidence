import { test, expect } from '@playwright/test'

const TEST_NAME = 'Concepts page'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Concepts' }).click()
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`
    - tablist:
      - tab "Concept Search" [selected]
      - tab "Concept Sets"
    `)
})
