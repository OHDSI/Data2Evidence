import { usePortalContextStore } from '@/stores/portalContext'
import type { PortalContextState } from '@/types/portal-props'

type PortalContextLike = ReturnType<typeof usePortalContextStore>

type PropsChangedEventDetail = Partial<PortalContextState> & {
  appId?: string
  containerId?: string
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isMatchingEvent = (
  detail: PropsChangedEventDetail,
  expectedAppId?: string,
  expectedContainerId?: string
): boolean => {
  if (!expectedAppId && !expectedContainerId) return true
  if (expectedAppId && detail.appId === expectedAppId) return true
  if (expectedContainerId && detail.containerId === expectedContainerId) return true
  return false
}

type GuardChange = (incoming: PropsChangedEventDetail, apply: () => void) => void

const isDatasetOrReleaseChange = (
  current: PortalContextLike,
  incoming: PropsChangedEventDetail
): boolean => {
  const datasetChanged = incoming.datasetId !== undefined && incoming.datasetId !== current.datasetId
  const releaseChanged = incoming.releaseId !== undefined && incoming.releaseId !== current.releaseId
  return datasetChanged || releaseChanged
}

export function installPortalPropsListener(
  portalContext: PortalContextLike,
  options?: {
    expectedAppId?: string
    expectedContainerId?: string
    guardChange?: GuardChange
  }
): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<PropsChangedEventDetail>
    const detail = customEvent.detail
    if (!isObject(detail)) return

    if (!isMatchingEvent(detail, options?.expectedAppId, options?.expectedContainerId)) {
      return
    }

    const apply = () => portalContext.applyProps(detail)

    if (options?.guardChange && isDatasetOrReleaseChange(portalContext, detail)) {
      options.guardChange(detail, apply)
      return
    }

    apply()
  }

  window.addEventListener('custom-props-changed', handler)
  return () => window.removeEventListener('custom-props-changed', handler)
}
