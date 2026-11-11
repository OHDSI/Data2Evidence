import { test, expect, openAdminPortalFromAtlas, openAtlasAccount, openAtlasPortalFromAdmin } from '../fixtures'

test('test', async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Platform content & legal textsSet image, descriptions, and legal textsConfigure$/ })
    .getByTestId('button')
    .click()
  if ((await page.getByText('Display Terms Of Use').isChecked()) === false) {
    await page.getByText('Display Terms Of Use').click()
  }
  if ((await page.getByText('Display Privacy Policy').isChecked()) === false) {
    await page.getByText('Display Privacy Policy').click()
  }
  if ((await page.getByText('Display Imprint').isChecked()) === false) {
    await page.getByText('Display Imprint').click()
  }
  await expect(page.getByText('Display Imprint')).toBeChecked()
  await expect(page.getByText('Display Terms Of Use')).toBeChecked()
  await expect(page.getByText('Display Privacy Policy')).toBeChecked()
  const saveButton = page.getByRole('button', { name: 'Save' })
  if ((await saveButton.count()) > 0 && (await saveButton.isEnabled())) {
    await saveButton.click()
  }
  await openAtlasPortalFromAdmin(page)
  await openAtlasAccount(page)
  await expect(page.getByRole('tab', { name: 'Terms of use' })).toBeVisible()
  await page.getByRole('tab', { name: 'Privacy policy' }).click()
  await expect(page.getByRole('tab', { name: 'Privacy policy' })).toBeVisible()
  await page.getByRole('tab', { name: 'Imprint' }).click()
  await expect(page.getByRole('tab', { name: 'Imprint' })).toBeVisible()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible()
})
