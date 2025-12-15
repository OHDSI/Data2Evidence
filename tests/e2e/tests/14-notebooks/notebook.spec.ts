import { test, expect } from '@playwright/test'

const TEST_NAME = 'Notebook'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText('Demo datasetDemo datasetTotal').click()
  await page.getByRole('link', { name: 'Notebooks' }).click()

  //Create notebook
  await page.getByRole('button', { name: 'Add New Notebook' }).click({ timeout: 2000 })
  await page.getByRole('textbox', { name: 'Name' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Notebook')
  await page.getByRole('button', { name: 'Create' }).click({ timeout: 2000 })
  await expect(page.getByText('Created notebook "Test Notebook"')).toBeVisible()
  await page.getByTestId('snackbar-close').locator('svg').click()
  await page.reload()
  await page.getByRole('link', { name: 'Notebooks' }).click()
  //Rename notebook
  await page.locator('.notebook-header__content_title button').click()
  await page.getByRole('textbox', { name: 'Notebook Title' }).click()
  await page.getByRole('textbox', { name: 'Notebook Title' }).fill('Test Notebook 2')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible()
  await page.getByTestId('snackbar-close').locator('svg').click()

  //Export notebook
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Notebook' }).click()
  ])

  // Import notebook - Cannot interact with macOS to close the file dialog
  await page.getByRole('button', { name: 'Import Notebook' }).click()
  const fileInput = await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 2000 })
  await fileInput.setInputFiles(require('path').join(__dirname, 'Test_Notebook.ipynb'))
  // Close the file selector if a close button exists
  const closeFileDialog = await page.$('button[aria-label="Cancel"]')
  if (closeFileDialog) {
    await closeFileDialog.click()
  }
  await page.keyboard.press('Escape')

  //Share notebook
  await page.getByText('Share notebook').click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible()
  await page.getByTestId('snackbar-close').locator('svg').click()

  //Delete notebook
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('File Deleted')).toBeVisible()
  await page.getByTestId('snackbar-close').locator('svg').click()

  //Delete notebook
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('File Deleted')).toBeVisible()
  await page.getByTestId('snackbar-close').locator('svg').click()
})
