import { test, expect } from '@playwright/test'

test('dataset-overview-chart', async ({ page }) => {
  await page.goto('https://localhost:443/sign-in')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Select action' }).first().click()
  await page.locator('#menu- div').first().click()
  await page.getByRole('button', { name: 'Update dataset metadata' }).click()
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.getByTestId('card').first().click()
  await expect(page.locator('tbody')).toContainText(
    '{"Observation Period Count": "1000", "Death Count": "52", "Visit Occurrence Count": "55261", "Visit Detail Count": "0", "Condition Occurrence Count": "147186", "Drug Exposure Count": "57095", "Procedure Occurrence Count": "137522", "Device Exposure Count": "2262", "Measurement Count": "34556", "Observation Count": "19339", "Note Count": "0", "Episode Count": "0", "Specimen Count": "0"}'
  )
  await page.getByText('Account').click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByRole('button', { name: 'Select action' }).first().click()
  await page.getByRole('option', { name: 'Update dataset' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Entity Count DistributionValue$/ })
    .getByPlaceholder(' ')
    .click()
  await page
    .locator('div')
    .filter({ hasText: /^Entity Count DistributionValue$/ })
    .getByPlaceholder(' ')
    .fill(
      '{"Observation Period Count": "2000", "Death Count": "52", "Visit Occurrence Count": "55261", "Visit Detail Count": "0", "Condition Occurrence Count": "147186", "Drug Exposure Count": "57095", "Procedure Occurrence Count": "137522", "Device Exposure Count": "2262", "Measurement Count": "34556", "Observation Count": "19339", "Note Count": "0", "Episode Count": "0", "Specimen Count": "0"}'
    )
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByTestId('card').first().click()
  await expect(page.locator('tbody')).toContainText(
    '{"Observation Period Count": "2000", "Death Count": "52", "Visit Occurrence Count": "55261", "Visit Detail Count": "0", "Condition Occurrence Count": "147186", "Drug Exposure Count": "57095", "Procedure Occurrence Count": "137522", "Device Exposure Count": "2262", "Measurement Count": "34556", "Observation Count": "19339", "Note Count": "0", "Episode Count": "0", "Specimen Count": "0"}'
  )
})
