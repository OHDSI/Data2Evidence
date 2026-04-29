import { computed } from 'vue'
import { getPortalAPI } from '../utils/PortalUtils'

const FEATURE_ADMIN_ONLY_SHARING = 'adminOnlySharing'

/**
 * Composable for managing sharing permissions based on feature flag
 */
export function useUserRole() {
  const portalAPI = getPortalAPI()

  // Check if features are still loading
  const featuresLoading = computed(() => {
    return portalAPI?.featuresLoading ?? true
  })

  // Check if adminOnlySharing feature is enabled
  const adminOnlySharingEnabled = computed(() => {
    const features = portalAPI?.features ?? []
    const feature = features.find(f => f.feature === FEATURE_ADMIN_ONLY_SHARING)
    return feature?.isEnabled ?? false
  })

  // Determine if user can share items
  // Returns false while features are loading (to prevent flash)
  // Returns true only if feature is disabled
  const canShare = computed(() => {
    if (featuresLoading.value) return false
    return !adminOnlySharingEnabled.value
  })

  return {
    canShare,
    adminOnlySharingEnabled,
    featuresLoading,
  }
}
