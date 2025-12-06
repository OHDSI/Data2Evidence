import { test, expect } from '@playwright/test'

const TEST_NAME = 'Attribute Datatype'
const SHOULD_SKIP = true
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)

test(TEST_NAME, async ({ page }) => {
  await page.goto('/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`- text: Setup`)
  await page
    .locator('div')
    .filter({ hasText: /^MetadataConfigure dataset metadata and tagsConfigure$/ })
    .getByTestId('button')
    .click()
  await expect(page.getByTestId('title')).toMatchAriaSnapshot(`- text: Metadata`)
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`- button "Add Attribute"`)
  await page.getByRole('button', { name: 'Add Attribute' }).click()
  await expect(page.getByRole('dialog')).toMatchAriaSnapshot(`
    - dialog:
      - text: Add Attribute
      - button "close":
        - img
      - separator
      - text: Attribute Id
      - textbox "Attribute Id"
      - text: Attribute Name
      - textbox "Attribute Name"
      - text: Category
      - button "Category DATASET"
      - text: Datatype
      - button "Datatype STRING"
      - button "Cancel"
      - button "Save"
    `)
  await page.getByRole('textbox', { name: 'Attribute Id' }).click()
  await page.getByRole('textbox', { name: 'Attribute Id' }).fill('test_input')
  await page.getByRole('textbox', { name: 'Attribute Name' }).click()
  await page.getByRole('textbox', { name: 'Attribute Name' }).fill('Test Input')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('snackbar')).toMatchAriaSnapshot(`
    - text: Attribute Config added successfully.
    - button
    `)
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`- cell "test_input"`)
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`- cell "Test Input"`)
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`- cell "DATASET"`)
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`- cell "STRING"`)
  await page.getByRole('link', { name: 'Datasets' }).click()
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`
    - heading "Datasets" [level=3]
    - button "Update dataset metadata"
    - button "Add dataset"
    `)
  await page.getByText('Select action').click()
  await page.getByRole('option', { name: 'Update dataset' }).click()
  await expect(page.getByTestId('dialog-title')).toMatchAriaSnapshot(`- text: Update dataset`)
  await expect(page.getByRole('dialog')).toMatchAriaSnapshot(`- text: Metadata`)
  await page.getByLabel('', { exact: true }).click()
  await expect(page.getByRole('listbox')).toMatchAriaSnapshot(`- option "Test Input"`)
  await page.getByRole('option', { name: 'Test Input' }).click()
  await page.getByPlaceholder(' ').click()
  await page.getByPlaceholder(' ').fill('test input')
  await expect(page.getByPlaceholder(' ')).toHaveValue('test input')
  await page.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^MetadataConfigure dataset metadata and tagsConfigure$/ })
    .getByTestId('button')
    .click()
  await expect(page.getByTestId('title')).toMatchAriaSnapshot(`- text: Metadata`)
  await page.getByRole('row', { name: 'test_input Test Input DATASET' }).getByRole('button').first().click()
  await expect(page.getByTestId('dialog-title')).toMatchAriaSnapshot(`- text: Edit Attribute`)
  await page.getByRole('button', { name: 'Datatype STRING' }).click()
  await expect(page.getByRole('listbox')).toMatchAriaSnapshot(`- option "NUMBER"`)
  await page.getByRole('option', { name: 'NUMBER' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('snackbar')).toMatchAriaSnapshot(`
    - text: Attribute Config added successfully.
    - button
    `)
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByText('Select action').click()
  await page.getByRole('option', { name: 'Update dataset' }).click()
  await expect(page.getByTestId('dialog-title')).toMatchAriaSnapshot(`- text: Update dataset`)
  await page.getByPlaceholder(' ').click()
  await page.getByPlaceholder(' ').fill('123')
  await expect(page.getByPlaceholder(' ')).toHaveValue('123')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^MetadataConfigure dataset metadata and tagsConfigure$/ })
    .getByTestId('button')
    .click()
  await page.getByRole('row', { name: 'test_input Test Input DATASET' }).getByRole('button').first().click()
  await expect(page.getByTestId('dialog-title')).toMatchAriaSnapshot(`- text: Edit Attribute`)
  await page.getByRole('button', { name: 'Datatype NUMBER' }).click()
  await page.getByRole('option', { name: 'TIMESTAMP' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('snackbar')).toMatchAriaSnapshot(`
    - text: Attribute Config added successfully.
    - button
    `)
  await page.getByRole('link', { name: 'Datasets' }).click()
  await page.getByText('Select action').click()
  await page.getByRole('option', { name: 'Update dataset' }).click()
  await expect(page.locator('d4l-input')).toMatchAriaSnapshot(`
    - textbox
    - text: Value
    `)
  await page.getByPlaceholder(' ').fill('2023-01-01')
  await expect(page.getByPlaceholder(' ')).toHaveValue('2023-01-01')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^MetadataConfigure dataset metadata and tagsConfigure$/ })
    .getByTestId('button')
    .click()
  await expect(page.getByTestId('title')).toMatchAriaSnapshot(`- text: Metadata`)
  await page.getByRole('row', { name: 'test_input Test Input DATASET' }).getByRole('button').nth(1).click()
  await expect(page.getByTestId('dialog-title')).toMatchAriaSnapshot(`- text: Delete Attribute`)
  await expect(page.getByRole('dialog')).toMatchAriaSnapshot(`
    - text: "Are you sure you want to delete the following Attribute:"
    - strong: "\\"test_input\\""
    - text: "?"
    `)
  await page.getByRole('button', { name: 'Delete' }).click()
})
