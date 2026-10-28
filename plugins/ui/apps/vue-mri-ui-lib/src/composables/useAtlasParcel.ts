/**
 * Mount another Atlas3 plugin inside this one, as a single-spa parcel.
 *
 * Atlas3 has its own helper for this — `mountPluginParcel` in
 * `src/plugins/host/parcelLoader.ts` — but it is host-internal: not exported
 * from `@ohdsi/atlas-ui`, not on `window`, and not in the props a plugin
 * receives. So we reproduce the parts of it we need, deliberately matching its
 * prop bundle and its stylesheet link id so the two cannot disagree.
 *
 * Only meaningful in the native Atlas mount. `window.System` is Atlas's
 * SystemJS instance, which exists in the Atlas shell and nowhere else; the
 * D2E portal fails the guard and surfaces an error state rather than throwing.
 */
import { ref, type Ref } from 'vue'
import { mountRootParcel } from 'single-spa'
import { resolveAtlasPluginBaseUrl } from '../utils/atlasPluginUrl'
import { usePortalContext } from './usePortalContext'

export type AtlasParcelStatus = 'idle' | 'loading' | 'mounted' | 'error'

interface ParcelLifecycles {
  bootstrap: (props: unknown) => Promise<unknown>
  mount: (props: unknown) => Promise<unknown>
  unmount: (props: unknown) => Promise<unknown>
  update?: (props: unknown) => Promise<unknown>
}

interface ParcelHandle {
  mountPromise: Promise<unknown>
  unmount: () => Promise<unknown>
  update?: (props: unknown) => Promise<unknown>
  getStatus: () => string
}

interface SystemLike {
  import: <T = unknown>(url: string) => Promise<T>
}

export interface AtlasParcelOptions {
  /** Plugin id, as registered in plugins/atlas/plugins.standalone.json. */
  pluginId: string
  /** Where to render. May be null when mount() is called; it is polled for. */
  container: Ref<HTMLElement | null>
  /** Extra customProps, merged over the base set. Read at mount time. */
  props: () => Record<string, unknown>
  /** Inject <link id="plugin-style-<pluginId>"> before mounting. Default true. */
  injectCss?: boolean
  /** How long mount() waits for `container`. Default 5000ms. */
  containerTimeoutMs?: number
}

export interface UseAtlasParcel {
  status: Ref<AtlasParcelStatus>
  error: Ref<Error | null>
  mount: () => Promise<void>
  unmount: () => Promise<void>
  update: (props: Record<string, unknown>) => Promise<void>
  baseUrl: () => string
}

const CONTAINER_POLL_MS = 50

const getSystem = (): SystemLike | null => {
  const system = (window as unknown as { System?: SystemLike }).System
  return system && typeof system.import === 'function' ? system : null
}

/**
 * Atlas's parcelLoader injects the plugin's stylesheet at this id. Reusing it
 * makes the two injectors mutually idempotent: whichever runs first wins, and
 * the other finds the link and leaves it alone. A private id would give the
 * document two copies of the same stylesheet.
 */
const styleLinkId = (pluginId: string): string => `plugin-style-${pluginId}`

/**
 * Resolve on load *or* error, and mark the link settled either way.
 *
 * Resolving on error means a missing stylesheet cannot hang the parcel forever
 * - an unstyled dashboard is worse than nothing, but a dialog that never opens
 * is worse than both. Marking it settled stops a remount awaiting a listener
 * that has already fired. Same shape as the plugin's own injector.
 */
const injectStylesheet = (pluginId: string, href: string): Promise<void> => {
  const id = styleLinkId(pluginId)
  const existing = document.getElementById(id) as HTMLLinkElement | null
  if (existing) {
    return existing.dataset.loaded === 'true'
      ? Promise.resolve()
      : new Promise<void>(resolve => {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener('error', () => resolve(), { once: true })
        })
  }
  return new Promise<void>(resolve => {
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    const settle = () => {
      link.dataset.loaded = 'true'
      resolve()
    }
    link.addEventListener('load', settle, { once: true })
    link.addEventListener('error', settle, { once: true })
    document.head.appendChild(link)
  })
}

const waitForContainer = async (container: Ref<HTMLElement | null>, timeoutMs: number): Promise<HTMLElement> => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (container.value) return container.value
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for the parcel container to render')
    }
    await new Promise(resolve => setTimeout(resolve, CONTAINER_POLL_MS))
  }
}

export function useAtlasParcel(options: AtlasParcelOptions): UseAtlasParcel {
  const { pluginId, container, props, injectCss = true, containerTimeoutMs = 5000 } = options
  const portalContext = usePortalContext()

  const status = ref<AtlasParcelStatus>('idle')
  const error = ref<Error | null>(null)

  let handle: ParcelHandle | null = null
  let mountedProps: Record<string, unknown> = {}
  let queue: Promise<void> = Promise.resolve()

  const enqueue = (operation: () => Promise<void>): Promise<void> => {
    const next = queue.then(operation)
    queue = next.catch(() => undefined)
    return next
  }

  const baseUrl = (): string => resolveAtlasPluginBaseUrl(pluginId, portalContext.uiFilesUrl)

  const teardown = async (target: ParcelHandle | null): Promise<void> => {
    if (!target) return
    try {
      // Atlas unmounts an app's child parcels before the app's own unmount, and
      // a second unmount on a NOT_MOUNTED parcel throws.
      if (target.getStatus() === 'MOUNTED') await target.unmount()
    } catch (err) {
      console.error(`[useAtlasParcel] Could not unmount ${pluginId}`, err)
    }
  }

  const run = async (): Promise<void> => {
    status.value = 'loading'
    error.value = null
    try {
      const system = getSystem()
      if (!system) {
        throw new Error('SystemJS is not available; this only runs inside the Atlas3 shell')
      }

      const base = baseUrl()
      if (injectCss) await injectStylesheet(pluginId, `${base}style.css`)

      const domElement = await waitForContainer(container, containerTimeoutMs)
      const mod = await system.import<Partial<ParcelLifecycles>>(`${base}index.system.js`)
      if (
        typeof mod?.bootstrap !== 'function' ||
        typeof mod?.mount !== 'function' ||
        typeof mod?.unmount !== 'function'
      ) {
        throw new Error(`The ${pluginId} bundle does not export single-spa lifecycles`)
      }

      // Mirrors atlas3 parcelLoader.ts's own prop bundle, then the caller's on
      // top. `t` is the host's i18n lookup; Atlas gives parcels one, and the
      // plugin falls back to the same shape when it is absent.
      const parcelProps: Record<string, unknown> = {
        name: pluginId,
        appId: pluginId,
        domElement,
        getToken: portalContext.getToken,
        locale: portalContext.locale,
        isAtlas: true,
        t: (_key: string, fallback?: string) => fallback ?? _key,
        ...props(),
      }

      const next = mountRootParcel(mod as never, parcelProps as never) as unknown as ParcelHandle
      await next.mountPromise
      handle = next
      mountedProps = parcelProps
      status.value = 'mounted'
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err))
      console.error(`[useAtlasParcel] Could not mount ${pluginId}`, wrapped)
      error.value = wrapped
      status.value = 'error'
    }
  }

  const mount = (): Promise<void> =>
    enqueue(async () => {
      if (status.value !== 'mounted') await run()
    })

  const unmount = (): Promise<void> =>
    enqueue(async () => {
      const target = handle
      handle = null
      await teardown(target)
      status.value = 'idle'
      error.value = null
    })

  const update = async (next: Record<string, unknown>): Promise<void> => {
    // A tab switch can land while the bundle is still loading, before there is
    // a handle. Apply it once the mount settles rather than dropping it.
    await queue
    if (!handle || typeof handle.update !== 'function') return
    try {
      await handle.update({ ...mountedProps, ...next })
    } catch (err) {
      console.error(`[useAtlasParcel] Could not update ${pluginId}`, err)
    }
  }

  return { status, error, mount, unmount, update, baseUrl }
}
