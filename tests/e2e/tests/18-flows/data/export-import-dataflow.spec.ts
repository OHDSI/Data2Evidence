import { test, expect } from '../../fixtures'
import fs from 'fs/promises'
import path from 'path'

let exportedFilePath = ''
let createdDataflowName = ''

test.afterEach(async ({ page }) => {
  if (createdDataflowName) {
    try {
      await page.getByLabel('Delete flow').getByRole('button').click({ timeout: 3000 })
      await page.getByRole('textbox').fill(createdDataflowName)
      await page.getByRole('button', { name: 'Delete' }).click()
    } catch {
      // best-effort cleanup — flow may have already been deleted by the test
    }
    createdDataflowName = ''
  }

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
    await page.getByRole('link', { name: 'ETL' }).click()

    // Handle both scenarios: no flows (Create your first dataflow) or existing flows (Create new dataflow)
    const firstFlowBtn = page.getByRole('button', { name: 'Create your first dataflow' })
    if (await firstFlowBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstFlowBtn.click()
    } else {
      await page.getByLabel('Create new dataflow').getByRole('button').click()
    }
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
    await page.getByRole('textbox', { name: 'Comment' }).fill('Test export import flow')
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('button', { name: 'Create' })).not.toBeVisible()
    createdDataflowName = dataflowName
  })

  await test.step('Export the flow', async () => {
    // This timeout is necessary as clicking the python button too quickly seems to have an issue which causes the node not to be added. Remove this wait to see if the issue persists.
    await page.waitForTimeout(1500)
    await page.getByText('Run python code').click()
    await expect(nodeTitle).toBeVisible()

    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).click()
    const saveDialog = page.getByRole('dialog')
    await expect(saveDialog.getByRole('button', { name: 'Save' })).toBeEnabled()
    await saveDialog.getByRole('button', { name: 'Save' }).click()

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
    // Hover to reveal edit button, then click it
    await nodeTitle.hover()
    const editBtn = page.locator('.node__setting')
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // Verify data integrity: imported code matches exactly what was exported
    const exported = JSON.parse(await fs.readFile(exportedFilePath, 'utf-8'))
    const exportedScript = exported.nodes[0].data.python_code
    console.log('Exported script:', exportedScript)

    const editor = page.getByRole('textbox', { name: 'Editor content;Press Alt+F1' })
    await editor.focus()
    const importedCode = await editor.inputValue()
    expect(importedCode).toBe(exportedScript)

    await page.getByRole('button', { name: 'Close' }).click()
  })
})
