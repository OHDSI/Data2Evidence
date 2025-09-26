import { test, expect } from '@playwright/test'

test('Concepts page', async ({ page }) => {
  await page.goto('https://localhost:443')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Dataset' }).click()
  await page.getByRole('option', { name: 'Demo Dataset' }).click()
  await page.getByRole('link', { name: 'Concepts' }).click()
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`
    - tablist:
      - tab "Concept Search" [selected]
      - tab "Concept Sets"
    `)
});
