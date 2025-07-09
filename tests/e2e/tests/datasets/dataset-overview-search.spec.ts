import { test, expect } from '@playwright/test'

test.use({
  ignoreHTTPSErrors: true
})

test('test', async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="identifier"]').press('Tab')
  await page.getByRole('button').filter({ hasText: /^$/ }).press('Tab')
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

  // Check if the "Dataset search" feature is already enabled
  const datasetSearchCheckbox = page.locator('#Dataset\\ search')
  const isChecked = await datasetSearchCheckbox.isChecked()

  if (!isChecked) {
    await page.getByText('Dataset search').click()
  }

  await page.getByTestId('button').click()
  await expect(page.getByTestId('snackbar-message')).toContainText('Changes saved')

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).nth(1).click()
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
  await page.waitForTimeout(2000)

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

  await page.keyboard.press('End') // scroll to bottom
  await expect(page.locator('.home-header')).toHaveClass(/home-header--scrolled/)
})
