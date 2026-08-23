/**
 * Single-spa entry for the Atlas3 shell.
 *
 * Deliberately dependency-free: the actual Patient Analytics app runs inside a
 * same-origin <iframe> (see atlas-iframe.html / atlas-iframe-boot.ts) so its
 * global styles and Stencil web components cannot leak into — or be broken by —
 * the Atlas shell document. This parcel only creates the iframe and relays the
 * auth/dataset context to it via postMessage, re-posting a fresh token
 * periodically because tokens expire while the plugin stays mounted.
 *
 * It also relays the other direction: the iframe cannot navigate its host, so
 * requests to open the Atlas concept viewer arrive as messages handled here.
 */

type AtlasPluginProps = {
  domElement?: HTMLElement
  getToken?: () => Promise<string>
  authContext?: { token?: string | null }
  datasetId?: string
  releaseId?: string
  username?: string
  locale?: string
}

const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000

let iframe: HTMLIFrameElement | null = null
let tokenTimer: ReturnType<typeof setInterval> | null = null
let readyListener: ((event: MessageEvent) => void) | null = null

const resolveAppUrl = (): string => {
  // import.meta.url is the SystemJS module URL of index.system.js, i.e.
  // <origin>/atlas/plugins/patient-analytics/index.system.js
  try {
    return new URL('app/atlas-iframe.html', import.meta.url).href
  } catch {
    return '/atlas/plugins/patient-analytics/app/atlas-iframe.html'
  }
}

export const bootstrap = async () => undefined

const CONTAINER_ID = 'plugin-patient-analytics'
const CONTAINER_TIMEOUT_MS = 5000
const SELECTED_SOURCE_KEY = 'atlas3:trexsql:selectedDataSource'

/** Where the Atlas shell records the data source the user picked. */
const selectedAtlasSource = (): string => {
  try {
    return window.localStorage.getItem(SELECTED_SOURCE_KEY) || ''
  } catch {
    return ''
  }
}

/**
 * Atlas renders the mount point as part of its route view, which can land after
 * single-spa has already called mount. Throwing on the first miss marks the app
 * broken for the life of the page - single-spa never retries - so wait for the
 * container instead of failing the race.
 */
const resolveContainer = async (props: AtlasPluginProps): Promise<HTMLElement | null> => {
  const find = () =>
    props.domElement || (document.getElementById(CONTAINER_ID) as HTMLElement | null)

  const immediate = find()
  if (immediate) return immediate

  return new Promise(resolve => {
    const deadline = Date.now() + CONTAINER_TIMEOUT_MS
    const timer = setInterval(() => {
      const el = find()
      if (el || Date.now() > deadline) {
        clearInterval(timer)
        resolve(el)
      }
    }, 50)
  })
}

export const mount = async (props: AtlasPluginProps) => {
  const container = await resolveContainer(props)
  if (!container) {
    throw new Error('patient-analytics: no mount container found')
  }

  container.style.height = 'calc(100vh - 60px)'

  const getToken = props.getToken ?? (async () => props.authContext?.token ?? '')

  iframe = document.createElement('iframe')
  iframe.title = 'Data Exploration'
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = '0'
  iframe.style.display = 'block'

  const postContext = async () => {
    let token = ''
    try {
      token = (await getToken()) || ''
    } catch {
      // keep last delivered token; the boot script only overwrites on message
      return
    }
    iframe?.contentWindow?.postMessage(
      {
        type: 'pa-context',
        token,
        datasetId: props.datasetId || '',
        releaseId: props.releaseId || '',
        username: props.username || '',
        locale: props.locale || 'en',
        qeSvcUrl: window.location.origin,
      },
      window.location.origin,
    )
  }

  // Atlas serves the concept viewer as the hash route /concept/:sourceKey/:conceptId,
  // and re-validates both segments itself, so an unusable message is dropped rather
  // than pushing the shell to a route that cannot resolve.
  //
  // The iframe only knows the dataset the host delivered in pa-context, which is
  // empty when the plugin is opened without one; Atlas still knows which source is
  // selected, so fall back to that before giving up.
  const openConceptViewer = ({ sourceKey, conceptId }: { sourceKey?: string; conceptId?: number }) => {
    const key = sourceKey || props.datasetId || selectedAtlasSource()
    if (!key || !Number.isInteger(conceptId)) return
    window.location.hash = `#/concept/${encodeURIComponent(key)}/${conceptId}`
  }

  // The boot script announces readiness; also post on iframe load in case the
  // announcement fired before this listener was attached.
  readyListener = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return
    if (event.source !== iframe?.contentWindow) return
    if (event.data?.type === 'pa-ready') void postContext()
    if (event.data?.type === 'pa-open-concept') openConceptViewer(event.data)
  }
  window.addEventListener('message', readyListener)
  iframe.addEventListener('load', () => void postContext())

  tokenTimer = setInterval(() => void postContext(), TOKEN_REFRESH_INTERVAL_MS)

  iframe.src = resolveAppUrl()
  container.appendChild(iframe)
}

export const unmount = async () => {
  if (tokenTimer !== null) {
    clearInterval(tokenTimer)
    tokenTimer = null
  }
  if (readyListener) {
    window.removeEventListener('message', readyListener)
    readyListener = null
  }
  iframe?.remove()
  iframe = null
}
