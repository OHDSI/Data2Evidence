/**
 * Portal Bridge - Handles communication between portal and embedded Atlas3
 */

export interface PortalMessage {
  type: 'auth' | 'route' | 'dataset' | 'locale' | 'ready' | 'request-auth';
  payload: any;
}

export interface AuthPayload {
  token: string;
  username?: string;
  idpUserId?: string;
}

export interface DatasetPayload {
  datasetId: string;
}

export interface RoutePayload {
  path: string;
}

export interface LocalePayload {
  locale: string;
}

/**
 * Send a message to the embedded Atlas3 iframe
 */
export function sendToAtlas(iframe: HTMLIFrameElement, message: PortalMessage): void {
  if (!iframe.contentWindow) {
    console.warn('[PortalBridge] iframe contentWindow not available');
    return;
  }

  iframe.contentWindow.postMessage(
    { source: 'portal-bridge', ...message },
    window.location.origin
  );
}

/**
 * Send auth token to Atlas3
 */
export function sendAuth(iframe: HTMLIFrameElement, auth: AuthPayload): void {
  sendToAtlas(iframe, { type: 'auth', payload: auth });
}

/**
 * Send dataset change to Atlas3
 */
export function sendDataset(iframe: HTMLIFrameElement, datasetId: string): void {
  sendToAtlas(iframe, { type: 'dataset', payload: { datasetId } });
}

/**
 * Send route change to Atlas3
 */
export function sendRoute(iframe: HTMLIFrameElement, path: string): void {
  sendToAtlas(iframe, { type: 'route', payload: { path } });
}

/**
 * Send locale change to Atlas3
 */
export function sendLocale(iframe: HTMLIFrameElement, locale: string): void {
  sendToAtlas(iframe, { type: 'locale', payload: { locale } });
}

/**
 * Listen for messages from Atlas3 iframe
 */
export function listenToAtlas(
  callback: (message: PortalMessage) => void
): () => void {
  const handler = (event: MessageEvent) => {
    // Verify origin
    if (event.origin !== window.location.origin) return;

    // Verify source
    if (!event.data || event.data.source !== 'atlas-bridge') return;

    callback(event.data as PortalMessage);
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/**
 * Wait for Atlas3 iframe to signal it's ready
 */
export function waitForAtlasReady(
  iframe: HTMLIFrameElement,
  timeout = 10000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for Atlas3 to be ready'));
    }, timeout);

    const cleanup = listenToAtlas((message) => {
      if (message.type === 'ready') {
        clearTimeout(timeoutId);
        cleanup();
        resolve();
      }
    });
  });
}
