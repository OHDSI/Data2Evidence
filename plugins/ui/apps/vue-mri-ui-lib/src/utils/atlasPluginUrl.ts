/**
 * Where another Atlas3 plugin's bundle lives, seen from inside this plugin.
 *
 * Atlas hands every plugin its own public directory as `uiFilesUrl` — built by
 * the host as `${BASE_URL}plugins/<our id>/` — so a sibling plugin is one level
 * up and along. Resolving `../<pluginId>/` against it reproduces the host's own
 * entry URL exactly, including the relative `./plugins/...` form it may use,
 * rather than us guessing where Atlas is mounted.
 *
 * Atlas3 has no `<base>` tag and routes by hash, so `document.baseURI` is the
 * shell's directory and a relative `uiFilesUrl` resolves against it the same
 * way SystemJS resolves the host's own imports.
 *
 * The fallback is the path Atlas is served from in a d2e deployment
 * (`plugins/atlas/package.json` maps `/atlas` to `/resources/atlas`). It only
 * applies when the host sent no `uiFilesUrl`, which the D2E portal never does.
 */

const withTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`)

/**
 * Absolute href of `pluginId`'s public directory, always ending in `/`.
 *
 * Never throws: a malformed `uiFilesUrl` falls back rather than taking down the
 * caller, because this runs on the path that opens a dialog and a thrown URL
 * error there would surface as a blank modal with nothing in the console.
 */
export function resolveAtlasPluginBaseUrl(
  pluginId: string,
  uiFilesUrl?: string,
  baseURI: string = typeof document === 'undefined' ? 'http://localhost/' : document.baseURI
): string {
  const fallback = (): string => new URL(`plugins/${pluginId}/`, new URL('/atlas/', baseURI)).href

  const trimmed = typeof uiFilesUrl === 'string' ? uiFilesUrl.trim() : ''
  if (!trimmed) {
    try {
      return fallback()
    } catch {
      return `/atlas/plugins/${pluginId}/`
    }
  }

  try {
    const ours = new URL(withTrailingSlash(trimmed), baseURI)
    return new URL(`../${pluginId}/`, ours).href
  } catch {
    try {
      return fallback()
    } catch {
      return `/atlas/plugins/${pluginId}/`
    }
  }
}

/** The SystemJS entry Atlas serves for a plugin. */
export function resolveAtlasPluginEntryUrl(
  pluginId: string,
  uiFilesUrl?: string,
  baseURI?: string
): string {
  return `${resolveAtlasPluginBaseUrl(pluginId, uiFilesUrl, baseURI)}index.system.js`
}

/** The stylesheet Atlas's own parcel loader injects beside that entry. */
export function resolveAtlasPluginStyleUrl(
  pluginId: string,
  uiFilesUrl?: string,
  baseURI?: string
): string {
  return `${resolveAtlasPluginBaseUrl(pluginId, uiFilesUrl, baseURI)}style.css`
}
