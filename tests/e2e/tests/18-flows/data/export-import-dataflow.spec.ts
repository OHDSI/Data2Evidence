import { test, expect } from '../../fixtures'
import fs from 'fs/promises'
import path from 'path'

let exportedFilePath = ''

test.afterEach(async () => {
  if (exportedFilePath) {
    await fs
      .access(exportedFilePath)
      .then(() => fs.rm(exportedFilePath))
      .catch(() => undefined)
    exportedFilePath = ''
  }
})

test('export-import-dataflow', async ({ page }) => {
  const timestamp = Date.now()
  const dataflowName = `ExportImportFlow_${timestamp}`
  const nodeTitle = page.locator('.node__title').filter({ hasText: 'python_node_0' })

  await test.step('Authenticate and navigate to Admin portal', async () => {
    await page.goto('/d2e/portal')
    await page.locator('input[name="identifier"]').fill('admin')
    await page.locator('input[name="password"]').fill('Updatepassword12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.getByTestId('button').nth(1).click()
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  })

  await test.step('Create a new dataflow with a python node', async () => {
    // Go to ETL and create new flow
    await page.getByRole('link', { name: 'ETL' }).click()

    // Handle both scenarios: no flows (Create your first dataflow) or existing flows (Create new dataflow)
    try {
      // First try to find "Create your first dataflow" button (when no flows exist)
      await page.waitForSelector('button:has-text("Create your first dataflow")', { timeout: 3000 })
      await page.getByRole('button', { name: 'Create your first dataflow' }).click()
    } catch {
      // If that fails, look for "Create new dataflow" button (when flows already exist)
      await page.getByLabel('Create new dataflow').getByRole('button').click({ timeout: 3000 })
    }
    await page.waitForTimeout(500) // Wait for the create dialog to appear

    await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
    await page.getByRole('textbox', { name: 'Comment' }).fill('Test export import flow')
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('button', { name: 'Create' })).not.toBeVisible()
  })

  await test.step('Export the flow', async () => {
    // This timeout is necessary as clicking the python button too quickly seems to have an issue which causes the node not to be added. Remove this wait to see if the issue persists.
    await page.waitForTimeout(1500)
    await page.getByText('Run python code').click()
    await expect(nodeTitle).toBeVisible()

    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()

    // Export the flow
    const downloadPromise = page.waitForEvent('download')
    await page.getByLabel('Export flow').getByRole('button').click()
    const download = await downloadPromise
    exportedFilePath = path.join(__dirname, `exported-flow-${timestamp}.json`)
    await download.saveAs(exportedFilePath)
  })

  await test.step('Import the flow and verify', async () => {
    // Import the exported flow
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByLabel('Import flow').getByRole('button').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(exportedFilePath)

    // Verify the imported node is present on the canvas
    await expect(nodeTitle).toBeVisible()

    // Close dialog
    const visibleDialogs = page.locator('[role="dialog"]:visible')
    const activeDialog = visibleDialogs.last()
    const closeButton = activeDialog.getByRole('button', { name: /cancel/i }).first()
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0, { timeout: 5000 })
    await nodeTitle.click({ force: true })
    await page.waitForTimeout(500)

    // Hover to reveal edit button, then click it
    await nodeTitle.hover()
    await page.waitForTimeout(300)
    await page.locator('.node__header > div:nth-child(3)').click()

    await page.locator('.view-lines > div:nth-child(4)').click()
    await page.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).press('ControlOrMeta+a')
    await page
      .getByRole('textbox', { name: 'Editor content;Press Alt+F1' })
      .fill(
        'def exec(myinput):\n  return "This is test python node exec function"\ndef test_exec(myinput):\n  return "This is test_exec function"'
      )

    await page.getByRole('button', { name: 'Apply' }).click()
    // Run the imported flow
    await page.getByLabel('Run flow').getByRole('button').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()

    // Open node output and verify result
    // Find the RF node container that wraps the python_node_0 title and click its output button
    const rfNodeContainer = page.locator('[data-testid^="rf__node"]').filter({ has: nodeTitle })
    await expect(rfNodeContainer.getByTestId('button')).toBeVisible({ timeout: 60000 })
    await rfNodeContainer.getByTestId('button').click()
    await expect(page.getByText('"length": 38')).toBeVisible()
    await page.getByRole('button', { name: 'close' }).click()
  })

  await test.step('Clean up - delete the imported flow', async () => {
    // Open flow settings
    await page.getByLabel('Delete flow').getByRole('button').click({ timeout: 3000 })
    await page.getByRole('textbox').fill(dataflowName)
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('combobox', { name: dataflowName })).not.toBeVisible()
  })
})
