import { test, expect } from '../../fixtures'
import fs from 'fs/promises'
import path from 'path'

let exportedFilePath = ''
let createdDataflowNames: string[] = []

test.afterEach(async ({ page }) => {
  for (const name of createdDataflowNames) {
    try {
      // Select the flow first — delete always acts on the currently open one
      await page.getByRole('combobox').first().click({ timeout: 3000 })
      await page.getByRole('option', { name, exact: true }).click({ timeout: 3000 })
      await page.getByLabel('Delete flow').getByRole('button').click({ timeout: 3000 })
      await page.getByRole('dialog').getByRole('textbox').fill(name)
      await page.getByRole('button', { name: 'Delete' }).click()
      await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible({ timeout: 5000 })
    } catch {
      // best-effort cleanup — flow may have already been deleted by the test
    }
  }
  createdDataflowNames = []

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
  const importedDataflowName = `ImportedFlow_${timestamp}`
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
    const newFlowBtn = page.getByLabel('Create new dataflow').getByRole('button')
    // Wait for one of the two entry points to render before choosing — isVisible()
    // does not retry, so branching too early picks the wrong one.
    await expect(firstFlowBtn.or(newFlowBtn)).toBeVisible()
    if (await firstFlowBtn.isVisible().catch(() => false)) {
      await firstFlowBtn.click()
    } else {
      await newFlowBtn.click()
    }
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Name' }).fill(dataflowName)
    await page.getByRole('textbox', { name: 'Comment' }).fill('Test export import flow')
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('button', { name: 'Create' })).not.toBeVisible()
    createdDataflowNames.push(dataflowName)
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

  await test.step('Import the flow into a new dataflow', async () => {
    // Importing lives in the Add-dataflow dialog and must create a NEW dataflow,
    // leaving the currently open flow untouched.
    await page.getByLabel('Create new dataflow').getByRole('button').click()
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await page.getByRole('radio', { name: 'Import a dataflow' }).check()

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(exportedFilePath)

    // The dialog confirms the accepted file before it can be created
    await expect(page.getByText(path.basename(exportedFilePath))).toBeVisible()

    await page.getByRole('textbox', { name: 'Name' }).fill(importedDataflowName)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('button', { name: 'Create' })).not.toBeVisible()
    createdDataflowNames.push(importedDataflowName)
  })

  await test.step('Verify the imported flow opened as a new dataflow', async () => {
    // The newly created dataflow is now the open one ...
    await expect(page.getByRole('combobox', { name: importedDataflowName })).toBeVisible()
    // ... pre-populated with the imported node
    await expect(nodeTitle).toBeVisible()

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

  await test.step('Verify the originally open dataflow was not overwritten', async () => {
    // Importing must not touch the flow that was open at the time — it still
    // exists as its own dataflow with its own content.
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: dataflowName, exact: true }).click()

    await expect(page.getByRole('combobox', { name: dataflowName })).toBeVisible()
    await expect(nodeTitle).toBeVisible()
  })
})
