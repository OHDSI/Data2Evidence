import { test, expect } from '../fixtures'
import { MINUTE_5 } from '../const'

const TEST_NAME = 'attribute-hybrid-search'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()

  // Embedding concepts in admin portal
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.locator('tr').filter({ hasText: 'Demo dataset' }).getByText('Select action').click()
  await page.getByRole('option', { name: 'Setup semantic search' }).click()
  await page.getByRole('button', { name: 'Setup semantic search' }).click()
  await expect(
    page.getByText('Successfully generated the semantic search creation for dataset: Demo dataset')
  ).toBeVisible()
  await page.getByTestId('dialog-close').click()
  await page.getByRole('link', { name: 'Jobs' }).click()
  await expect(page.locator('a:has-text("Job Runs")')).toBeVisible()
  const search_embed_entry = page
    .locator('.flow-run-list-item')
    .filter({ has: page.locator('a:has-text("search_embedding_plugin")') })
    .first()
  const search_embed_state = search_embed_entry.locator('.state-badge')
  await expect(search_embed_state).toHaveText('Completed', { timeout: MINUTE_5 })

  // Go to hybrid search setting pageEnable hybrid search and save
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Hybrid searchConfigure hybrid search for conceptsConfigure$/ })
    .getByTestId('button')
    .click()
  await page.getByRole('textbox', { name: 'Semantic Ratio' }).click()
  await page.getByRole('textbox', { name: 'Semantic Ratio' }).fill('0.5')
  if (!(await page.getByText('Enable Hybrid Search').isChecked())) {
    await page.getByText('Enable Hybrid Search').click()
  }
  await page.getByTestId('button').click()
  await expect(page.getByTestId('snackbar').locator('div').filter({ hasText: 'Changes saved' }).first()).toBeVisible()
  await page.reload()

  // Assert changes have been made
  await expect(page.getByRole('textbox', { name: 'Semantic Ratio' })).toHaveValue('0.5')
  await expect(page.getByText('Enable Hybrid Search')).toBeChecked()

  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
  await page.getByText('Demo dataset').first().click()
  await page.getByRole('link', { name: 'Concepts' }).click()

  await page.getByRole('textbox', { name: 'search terms' }).click()
  await page.getByRole('textbox', { name: 'search terms' }).fill('MALE')
  await page.getByRole('textbox', { name: 'search terms' }).press('Enter')
  await expect(page.getByRole('cell', { name: '1377.7799' })).toBeVisible()

  // Disable hybrid search and save
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Hybrid searchConfigure hybrid search for conceptsConfigure$/ })
    .getByTestId('button')
    .click()
  await page.getByRole('textbox', { name: 'Semantic Ratio' }).click()
  await page.getByRole('textbox', { name: 'Semantic Ratio' }).fill('0')
  await page.getByText('Enable Hybrid Search').click()
  await page.getByTestId('button').click()
  await expect(page.getByTestId('snackbar').locator('div').filter({ hasText: 'Changes saved' }).first()).toBeVisible()
  await page.reload()

  // Assert changes have been made
  await expect(page.getByRole('textbox', { name: 'Semantic Ratio' })).toHaveValue('0')
  await expect(page.getByText('Enable Hybrid Search')).not.toBeChecked()
})
