import { test, expect } from '@playwright/test'

test('patient-analytics-patient-list', async ({ page }) => {
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await page.getByRole('button', { name: 'D2E' }).click()
  await expect(page.getByText('2694 / 2694')).toBeVisible()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  //Add Age filter
  await page.getByTitle('Basic Data - Age').click();
  await page.getByRole('textbox').fill('>55');
  await page.getByRole('textbox').press('Enter');
  await expect(page.getByText('1971 / 2694')).toBeVisible()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  //Add Condition Occurrence filter card
  await page.getByTitle('Add Filter Card').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click();
  await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('viral');
  await page.getByText('Viral sinusitis - 30').click();
  await expect(page.getByText('1968 / 2694')).toBeVisible()
  //Go to patient list
  await page.getByRole('button', { name: '' }).click();
  await page.getByRole('cell', { name: 'Age ' }).locator('span').nth(1).click();
  await page.getByText(' Sort Ascending').click();
  await page.getByRole('cell', { name: 'Ethnicity concept id ' }).locator('span').nth(1).click();
  await page.getByText(' Sort Descending').click();
  await page.getByRole('cell', { name: 'Race concept id ' }).locator('span').nth(1).click();
  await page.getByText('Remove', { exact: true }).click();
  //Add Observation interaction
  await page.getByRole('button', { name: 'Add Interaction' }).click();
  await page.locator('#pane-right').getByText('Observation', { exact: true }).click();
  await page.getByRole('cell', { name: 'Observation ' }).locator('span').click();
  await page.getByText('Add Attribute').click();
  await page.locator('thead').getByText('Observation Id').click();
  //Export to ZIP file
  await page.getByTitle('Export to File').click();
  await page.getByRole('menuitem', { name: 'Export to ZIP File' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
})