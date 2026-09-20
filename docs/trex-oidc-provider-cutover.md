# Releasing the trex OIDC provider cutover

trex's OpenID Connect provider is now `@better-auth/oauth-provider` instead of a
hand-rolled authorization server. Its four protocol endpoints moved and were not
aliased back. This page is the release procedure; read it before shipping the
D2E half.

## It is three artifacts, not two

1. **This d2e branch** — the relying parties' configuration
   (`docker-compose.yml`, the charts), the sign-in page under
   `plugins/atlas/d2e-login/`, the Caddy `X-Forwarded-For` fix, and the
   discovery golden file.
2. **A published `ghcr.io/ohdsi/trexsql` image built from the trex branch.**
3. **A `TREXSQL_REF` bump in d2e, in both places that pin it:**
   - `services/trex/Dockerfile.v2` — the `ARG TREXSQL_REF` default (lean/prod),
   - `docker-compose-local.yml` — the devx pin under the `trex` build args.

   They pin two different refs and both must move.

The third is the one that gets missed, because `npm run build -- -s trex` reads
like it builds trex and does not. It builds d2e's own thin layer, which is
`FROM ghcr.io/ohdsi/trexsql:${TREXSQL_REF}` and, as `Dockerfile.v2` says in its
own header, deliberately does **not** vendor trex's core. So a d2e branch merged
on its own changes no trex code at all.

## The order: the trex image first, always

**Do not deploy d2e ahead of the trex image.**

The sign-in page decides where to send the browser after sign-in by looking for
the `sig` parameter of the provider's signed authorization request
(`plugins/atlas/d2e-login/providers.js`, `bounceQuery`), and falls back to
`/atlas/` when there is none. A pre-cutover trex sends `return_to` instead, so a
d2e-first deploy signs users in and then drops them on `/atlas/` with the
authorization request thrown away.

The reverse order is safe: a new trex against an old d2e keeps working, because
the old page ignores the extra parameters.

This is also checked mechanically — CI diffs the served discovery document
against `tests/golden/trex-oidc-discovery.json`, and a pre-cutover trex serves
the old endpoints, so a d2e change that lands ahead of its trex image fails in
CI rather than at a user's sign-in.

## What breaks at the moment the new image starts

`GET /trex/oidc/authorize`, `POST /trex/oidc/token` and
`GET /trex/oidc/session/end` return **404**. The replacements are
`/trex/oidc/oauth2/authorize`, `/trex/oidc/oauth2/token` and
`/trex/oidc/oauth2/end-session`. The issuer, the discovery document's path,
`/trex/oidc/.well-known/jwks.json`, `RS256` and the `roles` claim name are all
unchanged, so anything that reads its configuration from discovery needs no
change.

Callers in this repository were moved in the same branch, including
`scripts/lib/idp-login.cjs`. Anything outside it that hard-codes the old paths
has to move with the image.

## Also on the checklist

- **`develop.d2e.sg`'s `ENV_YML` secret** is a change to a shared deployed
  environment and is not made by this branch. It is still owed.
- **Internal certificates:** where the gateway serves one (`tls internal`), put
  Caddy's root into `TLS__EXTRA__CA_CRTS` so RP-initiated logout with an
  `id_token_hint` completes. On a stack whose public name is `localhost` it
  cannot be made to work at all — glibc special-cases the name — and trex now
  reports the failure (an `X-Trex-Logout-Hint` header and a banner) instead of
  showing a bare confirmation page.
- **Recovery is a database snapshot restore.** The previous provider's tables
  (`oidc_signing_key`, `oidc_client`, `oidc_authorization_code`) are left in
  place on purpose so rolling back to the previous image stays a live option.

The measurements behind all of this are in the trex repository, at
`core/server/auth/oidc/CUTOVER-REHEARSAL.md`; the provider's operator-facing
documentation is at `plugins/docs/docs/concepts/auth-model.md`.
