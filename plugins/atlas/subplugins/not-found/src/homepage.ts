/**
 * Where "Return to homepage" goes: the Data Sources list today.
 *
 * landing-redirect.js publishes the landing route as window.D2E_ATLAS_LANDING_HASH
 * (it mirrors theme.logoNavigateTo in plugins.standalone.json), so following it
 * keeps this button, the logo and sign-in all landing in the same place if the
 * homepage changes. The fallback covers the dev harness and unit tests, where
 * that script does not run.
 */
export const DEFAULT_HOMEPAGE_HASH = '#/plugins/datasources/';

export function homepageHash(): string {
  return window.D2E_ATLAS_LANDING_HASH || DEFAULT_HOMEPAGE_HASH;
}
