import { test, expect } from '@playwright/test'
import path from 'path'

test('concept-mapping', async ({ page }) => {
  // Authentication
  await page.goto('https://localhost:443/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

  const timestamp = Date.now()
  const dataflowName = `ConceptMappingFlow_${timestamp}`

  // Go to ETL and create new flow
  await page.getByRole('link', { name: 'ETL' }).click()

  // If no flows yet, try and click this button
  await page.waitForSelector('button:has-text("Create your first dataflow")', { timeout: 15000 })
  await page.getByRole('button', { name: 'Create your first dataflow' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
  await page.getByRole('textbox', { name: 'Comment' }).fill('Test concept mapping flow')
  await page.getByRole('button', { name: 'Create' }).click()

  // Uncheck "Hide experimental" to show concept mapping node
  await expect(page.getByText('Hide experimental')).toBeVisible()
  await page.getByText('Hide experimental').click()

  // This timeout is necessary as clicking the concept mapping button too quickly seems to have an issue which causes the node not to be added. Remove this wait to see if the issue persists.
  await page.waitForTimeout(1500)
  // Select concept mapping node
  await page.getByText('Concept mapping').click()
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()

  // Wait for the concept mapping node to be added to canvas
  const nodeTitle = page.locator('.node__title').filter({ hasText: 'concept_mapping_node_0' })
  await expect(nodeTitle).toBeVisible()

  // Click to select the node first
  await nodeTitle.click()
  await page.waitForTimeout(500)

  // Hover on the node to reveal the edit button
  await nodeTitle.hover()
  await page.waitForTimeout(500)

  // Click the pencil (edit) button using a more direct approach
  // Look for any button that appears in the node area after hover
  await page.locator('.node__header > div:nth-child(3)').click()

  // Wait for the concept mapping configuration dialog
  await expect(page.getByText('Configure Concept mapping')).toBeVisible()

  // Handle file chooser dialog that opens when clicking the upload area
  const csvFilePath = path.join(__dirname, 'concept_mappings.csv')

  // Set up file chooser handler before clicking
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Click here to choose a file, or drop a file').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(csvFilePath)

  // Wait for file to be processed
  await expect(page.getByText('concept_mappings.csv')).toBeVisible()

  // Wait a moment for the column mapping interface to load
  await page.waitForTimeout(2000)

  // First dropdown - Source code column (keep as Source)
  await page.locator('[role="button"]').filter({ hasText: 'Source' }).first().click()
  await page.getByRole('option', { name: 'Source' }).click()

  // Second dropdown - Source name column
  await page.locator('[role="button"]').filter({ hasText: 'Source' }).nth(1).click()
  await page.getByRole('option', { name: 'Name', exact: true }).click()

  // Third dropdown - Source frequency column
  await page.locator('[role="button"]').filter({ hasText: 'Source' }).nth(1).click()
  await page.getByRole('option', { name: 'Frequency' }).click()

  // Fourth dropdown - Additional info column
  await page.locator('[role="button"]').filter({ hasText: 'Source' }).nth(1).click()
  await page.getByRole('option', { name: 'Description' }).click()

  await page.waitForTimeout(1000) // Wait for dropdown to fully open

  // Click import
  await page.getByRole('button', { name: 'Import' }).click()

  // Wait for import to complete - look for any indication that data has loaded
  await page.waitForTimeout(3000)

  // Check if there's a table or any data visible
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

  // Verify import was successful by checking for table presence
  await expect(page.locator('table')).toBeVisible({ timeout: 15000 })

  // Verify we have column headers (any headers indicate successful import)
  await expect(page.getByRole('columnheader').first()).toBeVisible()

  // Verify we have data rows (just check that table has content)
  await expect(page.getByRole('cell').first()).toBeVisible()

  // Click download CSV with timeout handling
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await page.getByRole('button', { name: 'Download CSV' }).click()
  const download = await downloadPromise

  // Verify the CSV is downloaded
  expect(download.suggestedFilename()).toContain('.csv')

  // Optional: Read and verify the downloaded file contents
  const downloadPath = await download.path()
  const fs = require('fs')
  const downloadedContent = fs.readFileSync(downloadPath, 'utf8')

  // Verify it contains our expected data
  expect(downloadedContent).toContain('Source')
  expect(downloadedContent).toContain('Name')
  expect(downloadedContent).toContain('Frequency')

  // Click 'clear and import another file' - the concept mapping should be cleared
  await page.getByRole('button', { name: 'Clear and import another file' }).click()

  // Wait for clear action to complete
  await page.waitForTimeout(2000)

  // Verify the table is cleared - check that we're back to the file upload state
  await expect(page.getByText('Click here to choose a file, or drop a file')).toBeVisible({ timeout: 10000 })
})
