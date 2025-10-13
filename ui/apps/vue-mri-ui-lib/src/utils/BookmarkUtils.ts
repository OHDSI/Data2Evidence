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
