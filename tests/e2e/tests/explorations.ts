import type { Locator, Page } from '@playwright/test'

/**
 * Helpers for the Data Exploration page (the Cohorts screen).
 *
 * The redesign replaced the old Bookmarks list, where each card carried a row
 * of five unlabelled icons and tests reached them positionally:
 *
 *   .footer > div:nth-child(2) > svg   // rename
 *   .footer > div:nth-child(5) > svg   // delete
 *
 * That markup is gone. It was also fragile in its own right: the position
 * encoded which action you got, so inserting an icon silently repointed every
 * test at the wrong one, and nothing failed loudly when it did.
 *
 * On the new card, Rename, Duplicate and Delete live behind a "More actions"
 * menu, and Materialize, Filter summary and Analyze are labelled buttons. These
 * helpers name the action instead of counting siblings.
 */

/** The card's accessible action names, as rendered by ExplorationsPage. */
export type CardMenuAction = 'Rename' | 'Duplicate' | 'Delete'
export type CardButtonAction = 'Materialize cohort' | 'Filter summary' | 'Analyze'

/**
 * One exploration card, found by the name shown on it.
 *
 * Anchored on the card's own class because the card has no test id of its own;
 * adding one would mean changing application code from a test-only change.
 * Tests create uniquely named cohorts, so `hasText` resolves to one card.
 */
export function explorationCard(page: Page, name: string): Locator {
  return page.locator('.d2e-exploration-card').filter({ hasText: name })
}

/** Tick a card's checkbox. Selecting two or more enables bulk Compare. */
export async function selectExploration(page: Page, name: string): Promise<void> {
  await page.getByRole('checkbox', { name: `Select exploration ${name}` }).check()
}

/** Click one of the card's labelled action buttons. */
export async function explorationAction(
  page: Page,
  name: string,
  action: CardButtonAction
): Promise<void> {
  await explorationCard(page, name).getByRole('button', { name: action }).click()
}

/**
 * Open a card's More menu and choose an item.
 *
 * The menu items are `role="menuitem"`, so they cannot collide with a
 * same-named `role="button"` in a dialog underneath - which matters for Delete
 * and Rename, where the confirmation button carries the same word.
 */
export async function explorationMenuAction(
  page: Page,
  name: string,
  action: CardMenuAction
): Promise<void> {
  await cardMenuAction(page, explorationCard(page, name), action)
}

/** As `explorationMenuAction`, but on a card you have already narrowed down. */
export async function cardMenuAction(page: Page, card: Locator, action: CardMenuAction): Promise<void> {
  await card.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

/** Confirm whichever exploration dialog is open (delete, rename, ...). */
export async function confirmExplorationDialog(page: Page): Promise<void> {
  await page.getByTestId('pa-save-dialog-save-btn').click()
}

/** Delete an exploration by name, including the confirmation step. */
export async function deleteExploration(page: Page, name: string): Promise<void> {
  await deleteExplorationCard(page, explorationCard(page, name))
}

/**
 * Delete one specific card, including the confirmation step.
 *
 * Use this over `deleteExploration` when a name is carried by more than one
 * card - an exploration and the Atlas cohort definition made from it share one.
 */
export async function deleteExplorationCard(page: Page, card: Locator): Promise<void> {
  await cardMenuAction(page, card, 'Delete')
  await confirmExplorationDialog(page)
}

/**
 * The Atlas cohort definition card for `name`.
 *
 * Creating an ATLAS cohort definition from an exploration leaves two cards on
 * the Cohorts screen under the same name: the D2E exploration bookmark it was
 * built from, and the Atlas cohort definition itself. `explorationCard` matches
 * both, so anything that needs one specifically has to say which.
 *
 * The old Bookmarks card carried a literal "Atlas Cohort Definition" type
 * label and tests asserted the concatenated `<name>Atlas Cohort DefinitionID`.
 * The redesigned card has no type label; the two kinds are told apart by their
 * id row, which reads "Cohort ID" for an Atlas record and "Exploration ID" for
 * a D2E bookmark (ExplorationsPage.vue picks the label from getBookmarkType).
 */
export function atlasCohortCard(page: Page, name: string): Locator {
  return explorationCard(page, name).filter({ hasText: 'Cohort ID' })
}

/** The D2E exploration bookmark card for `name`, as opposed to an Atlas one. */
export function explorationBookmarkCard(page: Page, name: string): Locator {
  return explorationCard(page, name).filter({ hasText: 'Exploration ID' })
}
