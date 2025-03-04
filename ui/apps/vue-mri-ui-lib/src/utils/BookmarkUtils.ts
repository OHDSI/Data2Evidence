import DateUtils from './DateUtils'

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
    dateModified: DateUtils.displayBookmarkDateFormat(bookmark.modified),
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
    createdOn: DateUtils.displayBookmarkDateFormat(atlasCD.createdOn),
    updatedOn: DateUtils.displayBookmarkDateFormat(atlasCD.updatedOn),
  }
}

export function formatCohortDefinition(cohortDefinition: FormattedMaterializedCohort) {
  return {
    id: cohortDefinition.id,
    patientCount: cohortDefinition.patientCount,
    cohortDefinitionName: cohortDefinition.cohortDefinitionName,
    createdOn: DateUtils.displayBookmarkDateFormat(cohortDefinition.createdOn),
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
