import { test, expect } from '../../fixtures'
import type { Locator, Page } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

let exportedFilePaths: string[] = []
let createdDataflowNames: string[] = []

const NODES_TEST_TEMPLATE_PATH = path.resolve(__dirname, '../../../../../../templates/flows/nodestest.json')
const RUN_TIMEOUT = 300000

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
  for (const createdDataflowName of [...createdDataflowNames].reverse()) {
    try {
      await page.goto('/d2e/portal')
      await page.getByRole('link', { name: 'ETL' }).click()
      await selectDataflow(page, createdDataflowName)
      await page.getByLabel('Delete flow').getByRole('button').click({ timeout: 3000 })
      await page.getByRole('textbox').fill(createdDataflowName)
      await page.getByRole('button', { name: 'Delete' }).click()
    } catch {
      // best-effort cleanup — flow may have already been deleted by the test
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

test('export-import-dataflow', async ({ page }) => {
  const timestamp = Date.now()
  const dataflowName = `ExportImportFlow_${timestamp}`
  let exportedFilePath = ''
  const nodeTitle = page.locator('.node__title').filter({ hasText: 'python_node_0' })

  await test.step('Authenticate and navigate to Admin portal', async () => {
    await authenticateAsAdmin(page)
  })

  await test.step('Create a new dataflow with a python node', async () => {
    await page.getByRole('link', { name: 'ETL' }).click()

    await createEmptyDataflow(page, dataflowName, 'Test export import flow')
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
    exportedFilePaths.push(exportedFilePath)
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

test('import and run nodes test template', async ({ page }) => {
  test.setTimeout(600000)

  const timestamp = Date.now()
  const sourceFlowName = `NodesTestSource_${timestamp}`
  const importedWriterFlowName = `NodesTestWriter_${timestamp}`
  const readerFlowName = `NodesTestReader_${timestamp}`
  const writerTemplatePath = path.join(__dirname, `nodestest-writer-${timestamp}.json`)
  const readerTemplatePath = path.join(__dirname, `nodestest-reader-${timestamp}.json`)
  const exportedWriterPath = path.join(__dirname, `nodestest-exported-writer-${timestamp}.json`)
  exportedFilePaths.push(writerTemplatePath, readerTemplatePath, exportedWriterPath)

  await test.step('Prepare writer and reader templates from nodestest.json', async () => {
    const nodesTest = JSON.parse(await fs.readFile(NODES_TEST_TEMPLATE_PATH, 'utf-8')) as DataflowTemplate
    const writerFlow = sliceTemplate(nodesTest, ['r_node_0', 'python_node_0', 'py2table_node_0', 'sql_node_0', 'db_writer_node_0'])
    const readerFlow = sliceTemplate(nodesTest, ['db_reader_node_0'])

    await fs.writeFile(writerTemplatePath, JSON.stringify(writerFlow, null, 2))
    await fs.writeFile(readerTemplatePath, JSON.stringify(readerFlow, null, 2))
  })

  await test.step('Authenticate and ensure data transformation workflow is available', async () => {
    await authenticateAsAdmin(page)
    await openEtlWorkflow(page)
  })

  await test.step('Create a new workflow from the nodes test writer template and export it', async () => {
    await page.getByRole('link', { name: 'ETL' }).click()
    await createEmptyDataflow(page, sourceFlowName, 'Nodes test writer source flow', { closeNodeTypeDialog: true })
    createdDataflowNames.push(sourceFlowName)
    await importFlow(page, writerTemplatePath)
    await expect(expectNode(page, 'db_writer_node_0')).toBeVisible()
    await saveCurrentDataflow(page, 'Imported nodes test writer template')
    await exportCurrentDataflow(page, exportedWriterPath)
  })

  await test.step('Create another empty workflow, import the exported writer, and run it', async () => {
    await createEmptyDataflow(page, importedWriterFlowName, 'Imported nodes test writer flow', { closeNodeTypeDialog: true })
    createdDataflowNames.push(importedWriterFlowName)
    await importFlow(page, exportedWriterPath)
    await expect(expectNode(page, 'db_writer_node_0')).toBeVisible()
    await saveCurrentDataflow(page, 'Imported exported writer flow')
    await runFlowAndWaitForOutput(page, 'db_writer_node_0')
  })

  await test.step('Create a reader workflow and verify it reads the table written by dbwrite', async () => {
    await createEmptyDataflow(page, readerFlowName, 'Nodes test reader flow', { closeNodeTypeDialog: true })
    createdDataflowNames.push(readerFlowName)
    await importFlow(page, readerTemplatePath)
    await expect(expectNode(page, 'db_reader_node_0')).toBeVisible()
    await saveCurrentDataflow(page, 'Imported nodes test reader template')
    await runFlowAndWaitForOutput(page, 'db_reader_node_0')

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

function sliceTemplate(template: DataflowTemplate, nodeNames: string[]): DataflowTemplate {
  const selectedNodes = template.nodes.filter((node) => nodeNames.includes(node.data.name))
  const selectedIds = new Set(selectedNodes.map((node) => node.id))

  return {
    ...template,
    name: `${template.name} ${nodeNames[nodeNames.length - 1]}`,
    nodes: selectedNodes,
    edges: template.edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target)),
    variables: template.variables ?? [],
    importLibs: template.importLibs ?? [],
    databases: template.databases ?? [],
    schemas: template.schemas ?? []
  }
}

async function authenticateAsAdmin(page: Page) {
  await page.goto('/d2e/portal')

  const portalSwitcher = page.getByTestId('button').nth(1)

  await waitForAuthLanding(page)

  const usernameInput = await firstVisibleLocator([
    page.getByLabel('Username'),
    page.getByPlaceholder('Username'),
    page.locator('input[name="identifier"]')
  ])
  const passwordInput = await firstVisibleLocator([
    page.getByLabel('Password'),
    page.getByPlaceholder('Password'),
    page.locator('input[type="password"]'),
    page.locator('input[name="password"]')
  ])

  if (usernameInput && passwordInput) {
    await usernameInput.fill('admin')
    await passwordInput.fill('Updatepassword12345')
    await expect(usernameInput).toHaveValue('admin')
    await expect(passwordInput).toHaveValue('Updatepassword12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((url) => !url.href.includes('/sign-in') && !url.href.includes('/login-callback'), { timeout: 30000 })
  }

  if (await portalSwitcher.isVisible({ timeout: 10000 }).catch(() => false)) {
    await portalSwitcher.click()
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  } else if (!(await page.getByRole('link', { name: 'Setup' }).isVisible({ timeout: 3000 }).catch(() => false))) {
    await page.goto('/d2e/portal/systemadmin')
  }
}

async function waitForAuthLanding(page: Page) {
  const deadline = Date.now() + 30000
  const usernameInput = page.locator('input[name="identifier"], input[placeholder="Username"], input[aria-label="Username"]')
  const portalSwitcher = page.getByTestId('button').nth(1)
  const setupLink = page.getByRole('link', { name: 'Setup' })

  while (Date.now() < deadline) {
    if (await usernameInput.isVisible({ timeout: 500 }).catch(() => false)) return
    if (await portalSwitcher.isVisible({ timeout: 500 }).catch(() => false)) return
    if (await setupLink.isVisible({ timeout: 500 }).catch(() => false)) return
    await page.waitForTimeout(500)
  }

  await expect(usernameInput.or(portalSwitcher).or(setupLink)).toBeVisible({ timeout: 1000 })
}

async function firstVisibleLocator(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible({ timeout: 500 }).catch(() => false)) {
      return locator
    }
  }
}

async function openEtlWorkflow(page: Page) {
  const etlLink = page.getByRole('link', { name: 'ETL' })
  if (await etlLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await etlLink.click()
  } else {
    await page.goto('/d2e/portal/etl')
  }

  await expect(page.getByLabel('Create new dataflow').or(page.getByRole('button', { name: 'Create your first dataflow' }))).toBeVisible({ timeout: 30000 })
}

async function createEmptyDataflow(page: Page, name: string, comment: string, options: { closeNodeTypeDialog?: boolean } = {}) {
  const firstFlowBtn = page.getByRole('button', { name: 'Create your first dataflow' })
  if (await firstFlowBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstFlowBtn.click()
  } else {
    await page.getByLabel('Create new dataflow').getByRole('button').click()
  }

  await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Name' }).fill(name)
  await page.getByRole('textbox', { name: 'Comment' }).fill(comment)
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Create' })).not.toBeVisible()
  if (options.closeNodeTypeDialog) {
    await closeSelectNodeTypeDialog(page)
  }
}

async function closeSelectNodeTypeDialog(page: Page) {
  const nodeTypeDialog = page.getByRole('dialog').filter({ hasText: 'Select node type' })
  if (await nodeTypeDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.keyboard.press('Escape')
    await expect(nodeTypeDialog).not.toBeVisible()
  }
}

async function importFlow(page: Page, filePath: string) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByLabel('Import flow').getByRole('button').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(filePath)
}

async function saveCurrentDataflow(page: Page, comment: string) {
  await page.getByRole('button', { name: 'Save' }).click()
  const saveDialog = page.getByRole('dialog').filter({ hasText: 'Save dataflow' })
  await expect(saveDialog).toBeVisible()
  await saveDialog.getByRole('textbox', { name: 'Describe your changes' }).fill(comment)
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).not.toBeVisible()
  await expect(page.getByText('Up to Date')).toBeVisible()
}

async function exportCurrentDataflow(page: Page, destination: string) {
  const downloadPromise = page.waitForEvent('download')
  await page.getByLabel('Export flow').getByRole('button').click()
  const download = await downloadPromise
  await download.saveAs(destination)
}

async function runFlowAndWaitForOutput(page: Page, nodeName: string) {
  await page.getByLabel('Run flow').getByRole('button').click()
  const node = expectNode(page, nodeName)
  await expect(node.getByRole('button', { name: 'View output' })).toBeVisible({ timeout: RUN_TIMEOUT })
}

function expectNode(page: Page, nodeName: string) {
  return page.locator('.node').filter({ has: page.locator('.node__title', { hasText: nodeName }) })
}

async function selectDataflow(page: Page, dataflowName: string) {
  const flowSelector = page.getByRole('combobox').filter({ hasText: /.+/ }).first()
  await flowSelector.click()
  await page.getByRole('option', { name: dataflowName }).click()
  await expect(page.getByRole('combobox', { name: dataflowName })).toBeVisible()
}
