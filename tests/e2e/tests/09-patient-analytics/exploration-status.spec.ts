import type { Page } from '@playwright/test'
import { test, expect } from '../fixtures'
import { MINUTE_2 } from '../const'
import {
  type CardButtonAction,
  confirmExplorationDialog,
  deleteExplorationCard,
  explorationAction,
  explorationCard,
  explorationMenuAction
} from '../explorations'

const TEST_NAME = 'exploration-status'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
test.describe.configure({ mode: 'serial' })

const USER = 'admin'
const PASSWORD = 'Updatepassword12345'
const DATASET = 'Demo dataset'

const RUN_ID = Date.now().toString(36)
const NAME = `Status check ${RUN_ID}`
const RENAMED = `Status renamed ${RUN_ID}`
const COPY = `${RENAMED} (Copy)`

const LIST_URL = '/d2e-webapi/cohortdefinition?source=pa'
const STATUS = { ready: 'Ready', stale: 'Stale', notRun: 'Not run yet' }

// Patient counts on Demo dataset, as in bookmark.spec.ts.
const COUNT = { total: '2,694', monthOfBirth: '2,255', monthOfBirthMale: '1,096' }

// The card shows the first materialization date. Test 3 compares with it.
let firstMaterialisedOn = ''

async function openCohorts(page: Page) {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill(USER)
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByText(DATASET).first().click()
  await page.getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.getByTestId('explorations-page')).toBeVisible()
}

async function backToList(page: Page) {
  await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click()
  await expect(page.getByTestId('explorations-grid')).toBeVisible()
}

function statusChip(page: Page, name: string) {
  return explorationCard(page, name).locator('.d2e-status-chip')
}

function cardCount(page: Page, name: string) {
  return explorationCard(page, name).locator('.d2e-exploration-card__count-value')
}

function lastMaterialisedOn(page: Page, name: string) {
  return explorationCard(page, name)
    .locator('.d2e-exploration-card__row')
    .filter({ hasText: 'Last Materialised on' })
    .locator('dd')
}

async function expectPatientCount(page: Page, count: string) {
  await expect(page.getByText(`${count} / ${COUNT.total}`)).toBeVisible()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
}

async function openExploration(page: Page, name: string, count: string) {
  await explorationCard(page, name).click()
  await expectPatientCount(page, count)
}

async function addFirstFilter(page: Page) {
  await page.locator('div[title="Basic Data - Month of Birth"]').click()
  await page.locator('div[title="Basic Data - Month of Birth"]').getByRole('textbox').fill('>2')
  await page.locator('div[title="Basic Data - Month of Birth"]').getByRole('textbox').press('Enter')
  await expectPatientCount(page, COUNT.monthOfBirth)
}

// After a removal, the empty Gender filter shows the search placeholder, not "All".
async function addMaleFilter(page: Page, { afterRemoval = false } = {}) {
  if (afterRemoval) {
    await page.getByText('Enter search term').click()
  } else {
    await page.getByTitle('Basic Data - Gender').getByText('All').click()
  }
  await page.getByPlaceholder('Enter search term').fill('Male')
  await page.getByText('MALE - MALE').click()
  await expectPatientCount(page, COUNT.monthOfBirthMale)
}

async function removeMaleFilter(page: Page) {
  await page.getByTitle('Basic Data - Gender').locator('i').click()
  await expectPatientCount(page, COUNT.monthOfBirth)
}

// Change only the chart: remove the Month of Birth axis.
async function changeChartOnly(page: Page) {
  await page
    .locator('div.axis-menu-button-wrapper')
    .getByRole('button', { name: 'Basic Data Month of Birth ◢' })
    .click()
  await page.locator('div.dropdownmenu-container .menuWrapper:not(.closed)').getByText('Reset Selection').click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
}

// Wait until the toast closes, so that the next save cannot pass on the same toast.
async function saveExploration(page: Page) {
  const toast = page.getByText('Saved filter updated.')
  await page.getByTestId('pa-save-cohort-btn').click()
  await expect(toast).toBeVisible()
  await expect(toast).not.toBeVisible()
}

async function materialize(page: Page, name: string, action: CardButtonAction) {
  await explorationAction(page, name, action)
  const dialog = page.getByTestId('pa-modal-wrapper')
  await expect(dialog).toContainText(name)
  await dialog.getByRole('button', { name: 'Materialize', exact: true }).click()
  await expect(dialog).not.toBeVisible({ timeout: MINUTE_2 })
}

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage()
  await openCohorts(page)
  await expect(page.getByTestId('explorations-grid').or(page.getByTestId('explorations-empty'))).toBeVisible()
  const cards = page
    .locator('.d2e-exploration-card')
    .filter({ hasText: new RegExp(`Status (check|renamed) ${RUN_ID}`) })
  for (let left = await cards.count(); left > 0; left--) {
    await deleteExplorationCard(page, cards.first())
    await expect(cards).toHaveCount(left - 1)
  }
  await page.close()
})

test('new exploration shows Not run yet', async ({ page }) => {
  await openCohorts(page)
  await test.step('Create and save an exploration', async () => {
    await page.getByTestId('explorations-new-btn').click()
    await expectPatientCount(page, COUNT.total)
    await addFirstFilter(page)
    await page.getByTestId('pa-save-cohort-btn').click()
    await page.getByRole('textbox', { name: 'Enter name' }).fill(NAME)
    await page.getByTestId('pa-save-dialog-save-btn').click()
    await expect(page.getByText('Filters saved.')).toBeVisible()
  })
  await test.step('Check the status', async () => {
    await backToList(page)
    await expect(statusChip(page, NAME)).toHaveText(STATUS.notRun)
    await expect(cardCount(page, NAME)).toHaveCount(0)
  })
})

test('materialize shows Ready with the count', async ({ page }) => {
  await openCohorts(page)
  await materialize(page, NAME, 'Materialize cohort')
  await expect(statusChip(page, NAME)).toHaveText(STATUS.ready)
  await expect(cardCount(page, NAME)).toHaveText(COUNT.monthOfBirth)
  await expect(lastMaterialisedOn(page, NAME)).toHaveText(/\d{4}/)
  firstMaterialisedOn = (await lastMaterialisedOn(page, NAME).textContent()) ?? ''
})

test('filter change and save shows Stale', async ({ page }) => {
  await openCohorts(page)
  await test.step('Add a filter and save', async () => {
    await openExploration(page, NAME, COUNT.monthOfBirth)
    await addMaleFilter(page)
    await saveExploration(page)
  })
  await test.step('Check the stale card', async () => {
    await backToList(page)
    await expect(statusChip(page, NAME)).toHaveText(STATUS.stale)
    await expect(cardCount(page, NAME)).toHaveText(COUNT.monthOfBirth)
    await expect(explorationCard(page, NAME).getByRole('button', { name: 'Re-materialize' })).toBeVisible()
    await expect(explorationCard(page, NAME).getByRole('button', { name: 'Materialize cohort' })).toHaveCount(0)
    await expect(lastMaterialisedOn(page, NAME)).toHaveText(firstMaterialisedOn)
  })
})

test('re-materialize shows Ready with the new count', async ({ page }) => {
  await openCohorts(page)
  // Wait for the first list load. Then catch the reload after the materialization.
  await expect(statusChip(page, NAME)).toHaveText(STATUS.stale)
  const listResponse = page.waitForResponse(
    response => response.url().includes(LIST_URL) && response.request().method() === 'GET',
    { timeout: MINUTE_2 }
  )
  await materialize(page, NAME, 'Re-materialize')
  await expect(statusChip(page, NAME)).toHaveText(STATUS.ready)
  await expect(cardCount(page, NAME)).toHaveText(COUNT.monthOfBirthMale)

  await test.step('Check the cohort date in the list response', async () => {
    const items = await (await listResponse).json()
    const bookmark = items.find(item => item.bookmarkname === NAME)
    const cohort = items.find(item => item.id === bookmark?.cohortDefinitionId && 'patientCount' in item)
    expect(bookmark?.materializationStatus).toBe('ready')
    expect(cohort).toBeDefined()
    expect(new Date(cohort.createdOn).toISOString().slice(0, 10)).toBe(new Date().toISOString().slice(0, 10))
  })
})

test('rename keeps Ready, chart-only save shows Stale', async ({ page }) => {
  await openCohorts(page)
  await test.step('Rename', async () => {
    await explorationMenuAction(page, NAME, 'Rename')
    await page.getByRole('textbox', { name: 'Exploration name' }).fill(RENAMED)
    await confirmExplorationDialog(page)
    await expect(statusChip(page, RENAMED)).toHaveText(STATUS.ready)
  })
  await test.step('Change only the chart and save', async () => {
    await openExploration(page, RENAMED, COUNT.monthOfBirthMale)
    await changeChartOnly(page)
    await saveExploration(page)
    await backToList(page)
    await expect(statusChip(page, RENAMED)).toHaveText(STATUS.stale)
  })
  await test.step('Re-materialize', async () => {
    await materialize(page, RENAMED, 'Re-materialize')
    await expect(statusChip(page, RENAMED)).toHaveText(STATUS.ready)
  })
})

test('filter edited and reverted shows Stale', async ({ page }) => {
  await openCohorts(page)
  await openExploration(page, RENAMED, COUNT.monthOfBirthMale)
  await removeMaleFilter(page)
  await saveExploration(page)
  await addMaleFilter(page, { afterRemoval: true })
  await saveExploration(page)
  await backToList(page)
  await expect(statusChip(page, RENAMED)).toHaveText(STATUS.stale)
})

test('duplicate shows Not run yet', async ({ page }) => {
  await openCohorts(page)
  await explorationMenuAction(page, RENAMED, 'Duplicate')
  await expect(statusChip(page, COPY)).toHaveText(STATUS.notRun)
})

test('status filter Stale shows only stale cards', async ({ page }) => {
  await openCohorts(page)
  await expect(explorationCard(page, COPY)).toBeVisible()
  await page.getByTestId('explorations-filters-btn').click()
  await page.getByTestId('explorations-filter-status').click()
  await page.getByRole('option', { name: STATUS.stale, exact: true }).click()
  await page.keyboard.press('Escape')

  await expect(explorationCard(page, COPY)).toHaveCount(0)
  await expect(statusChip(page, RENAMED)).toHaveText(STATUS.stale)
  const otherChips = page.locator('.d2e-exploration-card .d2e-status-chip').filter({ hasNotText: STATUS.stale })
  await expect(otherChips).toHaveCount(0)
})
