# Internal-TLS smoke tests

Fast checks that internal service-to-service TLS is actually being verified. Read-only —
probes a running stack and changes nothing.

```sh
npm run start                    # a running stack is the only prerequisite
./tests/tls/tls-smoke.sh
```

Exit 0 = all checks passed, 1 = at least one failed, 2 = could not run (no docker, or the
probe container isn't up).

## What it covers

**A. Every internal TLS endpoint verifies both the chain and the hostname.**

Endpoints are discovered from `docker-compose.yml` / `docker-compose-local.yml` by matching
`https://${PROJECT_NAME…}-<svc>.${TLS__INTERNAL__DOMAIN…}:<port>`, so the list cannot rot as
services move. Each is dialled from inside the network with:

```sh
openssl s_client -connect <host>:<port> -servername <host> \
  -verify_hostname <host> -verify_return_error -CAfile <internal CA>
```

`-verify_hostname` is the load-bearing flag. Without it, `openssl s_client` checks nothing —
`-servername` only sets SNI — so a certificate whose SAN does not cover the name being dialled
would appear to pass. That exact mismatch (SAN `*.d2e.local` vs hostnames on `alp.local`) is
the failure this group exists to catch.

A **negative control** dials a real endpoint while verifying a name the certificate cannot
cover, and requires that to be *rejected*. If the control ever passes, the other results in
group A are meaningless and the suite fails.

Endpoints that don't resolve or refuse the connection are reported `SKIP`, not `FAIL` — they
are simply not deployed in the active compose profile.

The number of endpoints therefore varies by branch and profile: a branch that moves more
services onto internal TLS will have more of them. A run that discovers nothing, or reaches
nothing, reports skips rather than a false pass — and the negative control is skipped too,
since there is nothing reachable to prove the checks against.

**B. Nothing disables TLS verification.**

- No running container carries `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- No compose file or Helm chart sets it either, so it's caught before anything starts.

Host-side helper scripts (`scripts/setupdemo.mjs` and friends) do set that variable. They run
on a developer's machine rather than in the platform, so they're printed as a `NOTE` and do
not fail the run.

## What it deliberately does not cover

- **`rejectUnauthorized: false` in code.** Most occurrences are Postgres SSL under
  `sslmode=require`, where encrypting without verifying is libpq's defined behaviour rather
  than a defect — plus vendored `node_modules` defaults. Separating real bypasses from correct
  ones needs per-call-site judgement, not a grep.
- **Application-level behaviour** over these connections (OIDC discovery, file downloads).
  A verified handshake is necessary but not sufficient; those belong in the integration tests.
- **Certificate hygiene** beyond what verification implies — expiry windows, key sizes,
  algorithm choice.

## Configuration

Values are read from `.env.local`, else `.env`, and can be overridden by the environment:

| Variable | Default | Purpose |
|---|---|---|
| `PROJECT_NAME` | `d2e` | Container name prefix |
| `TLS__INTERNAL__DOMAIN` | `d2e.local` | Internal DNS domain the certificate must cover |
| `PROBE_CONTAINER` | `${PROJECT_NAME}-trex` | Container the probes run from |
| `CA_IN_PROBE` | `/usr/src/cert/ca.pem` | Internal CA path inside that container |

Pass a specific env file with `-n <file>`.
