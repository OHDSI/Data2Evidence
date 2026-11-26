import { expect, openAtlasDataset, test } from '../fixtures'

const TEST_NAME = 'concept-sets'

test(TEST_NAME, async ({ page }) => {
  const conceptSetName = `E2E concept set ${Date.now()}`
  let conceptSetCreated = false

  await page.goto('/d2e/portal')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAtlasDataset(page)
  await page.getByRole('link', { name: 'Concepts' }).click()
  await expect(page.getByRole('tab', { name: 'Concept Sets' })).toHaveAttribute('aria-selected', 'true')

  try {
    await page.getByRole('button', { name: 'New Concept Set' }).click()

    const editor = page
      .getByRole('navigation')
      .filter({ has: page.getByTestId('cs-editor-primary-btn') })
    await editor.getByRole('textbox', { name: 'Name' }).fill(conceptSetName)
    await expect(editor.getByRole('tab', { name: 'Search' })).toHaveAttribute('aria-selected', 'true')

    const search = editor.getByRole('textbox', { name: 'Search' })
    await search.fill('Streptococcal sore throat')
    await search.press('Enter')

    await editor
      .getByRole('checkbox', { name: 'Select Streptococcal sore throat' })
      .check()
    await editor.getByTestId('add-selected').click()
    await expect(editor.getByRole('tab', { name: /Selected.*1/ })).toBeVisible()

    await editor.getByTestId('cs-editor-primary-btn').click()
    await expect(editor).not.toBeVisible()
    conceptSetCreated = true

    const conceptSetRow = page.getByRole('row').filter({
      has: page.getByRole('cell', { name: conceptSetName, exact: true })
    })
    await expect(conceptSetRow).toBeVisible()
  } finally {
    if (conceptSetCreated) {
      const conceptSetSearch = page.getByRole('textbox', { name: 'Search concept sets…' })
      await conceptSetSearch.fill(conceptSetName)

      const conceptSetRow = page.getByRole('row').filter({
        has: page.getByRole('cell', { name: conceptSetName, exact: true })
      })
      await conceptSetRow.getByRole('button', { name: 'Delete' }).click()

      const deleteDialog = page.getByRole('dialog', { name: 'Delete' })
      await expect(deleteDialog).toContainText(`Are you sure you want to delete "${conceptSetName}"?`)
      await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(conceptSetRow).not.toBeVisible()
    }
  }
})
