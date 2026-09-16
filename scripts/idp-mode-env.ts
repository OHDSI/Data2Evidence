// Which identity setup an env file describes, and bringing an env file written
// before the trex identity provider up to date. Pure: no fs, no process, so it
// is unit tested directly and compiled into the CLI unchanged.

export type IdpMode = "trex" | "logto-federated";

export const LOGTO_FEDERATION_COMPOSE_FILE = "docker-compose-logto-federation.yml";

const lineValue = (content: string, key: string): string | undefined => {
  const m = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : undefined;
};

export function idpModeOf(content: string): IdpMode | undefined {
  const v = lineValue(content, "D2E_IDP_MODE");
  return v === "trex" || v === "logto-federated" ? v : undefined;
}

/**
 * Decide and record the mode of an env file that does not name one yet.
 *
 * - Names a mode already: left exactly as it is.
 * - Has D2E_IDP: written by an init that already targeted trex, so trex.
 * - Has Logto app credentials but no D2E_IDP: an installation from before trex,
 *   whose users are in Logto, so logto-federated, plus the settings trex needs.
 *   D2E__SEED_USER is deliberately not added: it would create admin@<domain>
 *   with a well-known password on an installation that already has an admin.
 * - Anything else: trex.
 */
export function upgradeEnvForIdpMode(
  content: string,
  gen: { password: () => string; rootKey: () => string },
): { mode: IdpMode; content: string; added: string[] } {
  const existing = idpModeOf(content);
  if (existing) return { mode: existing, content, added: [] };

  const base = content.replace(/\n*$/, "\n");
  const isPreTrex = lineValue(content, "D2E_IDP") === undefined &&
    lineValue(content, "LOGTO__D2E_APP__CLIENT_SECRET") !== undefined;

  if (!isPreTrex) {
    return { mode: "trex", content: `${base}D2E_IDP_MODE=trex\n`, added: ["D2E_IDP_MODE"] };
  }

  let body = base.replace(/^USER_MGMT__ROLE_SOURCE=.*\n/m, "");
  const added: string[] = [];
  const add = (key: string, value: string, onlyIfMissing = false) => {
    if (onlyIfMissing && lineValue(body, key) !== undefined) return;
    body += `${key}=${value}\n`;
    added.push(key);
  };
  add("D2E_IDP_MODE", "logto-federated");
  add("D2E_IDP", "trex");
  add("TREX__OIDC__WEBAPI_CLIENT_ID", "d2e-webapi", true);
  add("TREX__OIDC__WEBAPI_CLIENT_SECRET", gen.password(), true);
  add("TREX_ROOT_KEY", gen.rootKey(), true);
  add("USER_MGMT__ROLE_SOURCE", "trex");
  return { mode: "logto-federated", content: body, added };
}
