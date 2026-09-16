## Getting Started on local

1. Ensure D2E docker containers are running.
2. Pull the latest base flow image `docker pull ghcr.io/ohdsi/d2e/flow-base:develop`. If local flow changes exists build the image instead.
3. Clone `.env.example` to `.env` and update the value if needed accordingly
4. Initialize
```bash
	npm install
	npm run init
```

5. Disable IPv6 to prevent `ERR_NETWORK_CHANGED` errors during tests (caused by Docker container operations triggering IPv6 ADDRCONF events that Chromium interprets as network changes):
```bash
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
```
This takes effect immediately (no restart needed) and resets on reboot.

6. Run all tests - `npm test`
7. Run / Generate screenshot for a specific test - `npm test tests/e2e/tests/01-example.spec.ts`
8. Rerun last failed tests only - `npm run test-last-failed`

## IDP auth-provider harness (`tests/02-users/idp/`)

An e2e spec per authentication path, each asserting the JWT claim contract that WebAPI,
Atlas3 and usermgmt depend on (`roles`, `preferred_username`/`username`, `email`, `iss`/`aud`)
plus its path-specific extras. This is the regression baseline any future `D2E_IDP=trex`
cutover must re-pass unchanged — re-run these against a Trex stack and the failing assertions
are the exact gap list.

| Spec | Path | Runs |
|---|---|---|
| `idp/logto-native.spec.ts` | Logto username/password | always (CI baseline, no upstream) |
| `idp/entra-external-id.spec.ts` | Entra External ID (CIAM) | when its `E2E_*` creds + connector are set |
| `idp/entra.spec.ts` | Azure AD (Entra) | when its `E2E_*` creds + connector are set |
| `idp/physionet.spec.ts` | PhysioNet OIDC | when its `E2E_*` creds + connector are set |

The three connector specs **self-skip with a logged reason** unless their `E2E_*` vars are set;
they also require the matching Logto connector to be configured in the running stack
(`LOGTO__CONNECTOR_CONFIG` + `LOGTO__SOCIAL_SIGNIN_TARGETS`, and for PhysioNet the
`USERMGMT__ENTITLEMENTS_*` / auto-provision vars). Only one `LOGTO__CONNECTOR_CONFIG` can be
active at a time, so each path has its own env file.

### Per-path env files

Each path has a `.env.<path>.example` template. Copy it to `.env.<path>` (gitignored), fill in
the `E2E_*` login, and run its script — the script sets `E2E_ENV_FILE` so that file is loaded:

```bash
cp .env.logto-native.example .env.logto-native   && npm run test:idp:logto
cp .env.entra-external-id.example .env.entra-external-id && npm run test:idp:entra-external-id
cp .env.entra.example .env.entra                 && npm run test:idp:entra
cp .env.physionet.example .env.physionet         && npm run test:idp:physionet
```

Each file has two parts: the **stack** block (FYI — the `LOGTO__*`/`ENTRA*`/`USERMGMT__*`
connector config to apply at the repo root and restart logto+post-init; the values already
exist in repo-root `.env.local`) and the **test** block (`D2E_BASE_URL` + the `E2E_*` login the
spec reads). `E2E_ENV_FILE` is resolved relative to `tests/e2e/`; it's loaded before `.env`, so
a plain `.env` still fills in anything a provider file omits.

- Baseline in CI: `docker-build-push.yaml` → `test_demosetup_dev` runs `npm test`, which picks
  up `idp/logto-native.spec.ts` on every PR.
- Gated specs in CI: set the `E2E_*` repo secrets and boot a stack with the connector applied;
  the `e2e tests` step already forwards those secrets into the test container.