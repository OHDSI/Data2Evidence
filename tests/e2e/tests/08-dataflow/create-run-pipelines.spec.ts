import { test, expect } from '@playwright/test';

const TEST_NAME = 'create-run-pipelines'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)


test(TEST_NAME, async ({ page }) => {
  const getNodeByLabel = (nodeLabel: string) =>
    page
      .locator('[data-testid^="rf__node-"]')
      .filter({ hasText: nodeLabel })
      .first();

  const getNodeTestIdByLabel = async (nodeLabel: string) => {
    const node = getNodeByLabel(nodeLabel);
    await expect(node).toBeVisible();
    const nodeTestId = await node.getAttribute('data-testid');
    if (!nodeTestId) {
      throw new Error(`Could not resolve data-testid for node '${nodeLabel}'`);
    }
    return nodeTestId;
  };

  const connectNodesByLabel = async (sourceLabel: string, targetLabel: string) => {
    const sourceNode = getNodeByLabel(sourceLabel);
    const targetNode = getNodeByLabel(targetLabel);

    await expect(sourceNode).toBeVisible();
    await expect(targetNode).toBeVisible();

    await sourceNode.scrollIntoViewIfNeeded();
    await targetNode.scrollIntoViewIfNeeded();

    const sourceNodeTestId = await getNodeTestIdByLabel(sourceLabel);
    const targetNodeTestId = await getNodeTestIdByLabel(targetLabel);
    const sourceNodeId = sourceNodeTestId.replace('rf__node-', '');
    const targetNodeId = targetNodeTestId.replace('rf__node-', '');

    const sourceHandle = page
      .locator(`.react-flow__handle[data-nodeid="${sourceNodeId}"][data-handlepos="right"]`)
      .first();
    const targetHandle = page
      .locator(`.react-flow__handle[data-nodeid="${targetNodeId}"][data-handlepos="left"]`)
      .first();

    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();

    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error(`Could not resolve node handles for ${sourceLabel} -> ${targetLabel}`);
    }

    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 });
    await page.mouse.up();
  };

  const moveNodeByLabel = async (nodeLabel: string, deltaX: number, deltaY: number) => {
    const node = getNodeByLabel(nodeLabel);
    await expect(node).toBeVisible();

    const dragHandle = node.locator('.node__drag').first();
    const dragBox = (await dragHandle.boundingBox()) ?? (await node.boundingBox());

    if (!dragBox) {
      throw new Error(`Could not resolve draggable area for node '${nodeLabel}'`);
    }

    const startX = dragBox.x + dragBox.width / 2;
    const startY = dragBox.y + dragBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 20 });
    await page.mouse.up();
  };

  const fillMonacoEditor = async (content: string) => {
    const monacoInput = page.locator('.monaco-editor textarea.inputarea').first();
    await monacoInput.scrollIntoViewIfNeeded();
    await monacoInput.click({ force: true });
    await monacoInput.evaluate((element) => (element as HTMLTextAreaElement).focus());
    await page.keyboard.press('Meta+A');
    await page.keyboard.insertText(content);
  };

  await page.goto('https://localhost:41100/sign-in');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();

  // Create dataflow
  await page.getByRole('link', { name: 'ETL' }).click();
  const createFirstDataflow = page.getByText('Create your first dataflow').first();
  const hasCreateFirstDataflow = await createFirstDataflow
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (hasCreateFirstDataflow) {
    await createFirstDataflow.click();
  } else {
    await page.getByLabel('Create new dataflow').getByRole('button').click();
  }
  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('TestDE');
  await page.getByRole('textbox', { name: 'Comment' }).click();
  await page.getByRole('textbox', { name: 'Comment' }).fill('DE Testing');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByText('PythonStableRun python code.').click();
  // await expect(page.getByRole('combobox', { name: 'TestDE' })).toBeVisible();
  // await page.getByRole('combobox', { name: 'TestDE' }).click();
  // await expect(page.getByRole('option', { name: 'TestDE' })).toBeVisible();
  // await page.getByRole('option', { name: 'TestDE' }).click();

  // Edit python node
  const pythonNodeTestId = await getNodeTestIdByLabel('python_node_0');
  const pythonNode = page.getByTestId(pythonNodeTestId);
  await pythonNode.click();
  await pythonNode.click();
  await expect(pythonNode).toBeVisible();
  await expect(pythonNode).toMatchAriaSnapshot(`
    - img
    - text: python_node_0
    - img
    - text: Describe the task of node python_node_0
    `);
  await page.getByText('python_node_0').first().hover();
  await page.getByText('python_node_0').first().locator('..').locator('svg').nth(1).click();
  await page.locator('d4l-input').filter({ hasText: 'Name' }).getByPlaceholder(' ').click();
  await page.locator('d4l-input').filter({ hasText: 'Name' }).getByPlaceholder(' ').fill('test_python_node');
  await page.locator('d4l-input').filter({ hasText: 'Description' }).getByPlaceholder(' ').click();
  await page.locator('d4l-input').filter({ hasText: 'Description' }).getByPlaceholder(' ').fill('testing');
  await page.getByText('def exec(myinput): return "').click();
  await fillMonacoEditor('def exec(myinput):\n df = myinput.get("db_reader_node_0").result\ndf["source_description"] = df["source_description"].astype(str) + "."\nreturn df');

  // Ensure python node is edited
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('test_python_node')).toBeVisible();

  await page.getByText('test_python_node').first().click();
  await page.getByText('test_python_node').first().click();
  await expect(page.locator('[id="single-spa-application\\:system-admin-plugin--flow-lifecycles-js"]')).toMatchAriaSnapshot(`- button "Add node"`);
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByText('Output SQL query as table.').click();

  // Get db reader node reference
  const dbReaderNode = getNodeByLabel('db_reader_node_0');
  await expect(dbReaderNode).toBeVisible();

  await expect(page.locator('[id="single-spa-application\\:system-admin-plugin--flow-lifecycles-js"]')).toMatchAriaSnapshot(`- button "Add node"`);
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByText('Transform python object to').click();
  const py2tableNodeTestId = await getNodeTestIdByLabel('py2table_node_0');
  const py2tableNode = page.getByTestId(py2tableNodeTestId);
  await py2tableNode.click();
  await expect(py2tableNode).toMatchAriaSnapshot(`- text: Describe the task of node py2table_node_0`);

  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByText('Database writerStableWrite').click();
  const dbWriterNodeTestId = await getNodeTestIdByLabel('db_writer_node_0');
  const dbWriterNode = page.getByTestId(dbWriterNodeTestId);
  await expect(dbWriterNode).toMatchAriaSnapshot(`- text: Describe the task of node db_writer_node_0`);

  await moveNodeByLabel('db_reader_node_0', -360, 20);
  await moveNodeByLabel('test_python_node', -180, 20);
  await moveNodeByLabel('py2table_node_0', 0, 20);
  await moveNodeByLabel('db_writer_node_0', 250, 20);

  await connectNodesByLabel('db_reader_node_0', 'test_python_node');
  await connectNodesByLabel('test_python_node', 'py2table_node_0');
  await connectNodesByLabel('py2table_node_0', 'db_writer_node_0');

  // Edit nodes after they are moved and connected
  // Edit db_reader_node
  await dbReaderNode.hover();
  await dbReaderNode.locator('.node__setting').first().click();
  const dbReaderDropdown = page.getByRole('combobox').first();
  await dbReaderDropdown.click();
  await page.getByRole('option', { name: 'demo_database - postgres', exact: true }).click();
  await fillMonacoEditor('select * from "demo_cdm"."cdm_source"');
  await page.getByRole('button', { name: 'Apply' }).click();

  // Edit py2table_node
  await py2tableNode.hover();
  await py2tableNode.locator('.node__setting').first().click();
  const py2tableSourceCombobox = page.locator('[data-testid="select"]').first();
  await py2tableSourceCombobox.click();
  await page.getByRole('option', { name: 'test_python_node' }).click();
  await page.getByRole('textbox', { name: 'JSON Path' }).fill('$');
  await page.getByRole('button', { name: 'Apply' }).click();

  // Edit db_writer_node
  await dbWriterNode.hover();
  await dbWriterNode.locator('.node__setting').first().click();
  const dbWriterDataframeCombobox = page.getByTestId('select').first();
  await dbWriterDataframeCombobox.click();
  await page.getByRole('option', { name: 'py2table_node_0' }).click();
  const dbWriterDatabaseCombobox = page
    .locator('.MuiFormControl-root')
    .filter({ has: page.getByText('Database', { exact: true }) })
    .getByRole('combobox')
    .first();
  await dbWriterDatabaseCombobox.click();
  await page.getByRole('option', { name: 'demo_database - postgres', exact: true }).click();
  await page.locator('d4l-input').filter({ hasText: 'Database table name' }).getByPlaceholder(' ').fill('cdm_source');
  await page.locator('d4l-input').filter({ hasText: 'Schema name' }).getByPlaceholder(' ').fill('demo_cdm');
  await page.getByRole('button', { name: 'Apply' }).click();

  // Save dataflow
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Test_DE');
  await page.getByRole('textbox', { name: 'Describe your changes' }).click();
  await page.getByRole('textbox', { name: 'Describe your changes' }).fill('Test_DE for testing');
  await page.getByRole('button', { name: 'Save' }).click();

  // Run flow
  await page.locator('button.run-flow-button').click();
  const runningPanel = page.locator('div[aria-label="Running"]');
  const runningButton = runningPanel.locator('button.run-flow-button.run-flow-button--running');
  await expect(runningButton).toBeVisible();
  await expect(runningButton).toBeDisabled();
  await expect(runningPanel).toBeHidden({ timeout: 20000 });
});