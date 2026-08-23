# syntax=docker/dockerfile:1.4

# d2e-trex = the canonical trexsql runtime image (trex main+event eszips,
# @trex runtime, core plugins) + d2e config layered on top. d2e-specific
# main behavior is provided by ../trex's D2E_COMPAT layer (gated by env),
# not by a forked main. See docs/superpowers/specs/2026-06-20-d2e-trex-main-migration-design.md
# NOTE: trexsql has no `develop` tag — use `dev`, or pin an immutable sha-<commit>.
# Pinned to the same base develop's Dockerfile.v2 uses.
ARG TREXSQL_TAG=sha-4e75610acecd4fc08a43de2ef713bc75e872751c
FROM ghcr.io/ohdsi/trexsql:${TREXSQL_TAG}

USER root

# d2e cdw validation schema consumed by the D2E_COMPAT cdw_config_svc attach.
RUN mkdir -p /usr/src/cdw_data/built_in
COPY ./cdw_data/built_in /usr/src/cdw_data/built_in

# d2e logto worker served by the D2E_COMPAT /logto route.
COPY ./logto /usr/src/logto

# d2e's boot-time database provisioning (trex.provision plugin kind). trex
# aborts boot without it when POSTGRES_MANAGE_CONFIG is set.
COPY ./provision/d2e-bootstrap /usr/src/bundled-plugins/d2e-bootstrap

# LOCAL-TEST workaround: the trexsql base installs DuckDB extensions under
# DUCKDB_EXTENSION_DIRECTORY (/usr/share/trexsql/extensions), but worker
# connections' `LOAD <ext>` resolves against DuckDB's default ~/.duckdb path, so
# `LOAD fts` crashes the main worker. Mirror the extensions into the default path.
# (The real fix lives in ../trex/Dockerfile, applied once trexsql is rebuilt.)
RUN mkdir -p /home/node/.duckdb/extensions && \
    cp -r /usr/share/trexsql/extensions/* /home/node/.duckdb/extensions/ 2>/dev/null || true

RUN mkdir -p /var/log/d2e/audit && \
    chown -R node:node /usr/src/cdw_data /usr/src/logto /usr/src/bundled-plugins/d2e-bootstrap /home/node/.duckdb /var/log/d2e/audit
USER node

# Entrypoint + SWARM_CONFIG-driven startup are inherited from trexsql.
