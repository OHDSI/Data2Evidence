# `@d2e/connector-physionet-oidc`

D2E fork of [`@logto/connector-oidc`](https://github.com/logto-io/logto/tree/master/packages/connectors/connector-oidc)
that exposes the upstream IdP's access/refresh tokens to Logto's
JWT customizer.

## Why

The standard `connector-oidc` discards the OAuth2 access_token from the
upstream IdP after extracting and verifying the id_token. d2e needs that
upstream access_token to call PhysioNet's
`/api/v1/entitlements/accessible-projects/` API on behalf of the user, so
alp-usermgmt can reconcile `STUDY_RESEARCHER` memberships against
PhysioNet's view of the user's dataset access.

This fork adds a 6-line write to `globalThis.tokenMap` /
`globalThis.refreshTokenMap` keyed on the user's primaryEmail (or sub
when email is unavailable) — mirroring what `connector-alp-azuread`
already does for Microsoft Entra federation. Logto's
`packages/core/src/libraries/jwt-customizer.ts` then reads those globals
via `extra.thirdPartyToken` / `extra.thirdPartyRefreshToken` and the
`LOGTO__CUSTOM_JWT` script in `docker-compose.yml` emits them as
`physionet_access_token` / `physionet_refresh_token` claims on every
access token d2e mints.

## Identity

| | Value |
|---|---|
| `metadata.id` | `physionet-oidc` |
| `metadata.target` | `physionet` |
| `connectorId` (for `POST /api/connectors`) | `physionet-oidc` |

When registering the connector via `LOGTO__CONNECTOR_CONFIG`, set
`connectorId: "physionet-oidc"` (NOT `"oidc"`), and set
`LOGTO__SOCIAL_SIGNIN_TARGETS=physionet` so the sign-in button renders.

## Diff from upstream `@logto/connector-oidc`

Apart from the metadata id/target/name rename, exactly one functional
change: `src/index.ts` destructures `access_token` + `refresh_token`
from the token endpoint response and writes them to
`globalThis.tokenMap[email || sub]` / `globalThis.refreshTokenMap[…]`
right before returning the user info. Search this directory for
`d2e fork` to find the inserted blocks.

## Build

This package mirrors upstream's tsup build. The compiled `lib/` ships
baked into the `logto` image — there is **no** bind mount for it in
`docker-compose-local.yml`, so editing `lib/` here changes nothing until
the image is rebuilt, and the two can drift apart silently.

To rebuild after editing `src/`:

```sh
cd services/alp-logto/connector-physionet-oidc
pnpm install
pnpm build      # emits to ./lib
```

The compiled `lib/` is checked into the repo alongside `src/`, so commit
it with any `src/` change and rebuild the image to pick it up.

## License

MPL-2.0 (inherited from the upstream Logto OSS package this is forked
from).
