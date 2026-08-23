/**
 * Single-spa entry for the Atlas3 shell.
 *
 * Deliberately dependency-free: the actual Patient Analytics app runs inside a
 * same-origin <iframe> (see atlas-iframe.html / atlas-iframe-boot.ts) so its
 * global styles and Stencil web components cannot leak into — or be broken by —
 * the Atlas shell document. This parcel only creates the iframe and relays the
 * auth/dataset context to it via postMessage, re-posting a fresh token
 * periodically because tokens expire while the plugin stays mounted.
 */

type AtlasPluginProps = {
  domElement?: HTMLElement
  getToken?: () => Promise<string>
  authContext?: { token?: string | null }
  datasetId?: string
  releaseId?: string
  username?: string
  locale?: string
  messageBus?: HostMessageBusLike
  appId?: string
  containerId?: string
}

/** The slice of the Atlas host message bus this parcel uses. */
type HostMessageBusLike = {
  request?: (type: string, payload?: unknown) => Promise<unknown>
}

type ConceptSetChoice = { conceptSetId: number | string; name: string }

const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000

// Hosts without conceptSet:choose never answer the request, so the bridge gives
// up rather than leaving the iframe waiting on a reply that cannot come.
const CHOOSER_TIMEOUT_MS = 60 * 1000

let iframe: HTMLIFrameElement | null = null
let tokenTimer: ReturnType<typeof setInterval> | null = null
let readyListener: ((event: MessageEvent) => void) | null = null
let propsListener: ((event: Event) => void) | null = null

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

  // Atlas resolves the dataset when its source list loads, which can be after the
  // props for this mount were built, and it announces the late value with
  // custom-props-changed on its own window - out of reach of the iframe. Track it
  // here and re-post so the app is not left without a dataset.
  let datasetId = props.datasetId || ''

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
        datasetId: datasetId || '',
        releaseId: props.releaseId || '',
        username: props.username || '',
        locale: props.locale || 'en',
        qeSvcUrl: window.location.origin,
      },
      window.location.origin,
    )
  }

  // The iframe cannot open an Atlas dialog, so a request to pick a concept set is
  // relayed to the host message bus and the answer posted back under the id the
  // iframe sent, which is how it matches the reply to its pending request.
  const chooseConceptSet = async (requestId: string, title?: string) => {
    const reply = (choice: ConceptSetChoice | null) =>
      iframe?.contentWindow?.postMessage(
        { type: 'pa-concept-set-chosen', requestId, choice },
        window.location.origin
      )

    const request = props.messageBus?.request
    if (!request) {
      reply(null)
      return
    }

    try {
      const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), CHOOSER_TIMEOUT_MS))
      const choice = await Promise.race([request.call(props.messageBus, 'conceptSet:choose', { title }), timeout])
      reply((choice as ConceptSetChoice) ?? null)
    } catch {
      reply(null)
    }
  }

  // The boot script announces readiness; also post on iframe load in case the
  // announcement fired before this listener was attached.
  readyListener = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return
    if (event.source !== iframe?.contentWindow) return
    if (event.data?.type === 'pa-ready') void postContext()
    if (event.data?.type === 'pa-choose-concept-set') {
      void chooseConceptSet(event.data.requestId, event.data.title)
    }
  }
  window.addEventListener('message', readyListener)

  propsListener = (event: Event) => {
    const detail = (event as CustomEvent<{ appId?: string; containerId?: string; datasetId?: string }>).detail
    if (!detail) return
    const mine =
      (!props.appId && !props.containerId) ||
      (props.appId && detail.appId === props.appId) ||
      (props.containerId && detail.containerId === props.containerId)
    if (!mine) return
    if (!detail.datasetId || detail.datasetId === datasetId) return
    datasetId = detail.datasetId
    void postContext()
  }
  window.addEventListener('custom-props-changed', propsListener)

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
  if (propsListener) {
    window.removeEventListener('custom-props-changed', propsListener)
    propsListener = null
  }
  iframe?.remove()
  iframe = null
}
