// Where the portal is actually served from: <base href="/d2e/portal"> in public/index.html
// and the router basename in src/index.tsx. The cohort deep link is a route underneath it,
// never a site of its own.
const PORTAL_BASE_PATH = "/d2e/portal";

// The Patient Analytics cohort-builder route the deep link targets. The MCP server's
// build_d2e_cohort_deeplink emits `${PORTAL_BASE_PATH}${COHORT_ROUTE}?datasetId=…&linkType=…&query=…`.
const COHORT_ROUTE = "/researcher/cohort";

/**
 * Point an assistant-authored link at this portal.
 *
 * `build_d2e_cohort_deeplink` returns a site-relative PATH — `/d2e/portal/researcher/cohort?…`
 * — with no scheme or host, because only the browser knows which deployment it is on. Models
 * routinely "finish" that into a full URL by promoting the leading path segment to a hostname,
 * so the panel ends up with `https://d2e/portal/researcher/cohort?…` and the click leaves for a
 * host that does not exist. The query string is the part that carries the cohort, so keep it
 * and rebuild everything in front of it from where we are actually running.
 *
 * Idempotent: a link that was already correct resolves to itself. Anything that is not the
 * cohort route is returned exactly as written.
 */
export function resolveAssistantHref(href: string): string {
  let parsed: URL;
  try {
    parsed = new URL(href, window.location.href);
  } catch {
    // Not resolvable as a URL at all — nothing to fix, and guessing would be worse than
    // leaving the model's text alone.
    return href;
  }

  // Match on the route suffix rather than the whole path: `/d2e/portal/researcher/cohort`
  // and `https://d2e/portal/researcher/cohort` differ only in where the "d2e" ended up, and
  // a model that drops the prefix entirely gives `/portal/researcher/cohort`.
  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path.endsWith(COHORT_ROUTE)) return href;

  return `${window.location.origin}${PORTAL_BASE_PATH}${COHORT_ROUTE}${parsed.search}${parsed.hash}`;
}
