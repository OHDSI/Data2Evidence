import { Locator, Page } from 'playwright/test'
import { test, expect } from '../fixtures'
import { deleteExploration, explorationBookmarkCard } from '../explorations'

const TEST_NAME = 'multi-parent-interactions'
const SHOULD_SKIP = false
test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
test.describe.configure({ retries: 2 })

const RUN_ID = Date.now().toString(36)
const BOOKMARK_NAME = `Multi parent ${RUN_ID}`
const CHILD_CARD = 'Procedure Occurrence A'
const VISIT_CARD = 'Visit A'
const VISIT_PARENT = 'Visit parent'
const EPISODE_PARENT = 'Episode parent'
const SCREENSHOT_DIR = 'test-results/multi-parent-interactions'

async function openDatasetCohorts(page: Page) {
  const cohortsLink = page.getByRole('link', { name: 'Cohorts' })
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.getByText('Demo dataset').first().click()
    try {
      await cohortsLink.waitFor({ state: 'visible', timeout: 10_000 })
      await cohortsLink.click()
      return
    } catch {
      await page
        .getByRole('link', { name: 'Dataset' })
        .click()
        .catch(() => {})
    }
  }
  throw new Error('Cohorts link did not appear for selected dataset within ~60s')
}

async function patientCount(page: Page): Promise<string> {
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  const count = page.getByText(/^[\d,]+ \/ 2,694$/).first()
  await expect(count).toBeVisible()
  return ((await count.textContent()) || '').trim()
}

async function addCard(page: Page, name: string) {
  await page.getByTitle('Add Filter Card').getByRole('button').click()
  await page.getByRole('menuitem', { name, exact: true }).click()
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
}

async function toggleCardMenuItem(page: Page, cardName: string, item: string) {
  await page
    .getByRole('tab', { name: ` ${cardName} ` })
    .locator('button')
    .last()
    .click()
  await page.getByRole('menuitem', { name: new RegExp(`^(✓ )?${item}$`) }).click()
}

function parentField(page: Page, label: string): Locator {
  return page.getByTitle(`${CHILD_CARD} - ${label}`, { exact: true })
}

test(TEST_NAME, async ({ page }) => {
  test.slow()

  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await openDatasetCohorts(page)
  await page.getByTestId('explorations-new-btn').click()
  await patientCount(page)

  let noLinkCount = ''
  await test.step('Add a Visit and a Procedure Occurrence card', async () => {
    await addCard(page, 'Visit')
    await addCard(page, 'Procedure Occurrence')
    noLinkCount = await patientCount(page)
  })

  await test.step('The card menu has one item for each parent', async () => {
    await page
      .getByRole('tab', { name: ` ${CHILD_CARD} ` })
      .locator('button')
      .last()
      .click()
    await expect(page.getByRole('menuitem', { name: VISIT_PARENT, exact: true })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: EPISODE_PARENT, exact: true })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Episode/Visit parent', exact: true })).toHaveCount(0)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-parent-menu-items.png` })
    await page.keyboard.press('Escape')
  })

  let visitCount = ''
  await test.step('Link the card to the Visit card', async () => {
    await toggleCardMenuItem(page, CHILD_CARD, VISIT_PARENT)
    await expect(parentField(page, VISIT_PARENT)).toBeVisible()
    await parentField(page, VISIT_PARENT).locator('.multiselect').click()
    await parentField(page, VISIT_PARENT).locator('.multiselect__option', { hasText: VISIT_CARD }).click()
    await expect(parentField(page, VISIT_PARENT)).toContainText(VISIT_CARD)
    await expect.poll(() => patientCount(page)).not.toBe(noLinkCount)
    visitCount = await patientCount(page)
  })

  await test.step('The Episode field lists only Episode cards', async () => {
    await toggleCardMenuItem(page, CHILD_CARD, EPISODE_PARENT)
    await expect(parentField(page, EPISODE_PARENT)).toBeVisible()
    await expect(parentField(page, VISIT_PARENT)).toContainText(VISIT_CARD)
    await parentField(page, EPISODE_PARENT).locator('.multiselect').click()
    await expect(parentField(page, EPISODE_PARENT).locator('.multiselect__option', { hasText: 'None' })).toBeVisible()
    await expect(
      parentField(page, EPISODE_PARENT).locator('.multiselect__option', { hasText: VISIT_CARD })
    ).toHaveCount(0)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-two-parent-fields.png` })
    await page.keyboard.press('Escape')
    await expect.poll(() => patientCount(page)).toBe(visitCount)
  })

  await test.step('Unchecking one parent removes only its field', async () => {
    await toggleCardMenuItem(page, CHILD_CARD, EPISODE_PARENT)
    await expect(parentField(page, EPISODE_PARENT)).toHaveCount(0)
    await expect(parentField(page, VISIT_PARENT)).toContainText(VISIT_CARD)
    await expect.poll(() => patientCount(page)).toBe(visitCount)
  })

  await test.step('Save the cohort and open it again', async () => {
    await page.getByTestId('pa-save-cohort-btn').click()
    await page.getByRole('textbox', { name: 'Enter name' }).fill(BOOKMARK_NAME)
    await page.getByTestId('pa-save-dialog-save-btn').click()
    await expect(page.getByText('Filters saved.')).toBeVisible()

    await page.locator('#pane-left').getByRole('link', { name: 'Data exploration' }).click()
    await expect(explorationBookmarkCard(page, BOOKMARK_NAME)).toBeVisible()
    await explorationBookmarkCard(page, BOOKMARK_NAME).click()
    await expect(parentField(page, VISIT_PARENT)).toContainText(VISIT_CARD)
    await expect(parentField(page, EPISODE_PARENT)).toHaveCount(0)
    await expect.poll(() => patientCount(page)).toBe(visitCount)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-reopened-bookmark.png` })
  })

  await test.step('Clean up', async () => {
    await page.locator('#pane-left').getByRole('link', { name: 'Data exploration' }).click()
    await deleteExploration(page, BOOKMARK_NAME)
    await expect(explorationBookmarkCard(page, BOOKMARK_NAME)).not.toBeVisible()
  })
})
