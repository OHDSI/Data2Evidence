import { test, expect } from '../../fixtures'
import type { Page } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

let exportedFilePaths: string[] = []
let createdDataflowNames: string[] = []

const RUN_TIMEOUT = 300000
const NODES_TEST_NODE_NAMES = [
  'python_node_0',
  'py2table_node_0',
  'sql_node_0',
  'db_writer_node_0',
  'r_node_0',
  'db_reader_node_0',
  'file_node_0',
  'csv_node_0'
]

type DataflowTemplate = {
  id?: string
  name?: string
  description?: string
  nodes: Array<{ id: string; type: string; data: { name: string; [key: string]: unknown }; [key: string]: unknown }>
  edges: Array<{ source: string; target: string; [key: string]: unknown }>
  variables?: unknown[]
  importLibs?: unknown[]
  databases?: unknown[]
  schemas?: unknown[]
}

test.afterEach(async ({ page }) => {
  try {
    await page.goto('/d2e/portal/etl')

    const flowSelector = page.getByRole('combobox').filter({ hasText: /.+/ }).first()
    if (await flowSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await flowSelector.click()
      const testFlowOptions = await page
        .getByRole('option')
        .filter({ hasText: /^NodesTest(Source|Imported)_/ })
        .allTextContents()
      await page.keyboard.press('Escape')

      createdDataflowNames = Array.from(new Set([...createdDataflowNames, ...testFlowOptions.map((name) => name.trim()).filter(Boolean)])).reverse()
    }
  } catch {
    // Continue with the names recorded by the test if the flow list cannot be inspected.
  }

  for (const createdDataflowName of createdDataflowNames) {
    try {
      await page.goto('/d2e/portal')
      const etlLink = page.getByRole('link', { name: 'ETL' })
      if (await etlLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await etlLink.click()
      } else {
        await page.goto('/d2e/portal/etl')
      }

      const flowSelector = page.getByRole('combobox').filter({ hasText: /.+/ }).first()
      await flowSelector.click()
      await page.getByRole('option', { name: createdDataflowName }).click()
      await expect(page.getByRole('combobox', { name: createdDataflowName })).toBeVisible()
      await page.getByLabel('Delete flow').getByRole('button').click({ timeout: 3000 })
      await page.getByRole('textbox').fill(createdDataflowName)
      await page.getByRole('button', { name: 'Delete' }).click()
    } catch {
      // best-effort cleanup - flow may have already been deleted by the test
    }
  }
  createdDataflowNames = []

  for (const exportedFilePath of exportedFilePaths) {
    await fs
      .access(exportedFilePath)
      .then(() => fs.rm(exportedFilePath))
      .catch(() => undefined)
  }
  exportedFilePaths = []
})

test('import and run nodes test template', async ({ page }) => {
  test.setTimeout(600000)

  const timestamp = Date.now()
  const sourceFlowName = `NodesTestSource_${timestamp}`
  const importedFlowName = `NodesTestImported_${timestamp}`
  const exportedFlowPath = path.join(__dirname, `nodestest-exported-${timestamp}.json`)
  exportedFilePaths.push(exportedFlowPath)
  createdDataflowNames.push(importedFlowName, sourceFlowName)

  await test.step('Sign in and open the ETL workflow page', async () => {
    await page.goto('/d2e/portal')
    await page.locator('input[name="identifier"]').fill('admin')
    await page.locator('input[name="password"]').fill('Updatepassword12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.getByTestId('button').nth(1).click()
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click()

    const etlLink = page.getByRole('link', { name: 'ETL' })
    if (await etlLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await etlLink.click()
    } else {
      await page.goto('/d2e/portal/etl')
    }

    await expect(page.getByLabel('Create new dataflow').or(page.getByRole('button', { name: 'Create your first dataflow' }))).toBeVisible({
      timeout: 30000
    })
  })

  await test.step('Create and save a workflow from the Nodes Test template', async () => {
    const firstFlowBtn = page.getByRole('button', { name: 'Create your first dataflow' })
    if (await firstFlowBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstFlowBtn.click()
    } else {
      await page.getByLabel('Create new dataflow').getByRole('button').click()
    }

    const dialog = page.getByRole('dialog').filter({ hasText: 'New dataflow' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('textbox', { name: 'Name' }).fill(sourceFlowName)
    await dialog.getByRole('textbox', { name: 'Comment' }).fill('Nodes test template source flow')
    await dialog.getByRole('combobox').click()
    await page.getByRole('option', { name: /Nodes Test|nodestest|testsnode/i }).click()
    await dialog.getByRole('button', { name: 'Create' }).click()
    await expect(dialog).not.toBeVisible()

    await expect(expectNode(page, 'db_writer_node_0')).toBeVisible()
    await expect(expectNode(page, 'db_reader_node_0')).toBeVisible()

    await page.getByRole('button', { name: 'Save' }).click()
    const saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
    await expect(saveDialog).toBeVisible()
    await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill('Source nodes test flow')
    await saveDialog.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(saveDialog).not.toBeVisible()
    await expect(page.getByText('Up to Date')).toBeVisible()
  })

  await test.step('Export the template-based workflow to JSON', async () => {
    const downloadPromise = page.waitForEvent('download')
    await page.getByLabel('Export flow').getByRole('button').click()
    const download = await downloadPromise
    await download.saveAs(exportedFlowPath)

    const exported = JSON.parse(await fs.readFile(exportedFlowPath, 'utf-8')) as DataflowTemplate
    expect(exported.nodes.map((node) => node.data.name).sort()).toEqual([...NODES_TEST_NODE_NAMES].sort())
  })

  await test.step('Create a second empty workflow, import the exported JSON, and remove the db_reader node', async () => {
    await page.getByLabel('Create new dataflow').getByRole('button').click()
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Name' }).fill(importedFlowName)
    await page.getByRole('textbox', { name: 'Comment' }).fill('Imported nodes test template flow')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('button', { name: 'Create' })).not.toBeVisible()

    const nodeTypeDialog = page.getByRole('dialog').filter({ hasText: 'Select node type' })
    if (await nodeTypeDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.keyboard.press('Escape')
      await expect(nodeTypeDialog).not.toBeVisible()
    }

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByLabel('Import flow').getByRole('button').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(exportedFlowPath)

    await expect(expectNode(page, 'db_writer_node_0')).toBeVisible()
    await expect(expectNode(page, 'db_reader_node_0')).toBeVisible()

    await expectNode(page, 'db_reader_node_0').click()
    await page.keyboard.press('Backspace')
    if (await expectNode(page, 'db_reader_node_0').isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.keyboard.press('Delete')
    }
    await expect(expectNode(page, 'db_reader_node_0')).not.toBeVisible()
  })

  await test.step('Save and run the imported workflow without db_reader first', async () => {
    await page.getByRole('button', { name: 'Save' }).click()
    const saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
    await expect(saveDialog).toBeVisible()
    await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill('Imported nodes test flow without db_reader')
    await saveDialog.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(saveDialog).not.toBeVisible()
    await expect(page.getByText('Up to Date')).toBeVisible()

    await page.getByLabel('Run flow').getByRole('button').click()
    await expect(expectNode(page, 'db_writer_node_0').getByRole('button', { name: 'View output' })).toBeVisible({ timeout: RUN_TIMEOUT })
  })

  await test.step('Add db_reader back from the exported JSON, save, and rerun', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByLabel('Import flow').getByRole('button').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(exportedFlowPath)

    await expect(expectNode(page, 'db_reader_node_0')).toBeVisible()

    await page.getByRole('button', { name: 'Save' }).click()
    const saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
    await expect(saveDialog).toBeVisible()
    await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill('Added db_reader back after db_writer completed')
    await saveDialog.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(saveDialog).not.toBeVisible()
    await expect(page.getByText('Up to Date')).toBeVisible()

    await page.getByLabel('Run flow').getByRole('button').click()
    await expect(expectNode(page, 'db_reader_node_0').getByRole('button', { name: 'View output' })).toBeVisible({ timeout: RUN_TIMEOUT })
  })

  await test.step('Verify the db_reader output from the imported workflow', async () => {
    const readerNode = expectNode(page, 'db_reader_node_0')
    await readerNode.getByRole('button', { name: 'View output' }).click()
    const editor = page.getByRole('textbox', { name: 'Editor content;Press Alt+F1' })
    await expect.poll(() => editor.inputValue(), { timeout: 30000 }).toContain('person_id')
    const readerOutput = await editor.inputValue()
    expect(readerOutput).toContain('"error": false')
    expect(readerOutput).toContain('"nodeName": "db_reader_node_0"')
    expect(readerOutput).toContain('"length":')
    expect(readerOutput).toContain('"person_id":')
    expect(readerOutput).toContain('"cohort_id":')
    await page.getByRole('button', { name: 'close' }).click()
  })
})

function expectNode(page: Page, nodeName: string) {
  return page.locator('.node').filter({ has: page.locator('.node__title', { hasText: nodeName }) })
}
