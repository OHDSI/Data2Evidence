import { test, expect } from '../../fixtures'
import type { Page } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

const TEST_NAME = 'e2e-export-import-nodestest'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

let exportedFilePaths: string[] = []
let createdDataflowNames: string[] = []

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

      createdDataflowNames = Array.from(
        new Set([...createdDataflowNames, ...testFlowOptions.map(name => name.trim()).filter(Boolean)])
      ).reverse()
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

test('create and import a Nodes Test dataflow through Add Dataflow', async ({ page }) => {
  test.setTimeout(300000)

  const timestamp = Date.now()
  const sourceFlowName = `NodesTestSource_${timestamp}`
  const importedFlowName = `NodesTestImported_${timestamp}`
  const exportedFlowPath = path.join(__dirname, `nodestest-exported-${timestamp}.json`)
  exportedFilePaths.push(exportedFlowPath)
  createdDataflowNames.push(importedFlowName, sourceFlowName)

  const openAddDataflow = async () => {
    const firstFlowButton = page.getByRole('button', { name: 'Create your first dataflow' })
    if (await firstFlowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstFlowButton.click()
    } else {
      await page.getByRole('button', { name: 'Add Dataflow' }).click()
    }

    const dialog = page.getByRole('dialog').filter({ hasText: 'Add Dataflow' })
    await expect(dialog).toBeVisible()
    return dialog
  }

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

    await expect(
      page.getByRole('button', { name: 'Add Dataflow' }).or(page.getByRole('button', { name: 'Create your first dataflow' }))
    ).toBeVisible({ timeout: 30000 })
  })

  await test.step('Create a workflow from the Nodes Test template using Add Dataflow', async () => {
    const dialog = await openAddDataflow()
    await dialog.getByRole('textbox', { name: 'Name' }).fill(sourceFlowName)
    await dialog.getByRole('textbox', { name: 'Comment' }).fill('Nodes test template source flow')
    await dialog.getByLabel('Create a new dataflow').check()
    await dialog.getByRole('combobox').click()
    await page.getByRole('option', { name: /Nodes Test|nodestest|testsnode/i }).click()
    await dialog.getByRole('button', { name: 'Create' }).click()
    await expect(dialog).not.toBeVisible()

    await expect(expectNode(page, 'db_writer_node_0')).toBeVisible()
    await expect(expectNode(page, 'db_reader_node_0')).toBeVisible()
  })

  await test.step('Export the template-based workflow to JSON', async () => {
    const downloadPromise = page.waitForEvent('download')
    await page.getByLabel('Export flow').getByRole('button').click()
    const download = await downloadPromise
    await download.saveAs(exportedFlowPath)

    const exported = JSON.parse(await fs.readFile(exportedFlowPath, 'utf-8')) as DataflowTemplate
    expect(exported.nodes.map(node => node.data.name).sort()).toEqual([...NODES_TEST_NODE_NAMES].sort())
  })

  await test.step('Import the exported JSON as a new persisted dataflow using Add Dataflow', async () => {
    const dialog = await openAddDataflow()
    await dialog.getByRole('textbox', { name: 'Name' }).fill(importedFlowName)
    await dialog.getByRole('textbox', { name: 'Comment' }).fill('Imported nodes test template flow')
    await dialog.getByLabel('Import a dataflow').check()

    await dialog.locator('input[type="file"]').setInputFiles(exportedFlowPath)

    await expect(dialog.getByText(path.basename(exportedFlowPath))).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Import' })).toBeEnabled()
    await dialog.getByRole('button', { name: 'Import' }).click()
    await expect(dialog).not.toBeVisible()

    await expect(expectNode(page, 'db_writer_node_0')).toBeVisible()
    await expect(expectNode(page, 'db_reader_node_0')).toBeVisible()
    await expect(page.getByRole('combobox').filter({ hasText: importedFlowName })).toBeVisible()
  })
})

function expectNode(page: Page, nodeName: string) {
  return page.locator('.node').filter({ has: page.locator('.node__title', { hasText: nodeName }) })
}
