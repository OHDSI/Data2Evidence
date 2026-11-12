import { test, expect, openAdminPortalFromAtlas } from '../fixtures'

const TEST_NAME = 'jobs-overview'

test(TEST_NAME, async ({ page }) => {
  // Sign in
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Switch to admin portal
  await openAdminPortalFromAtlas(page)

  // Open jobs
  await page.getByRole('link', { name: 'Jobs' }).click()

  // Verify all tabs are present
  await expect(page.getByRole('heading')).toContainText('Job Runs')
  await page.getByRole('button', { name: 'Jobs' }).click()
  await expect(page.getByRole('heading')).toContainText('Jobs')
  await page.getByRole('button', { name: 'Blocks' }).click()
  await expect(page.getByRole('navigation')).toContainText('Blocks')
  await page.getByRole('button', { name: 'Variables' }).click()
  await expect(page.getByRole('navigation')).toContainText('Variables')
})
