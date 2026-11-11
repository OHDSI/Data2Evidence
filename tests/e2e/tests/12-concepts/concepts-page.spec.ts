import { test, expect, openAtlasDataset } from '../fixtures'

const TEST_NAME = 'Concepts page'

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAtlasDataset(page)
  await page.getByRole('link', { name: 'Concepts' }).click()

  await expect(page.getByRole('heading', { name: 'Concepts' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Concept Sets' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: 'Search' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Concept Set' })).toBeVisible()
})
