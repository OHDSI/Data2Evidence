import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  await page.goto('/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'ETL' }).click()
  try {
    await expect(page.getByText('There is no dataflow to show')).toBeVisible()
    await page.getByTestId('button').click()
  } catch (e) {
    await page.getByLabel('Create new dataflow').getByRole('button').click()
  }
  await page.getByRole('textbox', { name: 'Name' }).fill('new_data_flow')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('dialog').getByText('Python', { exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('textbox', { name: 'Describe your changes' }).click()
  await page.getByRole('textbox', { name: 'Describe your changes' }).fill('version2')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Show version history').getByRole('button').click()
  await page.getByRole('button', { name: 'View' }).nth(1).click()
  await page.waitForTimeout(1000)
  await expect(page.getByRole('combobox', { name: 'new_data_flow (Version #1)' })).toBeVisible()
})
