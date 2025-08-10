import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  await page.goto('https://localhost:443')
  await page.getByTestId('button').nth(1).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('synpuf5pct').click()
  await page.getByRole('link', { name: 'Concepts' }).click()
})
