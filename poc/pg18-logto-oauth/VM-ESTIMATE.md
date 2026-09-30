# Jupyter VM with Terraform: work breakdown and estimate

Target: a new Jupyter VM provisioned with Terraform, next to the existing D2E VM and the
existing PostgreSQL VM (PostgreSQL 15). Users log in to JupyterHub through D2E's IdP and
reach their datasets in PostgreSQL with their own token, as proven in this PoC.

## Assumptions

- Azure (the repo only implies Azure: Helm ingress class, Flexible Server comments).
- No infrastructure code exists in the repo today (no Terraform, Ansible or cloud-init),
  so the Terraform base starts from zero.
- One engineer who knows D2E; days are working days including testing, not calendar time.
- Access to the existing D2E and PostgreSQL VMs, DNS and certificates is available.

## Findings that drive the estimate

- All D2E PostgreSQL today is 15 (`postgres:15-alpine`). There is no major-upgrade
  tooling and no D2E test run on 16–18. The only extension used is `uuid-ossp`; the
  managed-Postgres bootstrap needs Supabase roles, not extensions.
- PostgreSQL 18 needs one added library, `pg_oidc_validator` (Percona packages exist for
  Debian/Ubuntu/RHEL). No patch to PostgreSQL itself.
- Logto's issuer is an internal hostname; tokens would fail validation on another VM.
- The role store is moving to trex's OIDC provider; its tokens are not yet verified with
  the validator.
- No released Python driver supports PG18 OAuth; notebooks need libpq 18 plus a small
  hook helper (done in this PoC).

## Work breakdown

| # | Work item | Days |
| --- | --- | --- |
| 1 | Terraform base: provider, remote state, resource group, VNet/subnets, NSGs, Jupyter VM module, cloud-init, DNS record | 3–5 |
| 2 | Jupyter VM bootstrap: rootless Docker, hub compose/systemd, TLS reverse proxy, data volumes, image registry pull | 3–4 |
| 3 | IdP integration across VMs: public HTTPS issuer (Logto `ENDPOINT` or trex OIDC), hub app registration, callback, CA trust; verify trex tokens with the validator | 2–4 |
| 4a | **Option A:** upgrade the existing PostgreSQL VM 15 → 18: rehearsal with `pg_dumpall`/`pg_upgrade`, D2E regression on 18, downtime window, rollback plan | 5–8 |
| 4b | **Option B:** keep 15 for D2E, add a separate PostgreSQL 18 for Jupyter-readable data (copy or foreign tables) | 2–3 |
| 5 | `pg_oidc_validator` on the target OS, `hostssl` only, firewall: 5432 from the Jupyter VM only | 2–3 |
| 6 | Dataset → PostgreSQL automation: `<schema>_jupyter` login role, `pg_hba` line, reload, in the dataset flow | 4–6 |
| 7 | Hub: request dataset scopes from the portal list, token refresh, notebook image (libpq 18 + `pg_oauth`) | 2–3 |
| 8 | Hardening: notebook egress limits, resource limits, backups of hub and user volumes, monitoring/alerts | 3–5 |
| 9 | End-to-end test (grant, login, query, revoke), runbook, handover | 2–3 |

| Total | Days | Weeks (one engineer) |
| --- | --- | --- |
| Option A: upgrade the PostgreSQL VM to 18 | 26–41 | about 5–8 |
| Option B: separate PostgreSQL 18 | 23–36 | about 5–7 |

## Risks that can move the estimate

- **trex OIDC tokens** may lack a `scope` claim or a JWT format the validator accepts;
  that could need a custom validator (+3–5 days).
- **PostgreSQL 18 regressions in D2E** (option A) are unknown until a full regression run.
- **Static `pg_hba`** per dataset may be rejected by operations; a custom validator with
  `delegate_ident_mapping` is the fallback (+3–5 days).
- **Python driver support** may land in psycopg 3.4 and replace the ctypes helper; low risk,
  small saving.

## Suggested order

1 → 3 → 5 (on option B first, lowest risk) → 7 → 6 → 2 → 8 → 9, and option A later as a
separate upgrade project once D2E is regression-tested on PostgreSQL 18.
