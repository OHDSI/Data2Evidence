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

export function installPortalPropsListener(
  portalContext: PortalContextLike,
  options?: { expectedAppId?: string; expectedContainerId?: string }
): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<PropsChangedEventDetail>
    const detail = customEvent.detail
    if (!isObject(detail)) return

    if (!isMatchingEvent(detail, options?.expectedAppId, options?.expectedContainerId)) {
      return
    }

    portalContext.applyProps(detail)
  }

  window.addEventListener('custom-props-changed', handler)
  return () => window.removeEventListener('custom-props-changed', handler)
}
