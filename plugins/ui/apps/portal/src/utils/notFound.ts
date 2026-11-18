/** The router's basename (index.tsx) and Vite's `base`. */
export const PORTAL_BASENAME = "/d2e/portal";

/**
 * The "Page not found" page, an Atlas3 sub-plugin
 * (plugins/atlas/subplugins/not-found). It lives in Atlas3 so it can show the
 * Atlas3 header the design asks for (#2261). The trailing slash is required:
 * Atlas3 only activates a routed plugin on `/plugins/<id>/`.
 */
export const NOT_FOUND_URL = "/atlas/#/plugins/not-found/";

/**
 * Whether the router can handle this URL. trex also serves the portal under
 * /portal/* (plugins/ui/package.json maps /portal to the portal build), and
 * there the router, whose basename is /d2e/portal, matches nothing and the
 * page stays empty.
 */
export const isUnderPortalBasename = (pathname: string): boolean =>
  pathname === PORTAL_BASENAME || pathname.startsWith(`${PORTAL_BASENAME}/`);

/**
 * Whether a single-spa app owns this URL. Those apps are shown by matching the
 * pathname outside React Router, so a catch-all route sees their URLs as
 * unknown. This mirrors the visibility check in Researcher, SystemAdmin and Etl
 * exactly, so a page that is shown is never treated as missing.
 */
export const isSingleSpaAppRoute = (pathname: string, section: string, appRoutes: string[]): boolean =>
  appRoutes.some((route) => pathname.includes(`/${section}/${route}`));

/** `replace`, so Back skips the broken URL instead of returning to it. */
export const redirectToNotFound = (): void => {
  window.location.replace(NOT_FOUND_URL);
};
