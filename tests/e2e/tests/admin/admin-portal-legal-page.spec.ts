import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await expect(page.getByRole('tab', { name: 'Terms of use' })).toBeVisible()
  await page.getByRole('tab', { name: 'Privacy policy' }).click()
  await expect(page.getByRole('tab', { name: 'Privacy policy' })).toBeVisible()
  await page.getByRole('tab', { name: 'Imprint' }).click()
  await expect(page.getByRole('tab', { name: 'Imprint' })).toBeVisible()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible()
})
