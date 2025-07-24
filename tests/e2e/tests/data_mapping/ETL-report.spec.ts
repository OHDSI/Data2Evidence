import { test, expect } from '@playwright/test'
import path from 'path'

test('test', async ({ page }) => {
  test.setTimeout(300 * 1000) // Set timeout to 5 minutes
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByText('ETL').click()
  // Create a new dataflow
  await page.getByLabel('Create new dataflow').getByRole('button').click()
  await page.getByRole('textbox', { name: 'Name' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Manual Test - Data Mapping')
  await page.getByTestId('dialog').getByRole('button', { name: 'Create' }).click()
  await page.getByRole('button', { name: 'Add node' }).click()

  // Select Data Mapping node
  const hideExperimental = page.locator(':has-text("Hide experimental")').locator('input[type="checkbox"]')
  const isHide = await hideExperimental.isChecked()
  console.log(`hide experimental features is ${isHide}`)
  // Turn on experimental features
  if (isHide) {
    await page.getByText('Hide experimental').click()
  }
  await page.getByRole('dialog').getByText('Data mapping').click()
  // Pencil -> Scan Data
  const targetNode = page.locator('.node__title:has-text("data_mapping_node_0")').locator('..')
  const pencilIcon = targetNode.locator('.node__setting')
  await pencilIcon.click()
  await page.locator('[data-id="table_source_menu"]').getByRole('button', { name: 'Scan Data' }).click()
  await page.getByRole('button').first().click()

  // Datatype. Wait for menu to appear
  await page.locator('#menu-').waitFor({ state: 'visible' })
  // use dispatcheEvent to avoid the mouse up/down action in directly "click()" which causes the whole dialog to close
  await page.locator('#menu- li[data-value="csv"]').dispatchEvent('click')

  // Upload file. Wait for the dialog to update with CSV-specific fields
  await page.waitForSelector('label:has-text("Upload file")', {
    state: 'visible',
    timeout: 5000
  })
  await page.getByLabel('Upload file').dispatchEvent('click')
  await page.waitForSelector('#upload-csv', { state: 'attached', timeout: 5000 })
  await page.setInputFiles('#upload-csv', path.join(__dirname, '006_PERSON.csv'))
  // Close any open dropdown/menu by clicking outside or pressing Escape
  await page.keyboard.press('Escape')

  // Scan table. Wait for the "Scan tables" button to become enabled
  await page.waitForSelector('button:has-text("Scan tables"):not([disabled])', {
    state: 'visible',
    timeout: 5000
  })

  await page.getByRole('button', { name: 'Scan tables' }).dispatchEvent('click')
  const checkbox = page.getByRole('checkbox', { name: '006_PERSON.csv' })
  await checkbox.waitFor({
    state: 'visible',
    timeout: 10000
  })
  await checkbox.dispatchEvent('click')
  await page.getByRole('button', { name: 'Apply' }).dispatchEvent('click')

  await page.waitForTimeout(1000) // Wait for the dialog to close
  // Wait for the Loading button to appear
  await page.waitForSelector('button:has-text("Loading...")', {
    state: 'visible',
    timeout: 10000
  })
  // Check if we're back to main view or if progress dialog appeared
  const isMainView = await page.locator('.flow-panel').isVisible()
  const hasProgressDialog = await page.locator('.scan-progress-dialog').isVisible()
  console.log(`Main view visible: ${isMainView}, Progress dialog visible: ${hasProgressDialog}`)

  // Now wait for the progress dialog to appear
  await page.waitForSelector('.scan-progress-dialog', {
    state: 'visible',
    timeout: 30000
  })
  await expect(page.getByText('Completed')).toBeVisible({ timeout: 60000 })
  await expect(page.getByRole('button', { name: 'Save report' })).toBeVisible({
    timeout: 60000
  })
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
  await page.getByRole('button', { name: 'Save report' }).click()
  await downloadPromise
})
