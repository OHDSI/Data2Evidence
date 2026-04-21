import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
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

  await page.goto('https://localhost:41100/sign-in');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByTestId('button').nth(1).click();
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
  await page.getByRole('link', { name: 'ETL' }).click();
  await page.getByLabel('Create new dataflow').getByRole('button').click();
  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('TestDE');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByText('PythonStableRun python code.').click();
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
  await pythonNode.click();
  await pythonNode.click();
  await expect(page.locator('[id="single-spa-application\\:system-admin-plugin--flow-lifecycles-js"]')).toMatchAriaSnapshot(`- button "Add node"`);
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByText('Output SQL query as table.').click();
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
  await moveNodeByLabel('python_node_0', -120, -120);
  await moveNodeByLabel('py2table_node_0', 180, -20);
  await moveNodeByLabel('db_writer_node_0', 520, 40);

  await connectNodesByLabel('db_reader_node_0', 'python_node_0');
  await connectNodesByLabel('python_node_0', 'py2table_node_0');
  await connectNodesByLabel('py2table_node_0', 'db_writer_node_0');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
});