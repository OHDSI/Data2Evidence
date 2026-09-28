import { normalizeEndSessionEndpoint } from "./endSessionEndpoint";

const withEndpoint = (endpoint: unknown) => ({
  client_id: "d2e-webapi",
  scope: "openid profile email offline_access",
  authority_configuration: {
    issuer: "https://localhost/trex/oidc",
    authorization_endpoint: "https://localhost/trex/oidc/oauth2/authorize",
    end_session_endpoint: endpoint,
  },
});

const endpointOf = (config: any) => config.authority_configuration.end_session_endpoint;

describe("normalizeEndSessionEndpoint", () => {
  // The exact value trex served when the logout broke, reproduced verbatim so a
  // change to the query's shape cannot quietly stop matching.
  it("strips the query trex attaches to its own end-session endpoint", () => {
    const config = withEndpoint(
      "https://localhost/trex/oidc/oauth2/end-session" +
        "?client_id=d2e-webapi&redirect=https://localhost/d2e/portal"
    );

    expect(endpointOf(normalizeEndSessionEndpoint(config))).toBe(
      "https://localhost/trex/oidc/oauth2/end-session"
    );
  });

  // The whole point: whatever the library appends has to arrive as a parameter
  // of its own. Asserting the parsed query rather than the string, because the
  // string looked plausible in the logs while parsing to the wrong thing.
  it("leaves the appended hint readable as its own parameter", () => {
    const config = withEndpoint(
      "https://localhost/trex/oidc/oauth2/end-session" +
        "?client_id=d2e-webapi&redirect=https://localhost/d2e/portal"
    );

    const normalized = endpointOf(normalizeEndSessionEndpoint(config));
    const url = new URL(`${normalized}?id_token_hint=abc.def.ghi`);

    expect(url.searchParams.get("id_token_hint")).toBe("abc.def.ghi");
  });

  // Without this, the fix would silently break the IdP that works today.
  it("leaves Logto's endpoint and its query alone", () => {
    const logto =
      "https://localhost/oidc/session/end" +
      "?client_id=d2e-app&redirect=https://localhost/d2e/portal";

    expect(endpointOf(normalizeEndSessionEndpoint(withEndpoint(logto)))).toBe(logto);
  });

  it("leaves a trex endpoint that already has no query alone", () => {
    const bare = "https://localhost/trex/oidc/oauth2/end-session";

    expect(endpointOf(normalizeEndSessionEndpoint(withEndpoint(bare)))).toBe(bare);
  });

  it("does not mutate the config it is given", () => {
    const config = withEndpoint(
      "https://localhost/trex/oidc/oauth2/end-session?client_id=d2e-webapi"
    );

    normalizeEndSessionEndpoint(config);

    expect(endpointOf(config)).toBe(
      "https://localhost/trex/oidc/oauth2/end-session?client_id=d2e-webapi"
    );
  });

  // env.js is a remote value: a malformed one must not take the whole app down
  // at module scope, which is where this runs.
  it.each([
    ["a missing authority_configuration", {}],
    ["a null config", null],
    ["a non-string endpoint", withEndpoint(42)],
    ["an absent endpoint", withEndpoint(undefined)],
  ])("returns %s unchanged", (_label, config) => {
    expect(() => normalizeEndSessionEndpoint(config)).not.toThrow();
    expect(normalizeEndSessionEndpoint(config)).toBe(config);
  });
});
