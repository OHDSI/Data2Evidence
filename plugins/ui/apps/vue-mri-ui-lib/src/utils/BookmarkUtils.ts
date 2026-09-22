import DateUtils from './DateUtils'
import { BookmarkSchema, AtlasCohortDefinitionSchema, MaterializedCohortSchema } from '@/schema/bookmarksSchema'

export function formatBookmark(bookmark: FormattedBookmark) {
  if (!bookmark) {
    return null
  }

  const bookmarkObj = JSON.parse(bookmark.bookmark)
  if (!bookmarkObj.filter && !bookmarkObj.filter.cards) {
    return null
  }

  const filterCards = bookmarkObj.filter.cards
  const filterCardsContent = filterCards.content

  return {
    id: bookmark.bmkId,
    username: bookmark.user_id,
    name: bookmark.bookmarkname,
    viewName: bookmark.viewname,
    data: bookmark.bookmark,
    version: bookmark.version,
    dateModified: bookmark.modified,
    dateModifiedFormatted: DateUtils.displayBookmarkDateFormat(bookmark.modified),
    timeModified: DateUtils.displayBookmarkTimeFormat(bookmark.modified),
    filterCardData: filterCardsContent,
    chartType: bookmarkObj.chartType,
    axisInfo: bookmarkObj.chartType === 'list' ? bookmarkObj.filter.selected_attributes : bookmarkObj.axisSelection,
    shared: bookmark.shared,
  }
}

export function formatAtlasCohortDefinition(atlasCD: FormattedAtlasCohortDefinition) {
  if (!atlasCD) {
    return null
  }

  return {
    ...atlasCD,
    createdOnFormatted: DateUtils.displayBookmarkDateFormat(atlasCD.createdOn),
    updatedOnFormatted: DateUtils.displayBookmarkDateFormat(atlasCD.updatedOn),
  }
}

export function formatCohortDefinition(cohortDefinition: FormattedMaterializedCohort) {
  return {
    id: cohortDefinition.id,
    patientCount: cohortDefinition.patientCount,
    cohortDefinitionName: cohortDefinition.cohortDefinitionName,
    description: cohortDefinition.description === 'NoValue' ? '' : cohortDefinition.description,
    createdOn: cohortDefinition.createdOn,
    createdOnFormatted: DateUtils.displayBookmarkDateFormat(cohortDefinition.createdOn),
  }
}

/**
 * Determines the type of bookmark based on the properties of the BookmarkDisplay object.
 *
 * @param {BookmarkDisplay} obj - The BookmarkDisplay object to analyze.
 * @returns {'A' | 'D' | 'M' | 'A+M' | 'D+M'} The type of bookmark:
 *   - 'A': Atlas Cohort Definition
 *   - 'D': D2E Cohort Definition
 *   - 'M': Materialized Cohort
 *   - 'A+M': Atlas Cohort Definition + Materialized Cohort
 *   - 'D+M': D2E Cohort Definition + Materialized Cohort
 
 * @example
 * const bookmark = {
 *   cohortDefinition: true,
 *   atlasCohortDefinition: true
 * };
 * const type = getBookmarkType(bookmark); // Returns 'A+M'
 */
export function getBookmarkType(obj: BookmarkDisplay): BookmarkType {
  if (obj.cohortDefinition) {
    if (obj.atlasCohortDefinition) {
      return 'A+M'
    }
    if (obj.bookmark) {
      return 'D+M'
    }
    return 'M'
  }
  if (obj.atlasCohortDefinition) {
    return 'A'
  }
  if (obj.bookmark) {
    return 'D'
  }
}

export const processBookmarksData = (data: ICombinedCohortDefnitionListItem[], paConfigId: string) => {
  const filterBookmarkByConfigId = (bookmark: IBookmark, paConfigId: string) => {
    if (bookmark.paConfigId === paConfigId) {
      return bookmark
    }
  }

  const formatRawAtlasCohortDefinition = (acd: ICohortDefinition) => {
    return {
      id: acd.id,
      name: acd.name,
      createdOn: new Date(acd.createdDate).toISOString(),
      updatedOn: new Date(acd.modifiedDate || acd.createdDate).toISOString(),
      ...(acd.createdBy && { username: acd.createdBy }),
      ...(acd.cohortDefinitionId && { cohortDefinitionId: acd.cohortDefinitionId }),
    }
  }

  const formattedBookmarks = {
    bookmarks: [],
    atlasCohortDefinitions: [],
    materializedCohorts: [],
  }

  data.forEach(item => {
    if (BookmarkSchema.safeParse(item).success) {
      const filtered = filterBookmarkByConfigId(item as IBookmark, paConfigId)
      if (filtered !== undefined) {
        formattedBookmarks.bookmarks.push(filtered)
      }
    }
    if (AtlasCohortDefinitionSchema.safeParse(item).success) {
      formattedBookmarks.atlasCohortDefinitions.push(formatRawAtlasCohortDefinition(item as ICohortDefinition))
    }
    if (MaterializedCohortSchema.safeParse(item).success) {
      formattedBookmarks.materializedCohorts.push(item as IMaterializedCohort)
    }
  })

  return formattedBookmarks
}

/**
 * Information about bookmark ownership that can be used to determine modification rights.
 * Supports both username and user_id fields to handle different bookmark types.
 */
type BookmarkOwnerInfo = {
  username?: string | null
  user_id?: string | null
}

/**
 * Determines if the current user can modify (rename/delete) a bookmark.
 * Only the bookmark owner can modify it.
 *
 * NOTE: Checks both 'username' and 'user_id' fields because:
 * - Bookmark type uses 'username' (set by formatBookmark() from raw 'user_id')
 * - AtlasCohortDefinition type uses 'username' directly
 * - Raw bookmark data may still have 'user_id' in some contexts
 *
 * @param bookmark - The bookmark object containing username or user_id
 * @param currentUsername - The current logged-in user's username
 * @returns true if user can modify, false otherwise
 */
export function canModifyBookmark(bookmark: BookmarkOwnerInfo | null | undefined, currentUsername: string): boolean {
  if (!bookmark || !currentUsername) {
    return false
  }

  // Handle both direct username and nested bookmark.username patterns
  // Check for empty strings as well
  const bookmarkUsername = bookmark.username || bookmark.user_id

  if (!bookmarkUsername || bookmarkUsername === '') {
    return false
  }

  return bookmarkUsername === currentUsername
}

/**
 * A bookmark write that succeeded.
 *
 * bookmark-svc answers the two commands differently: `insert` returns
 * `{ status: 'success', bmkId }` while `update` returns the bare string
 * `'success'` (bookmark.service.ts:199 and the shared `cb` at :475). A write
 * that failed resolves `undefined`, because fireBookmarkQuery reports the
 * error itself and only rethrows for `delete`.
 */
const BOOKMARK_SAVE_SUCCESS = 'success'

interface InsertBookmarkResult {
  status?: string
  bmkId?: string
}

export function isBookmarkSaveSuccess(result: unknown): boolean {
  if (result === BOOKMARK_SAVE_SUCCESS) {
    return true
  }
  return (result as InsertBookmarkResult)?.status === BOOKMARK_SAVE_SUCCESS
}

/**
 * The bookmark record an `insert` produced, built from the save response so the
 * caller does not have to wait for a cohort list refresh to learn the new id.
 *
 * The fields are not guesses: createBookmarkDto (bookmark.service.ts:46) fixes
 * `view_name` to null and `version` to 1 for every insert, and the caller knows
 * the rest because it just sent them. Returns null when the save did not succeed.
 */
export function buildInsertedBookmark({
  result,
  bookmarkname,
  bookmark,
  user_id,
  shared,
  paConfigId,
}: {
  result: unknown
  bookmarkname: string
  bookmark: string
  user_id: string
  shared: boolean
  paConfigId?: string
}): IBookmark | null {
  if (!isBookmarkSaveSuccess(result)) {
    return null
  }

  return {
    bmkId: (result as InsertBookmarkResult).bmkId,
    bookmarkname,
    bookmark,
    viewname: null,
    modified: new Date().toISOString(),
    version: 1,
    user_id,
    shared,
    ...(paConfigId ? { paConfigId } : {}),
  }
}

/**
 * The bookmark record an `update` produced. The identity does not change, so
 * this carries the existing record forward with the payload that was written.
 * _updateBookmark (bookmark.service.ts) bumps the stored version by one.
 */
export function buildUpdatedBookmark(
  activeBookmark: IBookmark,
  { bookmark, shared }: { bookmark: string; shared: boolean }
): IBookmark {
  return {
    ...activeBookmark,
    bookmark,
    shared,
    modified: new Date().toISOString(),
    version: (activeBookmark.version ?? 0) + 1,
  }
}
