import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  await page.goto('https://localhost:443')
  await page.getByTestId('button').nth(1).click()
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('HANA-CDMSYNPUF1K').first().click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('row', { name: 'Cohorts_def.csv 653.8 KB' }).getByRole('button').click()
  const download = await downloadPromise
})
