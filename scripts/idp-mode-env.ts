// Which identity setup an env file describes, and bringing an env file written
// before the trex identity provider up to date. Pure: no fs, no process, so it
// is unit tested directly and compiled into the CLI unchanged.

export type IdpMode = "trex" | "logto-federated";

export const LOGTO_FEDERATION_COMPOSE_FILE = "docker-compose-logto-federation.yml";

/**
 * Raised when an env file names D2E_IDP_MODE but the value is not a mode this
 * CLI knows. Left unstamped, the CLI would append another D2E_IDP_MODE line on
 * every run (idpModeOf keeps returning undefined), and the two consumers of
 * this file would end up disagreeing about which one to honor: this CLI's own
 * /m regex matches the first D2E_IDP_MODE line, while docker compose's env
 * file parser takes the last and strips quotes. Better to stop and say so than
 * to let the CLI and the compose stack run on different opinions of the mode.
 */
export class InvalidIdpModeError extends Error {
  constructor(public readonly value: string) {
    super(
      `D2E_IDP_MODE=${JSON.stringify(value)} is not a recognised mode ` +
        `(expected "trex" or "logto-federated").`,
    );
    this.name = "InvalidIdpModeError";
  }
}

// Reads a KEY=value line, unwrapping a surrounding '...' or "..." quote and
// dropping an unquoted trailing "# comment", the same as a POSIX-ish env file
// parser (and docker compose's) would.
const lineValue = (content: string, key: string): string | undefined => {
  const m = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) return undefined;
  const v = m[1].trim();
  const quoted = v.match(/^(['"])(.*)\1$/);
  if (quoted) return quoted[2].trim();
  const hashIndex = v.indexOf("#");
  return (hashIndex === -1 ? v : v.slice(0, hashIndex)).trim();
};

export function idpModeOf(content: string): IdpMode | undefined {
  const v = lineValue(content, "D2E_IDP_MODE");
  return v === "trex" || v === "logto-federated" ? v : undefined;
}

/**
 * Decide and record the mode of an env file that does not name one yet.
 *
 * - Names a valid mode already: left exactly as it is.
 * - Names D2E_IDP_MODE with a value that is not a recognised mode (including
 *   empty): throws InvalidIdpModeError rather than silently treating the file
 *   as unstamped, which would append a conflicting D2E_IDP_MODE line on every
 *   run.
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
  const raw = lineValue(content, "D2E_IDP_MODE");
  if (raw !== undefined) {
    if (raw === "trex" || raw === "logto-federated") {
      return { mode: raw, content, added: [] };
    }
    throw new InvalidIdpModeError(raw);
  }

  const base = content.replace(/\n*$/, "\n");
  const isPreTrex = lineValue(content, "D2E_IDP") === undefined &&
    lineValue(content, "LOGTO__D2E_APP__CLIENT_SECRET") !== undefined;

  if (!isPreTrex) {
    return { mode: "trex", content: `${base}D2E_IDP_MODE=trex\n`, added: ["D2E_IDP_MODE"] };
  }

  let body = base.replace(/^USER_MGMT__ROLE_SOURCE=.*\n/m, "");
  const added: string[] = [];
  const add = (key: string, value: string, onlyIfMissing = false) => {
    if (onlyIfMissing) {
      const existing = lineValue(body, key);
      // A real, non-empty value is kept. An empty one (e.g. TREX_ROOT_KEY=
      // left blank by a partial write) is filled in rather than left to trip
      // compose's ${VAR:?...} guard with no hint of why - so drop that line
      // and fall through to appending a fresh one, instead of leaving both.
      if (existing !== undefined && existing !== "") return;
      if (existing === "") {
        body = body.replace(new RegExp(`^${key}=.*\\n`, "m"), "");
      }
    }
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
