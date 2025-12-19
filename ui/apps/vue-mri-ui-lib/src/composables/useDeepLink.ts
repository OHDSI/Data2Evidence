import { ref } from 'vue'
import CohortUrlCodec from '../utils/CohortUrlCodec'

/**
 * Bookmark data structure
 */
interface BookmarkData {
  filter: any
  axisSelection?: any[]
  chartType?: string
}

/**
 * Composable for handling deep link URLs to load cohort definitions
 *
 * Reads linkType and query parameters from URL and loads cohort definition
 * into the editor using the existing bookmark flow.
 *
 * @param dispatch - Vuex dispatch function
 * @returns Object with processDeepLink function
 */
export function useDeepLink(dispatch: any) {
  const processed = ref(false)

  /**
   * Process deep link from URL query parameters
   *
   * Checks for linkType=cohort-definition and query parameter,
   * decompresses the query, and loads the cohort definition.
   *
   * Only processes once to prevent re-triggering on navigation.
   */
  const processDeepLink = async () => {
    // Only process once
    if (processed.value) {
      return
    }

    // Read URL parameters
    const params = new URLSearchParams(window.location.search)
    const linkType = params.get('linkType')
    const query = params.get('query')

    // Check if this is a cohort definition deep link
    if (linkType !== 'cohort-definition') {
      return
    }

    // Check if query parameter exists and is not empty
    if (!query || query.trim() === '') {
      return
    }

    // Mark as processed to prevent re-processing
    processed.value = true

    try {
      // Decompress the query parameter
      const result = CohortUrlCodec.safeDecompress<BookmarkData>(query)

      if (!result.success) {
        const errorResult = result as { success: false; error: string }
        console.error('[DeepLink] Decompression failed:', errorResult.error)
        dispatch('setAlertMessage', {
          message: `Failed to load cohort definition: ${errorResult.error}`,
        })
        return
      }

      const successResult = result as { success: true; data: BookmarkData }
      const bookmark: BookmarkData = successResult.data

      console.debug('[DeepLink] Decompressed bookmark:', bookmark)

      // Validate bookmark structure
      if (!bookmark.filter) {
        console.error('[DeepLink] Invalid structure: missing "filter" property. Received:', Object.keys(bookmark))
        dispatch('setAlertMessage', {
          message: 'Failed to load cohort definition: Invalid format. Expected bookmark format with "filter" property.',
        })
        return
      }

      // Load concept sets first so filter cards can display names instead of IDs
      try {
        console.debug('[DeepLink] Loading concept sets...')
        await dispatch('loadValuesForAttributePath', {
          attributePathUid: 'conceptSets',
          searchQuery: '',
          attributeType: 'conceptSet',
        })
      } catch (err) {
        console.warn('[DeepLink] Failed to preload concept sets:', err)
        // Continue anyway - not critical for loading the cohort
      }

      // Use the existing bookmark loading action
      console.debug('[DeepLink] Calling loadBookmarkDataToState...')
      await dispatch('loadBookmarkDataToState', {
        bookmark,
        chartType: bookmark.chartType,
      })
      console.debug('[DeepLink] loadBookmarkDataToState completed successfully')

      // Clean up URL by removing deep link params
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('linkType')
      cleanUrl.searchParams.delete('query')
      window.history.replaceState({}, '', cleanUrl.toString())

      // Show success message
      dispatch('setAlertMessage', {
        message: 'Cohort definition loaded successfully from shared link.',
        messageType: 'success',
      })
    } catch (error) {
      console.error('[DeepLink] Processing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      dispatch('setAlertMessage', {
        message: `Failed to load cohort definition: ${errorMessage}`,
      })
    }
  }

  return {
    processDeepLink,
  }
}
