import { Locator, Page } from 'playwright/test'
import { test, expect as baseExpect, openAdminPortalFromAtlas } from '../fixtures'

const expect = baseExpect.configure({ timeout: 60000 })

test.use({ actionTimeout: 60000 })

const TEST_NAME = 'CDM parent interaction mappings'
const SOURCE_CONFIG = 'OMOP_DM'
const TEST_CONFIG = 'TestParentMappings2431'
const INTERACTION = 'Procedure Occurrence'
const SCREENSHOT_DIR = 'test-results/cdm-parent-mappings'

async function openConfigList(page: Page) {
  await page.reload()
  await expect(page.getByText('Clinical Data Model')).toBeVisible()
  const breadcrumbBackBtn = page
    .getByRole('navigation', { name: 'breadcrumb' })
    .getByRole('button', { name: /CDM configuration/i })
  const anyConfig = page.locator('ul > li').filter({ hasText: SOURCE_CONFIG })
  await breadcrumbBackBtn.or(anyConfig).first().waitFor({ state: 'visible' })
  if (await breadcrumbBackBtn.isVisible()) {
    await breadcrumbBackBtn.click()
  }
}

function configRow(page: Page, name: string): Locator {
  return page.locator('ul > li').filter({ hasText: name }).first()
}

async function deleteConfigIfExists(page: Page, name: string) {
  await openConfigList(page)
  const row = configRow(page, name)
  if (!(await row.isVisible().catch(() => false))) {
    return
  }
  await row.getByText('Delete').first().click()
  await page.getByLabel('Are you sure you want to').getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(row).not.toBeVisible()
}

function mappingRow(page: Page, label: string): Locator {
  return page
    .locator('li')
    .filter({ hasText: label })
    .filter({ has: page.getByRole('button', { name: 'Duplicate' }) })
}

function editorHeading(page: Page): Locator {
  return page.getByRole('heading', { name: `Clinical Data Model: ${TEST_CONFIG}` })
}

async function openInteraction(page: Page) {
  const interaction = page.getByText(INTERACTION, { exact: true }).first()
  if (!(await interaction.isVisible().catch(() => false))) {
    await page.getByRole('link', { name: /Defined Interactions/ }).click()
  }
  await interaction.click()
}

function parentDetails(page: Page): Locator {
  return page
    .locator('.sapUiVlt')
    .filter({ has: page.locator('input[id$="--parentLabelInput-inner"]') })
    .filter({ hasText: 'Parent Details' })
    .last()
}

test(TEST_NAME, async ({ page }) => {
  test.setTimeout(300 * 1000)

  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openAdminPortalFromAtlas(page)
  await page.getByRole('link', { name: 'Setup' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^CDM configurationConfigure CDMConfigure$/ })
    .getByTestId('button')
    .click()

  await test.step('Duplicate the seeded config', async () => {
    await deleteConfigIfExists(page, TEST_CONFIG)
    await configRow(page, SOURCE_CONFIG).getByText('Duplicate').first().click()
    await page.getByRole('textbox', { name: /Title/ }).fill(TEST_CONFIG)
    await page.getByRole('dialog').getByRole('button', { name: 'Duplicate', exact: true }).click()
    await expect(editorHeading(page)).toBeVisible()
  })

  await test.step('Old fields are gone and the two mappings show', async () => {
    await openInteraction(page)
    await expect(page.getByText('Parent Interaction Mappings (2)')).toBeVisible()
    await expect(mappingRow(page, 'Episode parent')).toBeVisible()
    await expect(mappingRow(page, 'Visit parent')).toBeVisible()
    await expect(page.getByText('Parent Interaction:')).toHaveCount(0)
    await expect(page.getByText('Filter Control Label for Parent-Child Relationship')).toHaveCount(0)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-two-mappings.png` })
  })

  await test.step('Select a mapping and see its details', async () => {
    await mappingRow(page, 'Visit parent').getByText('Visit parent').click()
    const details = parentDetails(page)
    await expect(details.getByText('Parent Details')).toBeVisible()
    await expect(details.locator('input').first()).toHaveValue('Visit parent')
  })

  await test.step('Add a parent', async () => {
    await page.getByRole('button', { name: 'Add Parent' }).click()
    await expect(page.getByText('Parent Interaction Mappings (3)')).toBeVisible()
    const details = parentDetails(page)
    await expect(details.locator('input').first()).toHaveValue('New Parent - 3')
    await details.locator('input').first().fill('Third parent')
    await details.locator('input').first().press('Enter')
    await details.locator('.sapMSlt').click()
    const options = page.getByRole('option')
    await expect(options.filter({ hasText: /^Episode$/ })).toHaveCount(0)
    await expect(options.filter({ hasText: /^Visit$/ })).toHaveCount(0)
    await expect(options.filter({ hasText: /^Procedure Occurrence$/ })).toHaveCount(0)
    await options.first().click()
    await details.locator('input').nth(1).fill('@VISIT')
    await details.locator('input').nth(1).press('Enter')
    await expect(mappingRow(page, 'Third parent')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-third-mapping.png` })
  })

  await test.step('Errors show for a duplicate without a parent and for a blank label', async () => {
    await mappingRow(page, 'Visit parent').getByRole('button', { name: 'Duplicate' }).click()
    await expect(page.getByText('Parent Interaction Mappings (4)')).toBeVisible()
    const details = parentDetails(page)
    await details.locator('input').first().fill('Visit parent copy')
    await details.locator('input').first().press('Enter')
    await expect(details.getByText('Select a parent interaction.')).toBeVisible()
    await mappingRow(page, 'Visit parent copy').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('Parent Interaction Mappings (3)')).toBeVisible()

    await mappingRow(page, 'Third parent').getByText('Third parent').click()
    await details.locator('input').first().fill('')
    await details.locator('input').first().press('Enter')
    await expect(details.getByText('Enter a label.')).toBeVisible()
    await details.locator('input').first().fill('Third parent')
    await details.locator('input').first().press('Enter')
    await expect(details.getByText('Enter a label.')).toHaveCount(0)
  })

  await test.step('Save, reload, and see the three mappings', async () => {
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('button', { name: 'OK' }).click()
    await openConfigList(page)
    await configRow(page, TEST_CONFIG).click({ position: { x: 100, y: 20 } })
    await expect(page.getByText(`${TEST_CONFIG} - Version`)).toBeVisible()
    await page.getByText('Inactive', { exact: true }).dblclick()
    await expect(editorHeading(page)).toBeVisible()
    await openInteraction(page)
    await expect(page.getByText('Parent Interaction Mappings (3)')).toBeVisible()
    await expect(mappingRow(page, 'Third parent')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-after-reload.png` })
  })

  await test.step('Clean up', async () => {
    await deleteConfigIfExists(page, TEST_CONFIG)
  })
})
