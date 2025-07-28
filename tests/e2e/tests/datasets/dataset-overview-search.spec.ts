import { test, expect } from '@playwright/test'

test.use({
  ignoreHTTPSErrors: true
})

test('test', async ({ page }) => {
  const timestamp = Date.now()

  // Step 1: Navigate to portal
  await page.goto('https://localhost:443/portal')
  await page.screenshot({ path: `test-results/step01-portal-loaded-${timestamp}.png`, fullPage: true })

  // Step 2: Fill credentials
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="identifier"]').press('Tab')
  await page.getByRole('button').filter({ hasText: /^$/ }).press('Tab')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.screenshot({ path: `test-results/step02-credentials-filled-${timestamp}.png`, fullPage: true })

  // Step 3: Sign in
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.screenshot({ path: `test-results/step03-signed-in-${timestamp}.png`, fullPage: true })

  // Step 4: Click dataset button
  await page.getByTestId('button').nth(1).click()
  await page.screenshot({ path: `test-results/step04-dataset-clicked-${timestamp}.png`, fullPage: true })

  // Step 5: Switch to Admin portal
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.screenshot({ path: `test-results/step05-admin-portal-${timestamp}.png`, fullPage: true })

  // Step 6: Navigate to Setup
  await page.getByRole('link', { name: 'Setup' }).click()
  await page.screenshot({ path: `test-results/step06-setup-clicked-${timestamp}.png`, fullPage: true })

  // Step 7: Click Feature flags
  await page
    .locator('div')
    .filter({ hasText: /^Feature flagsEnable \/ disable featureConfigure$/ })
    .getByTestId('button')
    .click()
  await page.screenshot({ path: `test-results/step07-feature-flags-clicked-${timestamp}.png`, fullPage: true })

  // Step 8: Check if the "Dataset search" feature is already enabled
  const datasetSearchCheckbox = page.locator('#Dataset\\ search')
  const isChecked = await datasetSearchCheckbox.isChecked()
  await page.screenshot({ path: `test-results/step08-dataset-search-checkbox-${timestamp}.png`, fullPage: true })

  if (!isChecked) {
    await page.getByText('Dataset search').click()
    await page.screenshot({ path: `test-results/step09-dataset-search-enabled-${timestamp}.png`, fullPage: true })
  }

  // Step 10: Save feature flags
  await page.getByTestId('button').click()
  await expect(page.getByTestId('snackbar-message')).toContainText('Changes saved')
  await page.screenshot({ path: `test-results/step10-feature-flags-saved-${timestamp}.png`, fullPage: true })

  // Step 11: Navigate to Account
  await page.getByRole('link', { name: 'Account' }).click()
  await page.screenshot({ path: `test-results/step11-account-clicked-${timestamp}.png`, fullPage: true })

  // Step 12: Switch to Researcher portal
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.screenshot({ path: `test-results/step12-researcher-portal-clicked-${timestamp}.png`, fullPage: true })

  // Step 13: Wait for researcher portal to fully load
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `test-results/step13-researcher-portal-loaded-${timestamp}.png`, fullPage: true })

  // Step 14: Wait for and click search textbox
  await expect(page.getByRole('textbox', { name: 'search terms' }).nth(1)).toBeVisible({ timeout: 30000 })
  await page.screenshot({ path: `test-results/step14-search-textbox-visible-${timestamp}.png`, fullPage: true })
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).click()
  await page.screenshot({ path: `test-results/step15-search-textbox-clicked-${timestamp}.png`, fullPage: true })
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).fill('demo')
  await page.getByRole('button', { name: 'Search' }).nth(1).click()
  // Test that "Test" is highlighted with the expected background color
  const testSpan1 = page
    .locator('div')
    .filter({ hasText: /^Demo dataset$/ })
    .locator('span')
    .filter({ hasText: 'Demo' })
    .nth(1)

  // Wait for the element to appear first
  await expect(testSpan1).toHaveCSS('background-color', 'rgb(220, 222, 244)')

  await page.getByRole('textbox', { name: 'search terms' }).nth(1).click()
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).fill('dataset')
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).press('Enter')

  // Test that "Test" is highlighted with the expected background color
  const testSpan2 = page.locator('div').locator('span').filter({ hasText: 'dataset' }).nth(1)
  await expect(testSpan2).toHaveCSS('background-color', 'rgb(220, 222, 244)')

  await page.getByRole('textbox', { name: 'search terms' }).nth(1).click()
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).fill('xxxxxxxxx')

  // Seems like there is some kind debounce or delay in the search functionality
  await page.waitForTimeout(2000)
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).press('Enter')
  await expect(page.locator('.overview__datasets--empty')).toContainText('No dataset available')

  await page.waitForTimeout(3000)
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).fill('')
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).press('Enter')
  await page.waitForTimeout(5000)

  // Demo setup only has one dataset, so scrolling to bottom is not enough to make the header scrolled
  // Clone the dataset div to create more content for scrolling
  await page.evaluate(() => {
    const originalDiv = document.querySelector(
      '#root > div > div > main > div > div.overview__body > div > div > div:nth-child(1)'
    )
    if (originalDiv) {
      const clonedDiv1 = originalDiv.cloneNode(true)
      originalDiv.parentNode?.appendChild(clonedDiv1)
      const clonedDiv2 = originalDiv.cloneNode(true)
      originalDiv.parentNode?.appendChild(clonedDiv2)
    }
  })
  await page.waitForTimeout(1000)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)) // scroll to bottom
  await expect(page.locator('.home-header')).toHaveClass(/home-header--scrolled/)
})
