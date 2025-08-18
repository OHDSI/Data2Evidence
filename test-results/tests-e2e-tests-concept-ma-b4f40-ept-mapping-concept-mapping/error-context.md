# Test info

- Name: concept-mapping
- Location: /Users/zhi.mindata4life-asia.care/Documents/Projects/d2e/tests/e2e/tests/concept-mapping/concept-mapping.spec.ts:4:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at https://localhost/portal
Call log:
  - navigating to "https://localhost/portal", waiting until "load"

    at /Users/zhi.mindata4life-asia.care/Documents/Projects/d2e/tests/e2e/tests/concept-mapping/concept-mapping.spec.ts:6:14
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test'
   2 | import path from 'path'
   3 |
   4 | test('concept-mapping', async ({ page }) => {
   5 |   // Authentication
>  6 |   await page.goto('https://localhost:443/portal')
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at https://localhost/portal
   7 |   await page.locator('input[name="identifier"]').fill('admin')
   8 |   await page.locator('input[name="password"]').fill('Updatepassword12345')
   9 |   await page.getByRole('button', { name: 'Sign in' }).click()
   10 |   await page.getByTestId('button').nth(1).click()
   11 |   await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
   12 |
   13 |   const timestamp = Date.now()
   14 |   const dataflowName = `ConceptMappingFlow_${timestamp}`
   15 |
   16 |   // Go to ETL and create new flow
   17 |   await page.getByRole('link', { name: 'ETL' }).click()
   18 |
   19 |   // Handle both scenarios: no flows (Create your first dataflow) or existing flows (Create new dataflow)
   20 |   try {
   21 |     // First try to find "Create your first dataflow" button (when no flows exist)
   22 |     await page.waitForSelector('button:has-text("Create your first dataflow")', { timeout: 5000 })
   23 |     await page.getByRole('button', { name: 'Create your first dataflow' }).click()
   24 |   } catch {
   25 |     // If that fails, look for "Create new dataflow" button (when flows already exist)
   26 |     await page.getByLabel('Create new dataflow').getByRole('button').click()
   27 |   }
   28 |   await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
   29 |   await page.getByRole('textbox', { name: 'Comment' }).fill('Test concept mapping flow')
   30 |   await page.getByRole('button', { name: 'Create' }).click()
   31 |
   32 |   // Uncheck "Hide experimental" to show concept mapping node
   33 |   await expect(page.getByText('Hide experimental')).toBeVisible()
   34 |   await page.getByText('Hide experimental').click()
   35 |
   36 |   // This timeout is necessary as clicking the concept mapping button too quickly seems to have an issue which causes the node not to be added. Remove this wait to see if the issue persists.
   37 |   await page.waitForTimeout(1500)
   38 |   // Select concept mapping node
   39 |   await page.getByText('Concept mapping').click()
   40 |   await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
   41 |
   42 |   // Wait for the concept mapping node to be added to canvas
   43 |   const nodeTitle = page.locator('.node__title').filter({ hasText: 'concept_mapping_node_0' })
   44 |   await expect(nodeTitle).toBeVisible()
   45 |
   46 |   // Click to select the node first
   47 |   await nodeTitle.click()
   48 |   await page.waitForTimeout(500)
   49 |
   50 |   // Hover on the node to reveal the edit button
   51 |   await nodeTitle.hover()
   52 |   await page.waitForTimeout(500)
   53 |
   54 |   // Click the pencil (edit) button using a more direct approach
   55 |   // Look for any button that appears in the node area after hover
   56 |   await page.locator('.node__header > div:nth-child(3)').click()
   57 |
   58 |   // Wait for the concept mapping configuration dialog
   59 |   await expect(page.getByText('Configure Concept mapping')).toBeVisible()
   60 |
   61 |   // Handle file chooser dialog that opens when clicking the upload area
   62 |   const csvFilePath = path.join(__dirname, 'concept_mappings.csv')
   63 |
   64 |   // Set up file chooser handler before clicking
   65 |   const fileChooserPromise = page.waitForEvent('filechooser')
   66 |   await page.getByText('Click here to choose a file, or drop a file').click()
   67 |   const fileChooser = await fileChooserPromise
   68 |   await fileChooser.setFiles(csvFilePath)
   69 |
   70 |   // Wait for file to be processed
   71 |   await expect(page.getByText('concept_mappings.csv')).toBeVisible()
   72 |
   73 |   // Wait a moment for the column mapping interface to load
   74 |   await page.waitForTimeout(2000)
   75 |
   76 |   // First dropdown - Source code column (keep as Source)
   77 |   await page.locator('[role="button"]').filter({ hasText: 'Source' }).first().click()
   78 |   await page.getByRole('option', { name: 'Source' }).click()
   79 |
   80 |   // Second dropdown - Source name column
   81 |   await page.locator('[role="button"]').filter({ hasText: 'Source' }).nth(1).click()
   82 |   await page.getByRole('option', { name: 'Name', exact: true }).click()
   83 |
   84 |   // Third dropdown - Source frequency column
   85 |   await page.locator('[role="button"]').filter({ hasText: 'Source' }).nth(1).click()
   86 |   await page.getByRole('option', { name: 'Frequency' }).click()
   87 |
   88 |   // Fourth dropdown - Additional info column
   89 |   await page.locator('[role="button"]').filter({ hasText: 'Source' }).nth(1).click()
   90 |   await page.getByRole('option', { name: 'Description' }).click()
   91 |
   92 |   await page.waitForTimeout(1000) // Wait for dropdown to fully open
   93 |
   94 |   // Click import
   95 |   await page.getByRole('button', { name: 'Import' }).click()
   96 |
   97 |   // Wait for import to complete - look for any indication that data has loaded
   98 |   await page.waitForTimeout(3000)
   99 |
  100 |   // Check if there's a table or any data visible
  101 |   await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
  102 |
  103 |   // Verify import was successful by checking for table presence
  104 |   await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  105 |
  106 |   // Verify we have column headers (any headers indicate successful import)
```