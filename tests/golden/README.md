# Golden files

A golden file is a byte-for-byte copy of something a running stack serves, kept
under version control so CI can diff the live answer against it. A failing diff
is not a test bug: it means the served artefact changed, and the file is updated
in the same commit as the change that caused it.

## `trex-oidc-discovery.json`

`GET /trex/oidc/.well-known/openid-configuration` — the OpenID Connect discovery
document trex's `@better-auth/oauth-provider` serves.

It is pinned because endpoint or issuer drift breaks both relying parties
**silently**: WebAPI reads this document at startup
(`SECURITY_AUTH_OIDC_URL`, `docker-compose.yml`) and Atlas3 signs in *through*
WebAPI, so a moved endpoint surfaces as `#/welcome?error=oidc_failed` with
nothing in either log that names the cause.

Diffed by `.github/workflows/_test-http-duckdb.yml`.

### Normalisation

Every occurrence of the gateway origin is rewritten to the literal
`{{ISSUER_ORIGIN}}`, so the file is the same on a `:41100` local stack, on CI
and on a deployment with a real FQDN. Nothing else is rewritten: the `/trex/oidc`
path prefix is part of the contract and stays.

### Regenerating

Against a stack whose gateway is on `$PORT`:

```bash
curl -sk "https://localhost:${PORT}/trex/oidc/.well-known/openid-configuration" \
  | jq -S "walk(if type == \"string\"
                then sub(\"https://localhost:${PORT}\"; \"{{ISSUER_ORIGIN}}\")
                else . end)" \
  > tests/golden/trex-oidc-discovery.json
```

**macOS `curl` cannot do this.** LibreSSL 3.3.6 fails the handshake against
Caddy's `tls internal` certificate (`CRYPTO_internal:bad decrypt`) and every
`curl -sk` returns exit 7 / HTTP 000. This copy was captured from inside the
container instead, which bypasses the gateway and its certificate entirely while
serving the same document — the endpoint URLs come from `TREX_OIDC_ISSUER`, not
from the request:

```bash
docker exec d2e-trex curl -s http://localhost:33001/trex/oidc/.well-known/openid-configuration
```

CI runs on Linux with an OpenSSL `curl`, where the first form works.

## What this document claims that the deployment does not deliver

Read this before handing the document to a new relying party.

### `backchannel_logout_supported: true` — advertised, unreachable

The document advertises OpenID Connect Back-Channel Logout and D2E cannot
deliver it. The mechanism is real — `@better-auth/oauth-provider` signs a Logout
Token per affected client on session deletion and POSTs it to that client's
registered `backchannel_logout_uri` — but **only to a client that has one**, and
in trex no client can:

- `core/server/auth/oidc/seed-client.ts` writes no `backchannelLogoutUri` and
  reads no environment variable for one;
- dynamic client registration is off (`allowDynamicClientRegistration` defaults
  false) and `clientPrivileges: () => false` refuses every client-administration
  call, so a relying party cannot register one for itself either;
- `oidc/mount.ts` 404s `/admin/oauth2/*` besides.

So a relying party that reads this flag and waits for a Logout Token waits
forever, and its session outlives the trex one.

**It cannot be switched off.** The plugin derives both flags from a single
expression, `backchannelSupported = !overrides?.jwt_disabled`
(`@better-auth/oauth-provider@1.7.5 dist/authorize-riRRCSbC.mjs:689`), and the
only option that changes it is `disableJwtPlugin`, which would also drop
`jwks_uri` and take `id_token_signing_alg_values_supported` from `RS256` to
`HS256` — i.e. break every sign-in to correct one advertisement. The
`advertisedMetadata` option accepts exactly two keys, `scopes_supported` and
`claims_supported` (`dist/oauth-1Ud-hvZY.d.mts:1738`), and a provider extension's
`metadata()` contribution is merged with `if (!(key in next))`
(`dist/utils-CWjOhEQb.mjs:197`), so it can only add keys, never correct one.
Rewriting the document in trex's own mount was rejected: hand-serving discovery
is precisely the custom code the plugin was adopted to delete.

**So the served document is pinned as served, flag included, and the gap is
recorded here.** If back-channel logout is ever wanted, the work is a
`backchannel_logout_uri` on the seeded client — at which point the advertisement
becomes true and this note goes away.

### `claims_supported` does not list `roles`

Deliberate — it reproduces the list trex advertised before the cutover — but
worth knowing: the id_token and the access token both carry `roles` and
`app_metadata`, which this list omits. WebAPI is configured for it explicitly
(`SECURITY_AUTH_OIDC_ROLESCLAIM=roles`) rather than discovering it.

### `userinfo_endpoint` emits no `roles`

`/oauth2/userinfo` returns `{sub, name, email, email_verified, trex_role}` and
nothing else. It is nonetheless on the critical path of every WebAPI sign-in —
a failure there fails the login outright — so anything that resolves roles from
the UserInfo document alone sees none.
