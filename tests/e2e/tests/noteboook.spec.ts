import { test, expect } from '@playwright/test';

test('Notebook', async ({ page }) => {
  await page.goto('https://localhost:41100/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Demo datasetDemo datasetTotal').click();
  await page.getByRole('link', { name: 'Notebooks' }).click();
  await page.getByRole('button', { name: 'New Notebook' }).click();

  //Look for new notebook with title "Untitled"
  // await expect(page.getByText('Untitled')).toBeVisible();

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Changes saved')).toBeVisible();

  //Rename notebook
  await page.getByTestId('snackbar-close').locator('svg').click();
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
  await page.getByRole('textbox', { name: 'Notebook Title' }).click();
  await page.getByRole('textbox', { name: 'Notebook Title' }).fill('Untitled-Test');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Changes saved')).toBeVisible();
  await page.getByTestId('snackbar-close').locator('svg').click();
  
  //Export notebook
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Notebook' }).click()
  ]);

  // Import notebook - Cannot interact with macOS to close the file dialog

  // await page.getByRole('button', { name: 'Import Notebook' }).click();
  // const fileInput = await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 2000 });
  // await fileInput.setInputFiles(require('path').join(__dirname, 'Untitled-Test1.ipynb'));
  // // Close the file selector if a close button exists
  // const closeFileDialog = await page.$('button[aria-label="Cancel"]');
  // if (closeFileDialog) {
  //   await closeFileDialog.click();
  // }

  //Share notebook
  await page.getByText('Share notebook').click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Changes saved')).toBeVisible();
  await page.getByTestId('snackbar-close').locator('svg').click();

  //Delete notebook
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('File Deleted')).toBeVisible();
  await page.getByTestId('snackbar-close').locator('svg').click();
});

