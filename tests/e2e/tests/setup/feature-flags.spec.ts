import { test, expect } from '@playwright/test'

test('setup-feature-flags', async ({ page }) => {
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
    .filter({ hasText: /^Feature flagsEnable \/ disable featureConfigure$/ })
    .getByTestId('button')
    .click()

  const conceptsCheckbox = await page.getByText('Concepts')
  if (!(await conceptsCheckbox.isChecked())) {
    await conceptsCheckbox.click()
  }
  await expect(conceptsCheckbox).toBeChecked()

  const CohortCheckbox = await page.getByText('Cohort')
  if (!(await CohortCheckbox.isChecked())) {
    await CohortCheckbox.click()
  }
  await expect(CohortCheckbox).toBeChecked()

  const notebooksCheckbox = await page.getByText('Notebooks')
  if (!(await notebooksCheckbox.isChecked())) {
    await notebooksCheckbox.click()
  }
  await expect(notebooksCheckbox).toBeChecked()

  await page.getByTestId('button').click()
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByText('Demo dataset').first().click()
  await expect(page.getByRole('link', { name: 'Concepts' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Cohorts' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Notebooks' })).toBeVisible()
})
