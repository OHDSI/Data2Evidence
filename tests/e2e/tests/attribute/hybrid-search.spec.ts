import { test, expect } from '@playwright/test'

test.skip('attribute-hybrid-search', async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Hybrid searchConfigure hybrid search for conceptsConfigure$/ })
    .getByTestId('button')
    .click()

  // Enable hybrid search and save
  await page.getByRole('textbox', { name: 'Semantic Ratio' }).click()
  await page.getByRole('textbox', { name: 'Semantic Ratio' }).fill('0.5')
  await page.getByText('Enable Hybrid Search').click()
  await page.getByTestId('button').click()
  await expect(page.getByTestId('snackbar').locator('div').filter({ hasText: 'Changes saved' }).first()).toBeVisible()
  await page.reload()

  // Assert changes have been made
  await expect(page.getByRole('textbox', { name: 'Semantic Ratio' })).toHaveValue('0.5')
  await expect(page.getByText('Enable Hybrid Search')).toBeChecked()

  // Disable hybrid search and save
  await page.getByRole('textbox', { name: 'Semantic Ratio' }).click()
  await page.getByRole('textbox', { name: 'Semantic Ratio' }).fill('0')
  await page.getByText('Enable Hybrid Search').click()
  await page.getByTestId('button').click()
  await expect(page.getByTestId('snackbar').locator('div').filter({ hasText: 'Changes saved' }).first()).toBeVisible()
  await page.reload()

  // Assert changes have been made
  await expect(page.getByRole('textbox', { name: 'Semantic Ratio' })).toHaveValue('0')
  await expect(page.getByText('Enable Hybrid Search')).not.toBeChecked()
})
