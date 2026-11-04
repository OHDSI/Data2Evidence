import { ref } from 'vue'
import CohortUrlCodec from '../utils/CohortUrlCodec'
import { useNotificationStore } from '../stores/notifications'

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
export function useDeepLink(dispatch: any, options?: { guard?: (action: () => void | Promise<void>) => void }) {
  const processed = ref(false)

  /**
   * Read deep-link params from the URL.
   *
   * Legacy iframe/portal links carry them in location.search. Atlas PA links
   * carry them in the hash query (`#/plugins/patient-analytics/?…`), which
   * location.search does not see. The search path wins when both exist,
   * preserving the existing ingestion contract.
   */
  const readDeepLinkParams = (): { params: URLSearchParams; fromHash: boolean } => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('linkType')) {
      return { params: searchParams, fromHash: false }
    }
    const hash = window.location.hash || ''
    const qIndex = hash.indexOf('?')
    if (qIndex >= 0 && qIndex < hash.length - 1) {
      return { params: new URLSearchParams(hash.slice(qIndex + 1)), fromHash: true }
    }
    return { params: searchParams, fromHash: false }
  }

  /**
   * Remove the consumed deep-link keys from the URL after a successful load.
   * For hash-sourced links, rewrite only the hash query, preserving the route,
   * datasetId, unrelated params and history.state.
   */
  const cleanDeepLinkParams = (fromHash: boolean) => {
    const keys = ['linkType', 'query', 'wizards']
    if (!fromHash) {
      const cleanUrl = new URL(window.location.href)
      keys.forEach(k => cleanUrl.searchParams.delete(k))
      window.history.replaceState(window.history.state, '', cleanUrl.toString())
      return
    }
    const hash = window.location.hash || ''
    const qIndex = hash.indexOf('?')
    if (qIndex < 0) return
    const route = hash.slice(0, qIndex)
    const hashParams = new URLSearchParams(hash.slice(qIndex + 1))
    keys.forEach(k => hashParams.delete(k))
    const rest = hashParams.toString()
    const cleanUrl = new URL(window.location.href)
    cleanUrl.hash = rest ? `${route}?${rest}` : route
    window.history.replaceState(window.history.state, '', cleanUrl.toString())
  }

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
    const params = readDeepLinkParams()
    const linkType = params.params.get('linkType')
    const query = params.params.get('query')
    const wizardsParam = params.params.get('wizards')

    // Check if this is a cohort definition deep link
    if (linkType !== 'cohort-definition') {
      return
    }

    // Check if query parameter exists and is not empty
    if (!query || query.trim() === '') {
      return
    }

    // Decompress and save wizards param if present
    let wizardConfigData: Record<string, any> | null = null
    if (wizardsParam) {
      try {
        const wizardsResult = CohortUrlCodec.safeDecompress(wizardsParam)
        if (wizardsResult.success) {
          wizardConfigData = wizardsResult.data as Record<string, any>
          dispatch('setWizardConfig', { ...wizardConfigData, fromDeepLink: true })
        } else {
          console.warn('[DeepLink] Failed to decompress wizards param:', (wizardsResult as any).error)
        }
      } catch (err) {
        console.warn('[DeepLink] Error processing wizards param:', err)
      }
    }

    // Mark as processed to prevent re-processing
    processed.value = true

    try {
      // Decompress the query parameter
      const result = CohortUrlCodec.safeDecompress<BookmarkData>(query)

      if (!result.success) {
        const errorResult = result as { success: false; error: string }
        console.error('[DeepLink] Decompression failed:', errorResult.error)
        useNotificationStore().setAlertMessage({
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
        useNotificationStore().setAlertMessage({
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
      const load = async () => {
        // This runs detached when invoked via the unsaved-changes guard (the guard
        // does not await it), so the error path must live here rather than relying
        // on the outer try/catch — otherwise a failed restore surfaces nothing.
        try {
          await dispatch('loadBookmarkDataToState', {
            bookmark,
            chartType: bookmark.chartType,
          })
          console.debug('[DeepLink] loadBookmarkDataToState completed successfully')

          // Clean up URL by removing deep link params
          cleanDeepLinkParams(params.fromHash)

          // Show success message, enhanced if wizard config has conditions/years
          let successMessage = 'Cohort definition loaded successfully from shared link.'
          if (wizardConfigData) {
            const hasConditions = Array.isArray(wizardConfigData.conditions) && wizardConfigData.conditions.length > 0
            const hasYears = wizardConfigData.year && (wizardConfigData.year.from || wizardConfigData.year.to)
            if (hasConditions || hasYears) {
              const parts: string[] = []
              if (hasConditions) parts.push('conditions')
              if (hasYears) parts.push('years')
              successMessage += ` Note that ${parts.join(' and ')} do not appear in the filter cards but are used in the dashboard.`
            }
          }
          useNotificationStore().setAlertMessage({
            message: successMessage,
            messageType: 'success',
            title: 'Success',
          })
        } catch (error) {
          console.error('[DeepLink] Failed to load cohort definition:', error)
          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
          useNotificationStore().setAlertMessage({
            message: `Failed to load cohort definition: ${errorMessage}`,
          })
        }
      }

      if (options?.guard) {
        options.guard(load)
      } else {
        await load()
      }
    } catch (error) {
      console.error('[DeepLink] Processing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      useNotificationStore().setAlertMessage({
        message: `Failed to load cohort definition: ${errorMessage}`,
      })
    }
  }

  return {
    processDeepLink,
  }
}
