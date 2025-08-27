import { test, expect } from '@playwright/test'

const TEST_NAME = 'metadata'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Select action' }).first().click()
  await page.getByRole('option', { name: 'Update dataset' }).click()
  await page.getByRole('textbox', { name: 'Type' }).click()
  await page.getByRole('textbox', { name: 'Type' }).fill('test')
  await page.getByRole('textbox', { name: 'Token dataset code' }).click()
  await page.getByRole('textbox', { name: 'Token dataset code' }).fill('test')

  const publisherButton = page.getByRole('button', { name: 'Publisher' })
  if (await publisherButton.isVisible()) {
    await page
      .locator('div')
      .filter({ hasText: /^PublisherValue$/ })
      .getByPlaceholder(' ')
      .click()
    await page
      .locator('div')
      .filter({ hasText: /^PublisherValue$/ })
      .getByPlaceholder(' ')
      .fill('ALP')
  } else {
    await page.getByRole('button', { name: 'add metadata' }).click()
    await page.locator('div > .u-padding-vertical--small').last().click()
    await page.getByRole('option', { name: 'Publisher' }).click()
    await page
      .locator('div')
      .filter({ hasText: /^PublisherValue$/ })
      .getByPlaceholder(' ')
      .click()
    await page
      .locator('div')
      .filter({ hasText: /^PublisherValue$/ })
      .getByPlaceholder(' ')
      .fill('ALP')
  }
  await page.getByRole('combobox', { name: 'Tags' }).click()
  await page.getByRole('option', { name: 'COVID' }).click()
  await expect(page.getByRole('button', { name: 'COVID' })).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByTestId('card-content').first().click()
  await expect(page.locator('tbody')).toContainText('Publisher')
  await expect(page.locator('tbody')).toContainText('ALP')
  await expect(page.locator('div').filter({ hasText: /^COVID$/ })).toBeVisible()
})
