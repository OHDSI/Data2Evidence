/**
 * Native Atlas3 single-spa entry for Patient Analytics (no iframe).
 *
 * Atlas3 loads this bundle with System.import and calls the exported
 * bootstrap/mount/unmount lifecycles directly, passing its own customProps
 * (authContext, messageBus, domElement, getToken, datasetId, locale, ...).
 * Those props differ from the portal contract src/lifecycles.ts expects:
 *
 * - qeSvcUrl is absent, which would make the vuex auth module fall back to
 *   import.meta.env.VITE_HOST (undefined in this build). Atlas3 serves the
 *   plugin same-origin, so qeSvcUrl is normalized to window.location.origin
 *   (the same value the iframe boot uses).
 * - features / featuresLoading / releaseId may be absent; default them so the
 *   portal-context store never sees undefined.
 *
 * The `alp-terminology-open` DOM event is answered here via the host's
 * messageBus instead of the iframe postMessage relay in
 * utils/atlasTerminologyBridge.ts.
 */

import {
  bootstrap as portalBootstrap,
  mount as portalMount,
  unmount as portalUnmount,
  update as portalUpdate,
} from './lifecycles'
import { formatConceptSetRef, parseConceptSetRef } from './query-filter/utils/conceptSetRef'

type AtlasProps = Record<string, any>

const FEATURE_LIST_URL = '/system-portal/feature/list'
const ME_URL = '/usermgmt/api/me'

/**
 * Atlas3 passes no `features`, and several things in this app are gated on
 * them. Most visibly, Analyze needs `wizards` enabled — with an empty list the
 * action is simply dead, which reads as a broken feature rather than a
 * disabled one.
 *
 * The portal supplies the same list through customProps, from the same
 * endpoint. Fetch it with the host's token when the host has not supplied it.
 *
 * A failure returns an empty list rather than throwing: the mount must not be
 * blocked by this, and an empty list is exactly the previous behaviour.
 */
const fetchFeatures = async (props: AtlasProps): Promise<unknown[]> => {
  if (Array.isArray(props.features) && props.features.length) return props.features
  try {
    const token = typeof props.getToken === 'function' ? await props.getToken() : null
    const response = await fetch(FEATURE_LIST_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error(`${response.status}`)
    const features = await response.json()
    return Array.isArray(features) ? features : []
  } catch (error) {
    console.error('[atlas-lifecycles] Could not load the feature list; feature-gated actions stay off', error)
    return []
  }
}

/**
 * The caller's usermgmt account name, which is the owner key for saved work.
 *
 * Every ownership test in this app compares it to a stored `user_id` that
 * bookmark-svc wrote from its own GET /me, so a value from anywhere else reads
 * as "owned by nobody" and a user's own saved cohorts are reported as none.
 *
 * WHAT THE HOST SENDS IS NOT USABLE, which is why this ignores `props.username`
 * rather than preferring it. Atlas3 passes `authContext.user?.username`, and
 * trex's provider emits no `username` claim at all — the OIDC user falls back
 * to `name`, which for a user whose upstream record carried no display name is
 * the synthesised address `<username>@d2e.local`. Against a `user_id` of
 * `brandan` that matches nothing, and the list is silently empty. `useMe`
 * documents the same drift on the portal side and resolves it the same way:
 * read the owner key from the system that owns it.
 *
 * `undefined` on failure, never a substitute: showing one user another's saved
 * work is worse than showing none, and `usernameLoading` below keeps consumers
 * from reading the gap as an empty account.
 */
const fetchUsername = async (props: AtlasProps): Promise<string | undefined> => {
  try {
    const token = typeof props.getToken === 'function' ? await props.getToken() : null
    const response = await fetch(ME_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error(`${response.status}`)
    const { username } = await response.json()
    return typeof username === 'string' && username ? username : undefined
  } catch (error) {
    console.error('[atlas-lifecycles] Could not resolve the current username; saved work stays hidden', error)
    return undefined
  }
}

/**
 * Normalize the host's props for the portal contract.
 *
 * `features` and `releaseId` are passed through as given, including
 * `undefined`, and only `mount` supplies defaults. The portal-context store's
 * `applyProps` skips `undefined` values, so leaving a field undefined on
 * `update` means "keep what is already there".
 *
 * That matters for all three. Atlas3 never sends a feature list, so re-deriving
 * one on update would overwrite what `mount` fetched with an empty array and
 * turn Analyze back off after a source switch; `username` is resolved once at
 * mount for the same reason, and re-reading it here would blank the owner key
 * on the first update and hide the user's saved work again. And `releaseId` had a hard `?? ''`
 * fallback, so any update that omitted it — a token refresh, a locale change —
 * would clear release scoping, because `''` is not `undefined` and
 * `applyProps` would happily write it.
 */
const normalizeProps = (
  props: AtlasProps,
  defaults?: { features: unknown[]; username: string | undefined; releaseId: string }
): AtlasProps => ({
  ...props,
  qeSvcUrl: window.location.origin,
  features: defaults?.features,
  featuresLoading: false,
  username: defaults?.username,
  usernameLoading: false,
  releaseId: defaults ? props.releaseId ?? defaults.releaseId : props.releaseId,
})

/**
 * Atlas3 resolves customProps.domElement with getElementById at mount time.
 * When that runs before PluginContainer has rendered, domElement arrives null
 * and single-spa-vue appends its own div to document.body — the app then
 * renders outside the host layout. Poll briefly for the container the host
 * promises (`plugin-<appId>`) before falling back to the host's value.
 */
const resolveDomElement = async (props: AtlasProps, timeoutMs = 5000): Promise<HTMLElement | null> => {
  if (props.domElement instanceof HTMLElement) return props.domElement
  const containerId = props.containerId || (props.appId ? `plugin-${props.appId}` : null)
  if (!containerId) return props.domElement ?? null
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const el = document.getElementById(containerId)
    if (el) return el
    if (Date.now() >= deadline) return null
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

type TerminologyCloseValues = {
  currentConceptSet?: { id: string; name: string }
}

type TerminologyEventProps = {
  mode?: string
  title?: string
  selectedConceptSetId?: string | number
  onClose?: (values?: TerminologyCloseValues) => void
}

type ConceptSetChoice = { conceptSetId: number | string; name: string }

type MessageBus = {
  request: (type: string, payload?: unknown) => Promise<unknown>
}

const OPEN_EVENT = 'alp-terminology-open'
const EDIT_REQUEST = 'conceptSet:edit'

/**
 * Removes the listener installed by the current mount, or null when none is
 * installed.
 *
 * Not a boolean. A flag only tells you a listener was installed once, and this
 * bridge needs to be taken down: Atlas3 is a shared realm, so a listener left
 * on `window` after unmount answers another plugin's `alp-terminology-open`
 * from an app that is no longer mounted. A flag also pins the first mount's
 * `messageBus` for the life of the page — a remount would skip installation and
 * keep talking to the old bus.
 */
let removeTerminologyBridge: (() => void) | null = null

/**
 * Bumped by every `mount`, and by `unmount` so an in-flight mount is orphaned.
 *
 * `mount` awaits a feature fetch and then polls up to five seconds for the
 * host's container, so it can still be running when the user navigates away.
 * Without this, that mount would go on to stand up a Vue app, a Vuex store,
 * watchers and a `window` listener for an app the host believes is gone — and
 * no further `unmount` would arrive to take them down.
 */
let currentMountGeneration = 0

type AtlasConceptSetTarget = { kind: 'new' } | { kind: 'edit'; conceptSetId: number } | { kind: 'unsupported' }

const toAtlasConceptSetTarget = (ref: string | number | undefined): AtlasConceptSetTarget => {
  if (ref === undefined || ref === '') return { kind: 'new' }
  try {
    const { source, externalId } = parseConceptSetRef(ref)
    return source === 'webapi' ? { kind: 'edit', conceptSetId: externalId } : { kind: 'unsupported' }
  } catch {
    return { kind: 'unsupported' }
  }
}

const requestConceptSetEdit = async (
  messageBus: MessageBus,
  conceptSetId: number | undefined
): Promise<ConceptSetChoice | null> => {
  const payload = conceptSetId === undefined ? {} : { conceptSetId }
  try {
    return ((await messageBus.request(EDIT_REQUEST, payload)) as ConceptSetChoice) ?? null
  } catch {
    return null
  }
}

const onTerminologyOpen =
  (messageBus: MessageBus) =>
  (event: Event): void => {
    const props: TerminologyEventProps = (event as CustomEvent<{ props: TerminologyEventProps }>).detail?.props ?? {}

    if (props.mode && props.mode !== 'CONCEPT_SET') return

    const bridgeAtRequestTime = removeTerminologyBridge
    const isCurrent = () => removeTerminologyBridge === bridgeAtRequestTime

    const target = toAtlasConceptSetTarget(props.selectedConceptSetId)
    if (target.kind === 'unsupported') {
      console.warn('[atlas-lifecycles] The Atlas3 editor cannot open this concept set', props.selectedConceptSetId)
      props.onClose?.(undefined)
      return
    }

    const conceptSetId = target.kind === 'edit' ? target.conceptSetId : undefined
    void requestConceptSetEdit(messageBus, conceptSetId).then(choice => {
      if (!isCurrent()) return
      if (!choice) {
        props.onClose?.(undefined)
        return
      }
      const id = formatConceptSetRef({ source: 'webapi', externalId: Number(choice.conceptSetId) })
      props.onClose?.({ currentConceptSet: { id, name: choice.name } })
    })
  }

/**
 * Replaces any previous bridge, so a remount never stacks two listeners and
 * never keeps a stale `messageBus`.
 */
const installTerminologyBridge = (props: AtlasProps): void => {
  removeTerminologyBridge?.()
  removeTerminologyBridge = null

  const messageBus = props?.messageBus as MessageBus | undefined
  if (!messageBus || typeof messageBus.request !== 'function') return

  const handler = onTerminologyOpen(messageBus)
  window.addEventListener(OPEN_EVENT, handler)
  removeTerminologyBridge = () => window.removeEventListener(OPEN_EVENT, handler)
}

export const bootstrap = portalBootstrap

export const unmount = async (props: AtlasProps) => {
  // Before delegating, so a failure inside portalUnmount cannot leave the
  // listener attached to a realm this app has left.
  removeTerminologyBridge?.()
  removeTerminologyBridge = null
  currentMountGeneration += 1
  return (portalUnmount as (p: AtlasProps) => Promise<unknown>)(props)
}

export const mount = async (props: AtlasProps) => {
  const mountGeneration = ++currentMountGeneration
  const [features, username] = await Promise.all([
    fetchFeatures(props ?? {}),
    fetchUsername(props ?? {}),
  ])
  const normalizedProps = normalizeProps(props ?? {}, {
    features,
    username,
    releaseId: '',
  })
  const domElement = await resolveDomElement(normalizedProps)
  if (domElement) normalizedProps.domElement = domElement

  // The two awaits above can outlast the user's patience. If an unmount landed
  // meanwhile, stop here rather than mounting an app nothing will take down.
  if (mountGeneration !== currentMountGeneration) return undefined

  // portalMount runs single-spa-vue's handleInstance with these props, which
  // sets up the portal-context store; install the bridge right after, with
  // the messageBus captured from the same props.
  const result = await (portalMount as (p: AtlasProps) => Promise<unknown>)(normalizedProps)
  installTerminologyBridge(normalizedProps)
  return result
}

export const update = async (props: AtlasProps) =>
  (portalUpdate as (p: AtlasProps) => Promise<unknown>)(normalizeProps(props ?? {}))
