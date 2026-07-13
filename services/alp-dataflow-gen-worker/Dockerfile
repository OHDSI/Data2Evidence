# syntax=docker/dockerfile:1
# D2E dataflow process worker: generic base (pixi + prefect) with a baked warm
# cache of the release's bundled flow plugins. Flow envs are pixi projects
# provisioned from plugin artifacts (see run-flow.sh / provision-envs.sh);
# installing or updating a flow plugin never requires rebuilding this image.
#
# Build topology: each group provisions in its own stage so BuildKit runs them
# in parallel (renv installs are sequential per package, so a single group
# leaves most cores idle — overlap across groups is where wall-clock goes).
# env-hades alone is serialized behind env-base: both compile the bundled
# duckdb C++ (as does data_transformation), and three concurrent duckdb
# builds exhaust a 16GB runner. Cache granularity is unchanged: editing one
# group's sources/locks rebuilds only its stage. Trade-off carried over from
# the layered layout: pixi-cache hardlinks dedupe only within a stage; the
# final COPY materializes full copies. Build-time wins over image size here.

FROM ubuntu:24.04 AS staging
RUN apt-get update && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*
COPY plugins/flows/build /src/plugins/flows/build
COPY plugins/flows/_shared_flow_utils /src/plugins/flows/_shared_flow_utils
COPY plugins/flows/__init__.py /src/plugins/flows/__init__.py
# stage_group <repo-group-dir> <npm-short-name>: same staged layout the npm
# tarball ships (stage_package.sh is the single source of truth), so baked and
# artifact-delivered plugins are byte-identical.
COPY <<'EOF' /usr/local/bin/stage_group
#!/bin/sh
set -eu
g="$1"; short="$2"
cd "/src/plugins/flows/$g"
bash ../build/stage_package.sh
dest="/staged/$short/baked"; mkdir -p "$dest"
cp -a flows _shared_flow_utils __init__.py pyproject.toml pixi.lock "$dest/"
for extra in renv.lock setup_assets.sh setup_r.sh rprofile_java.R; do
  [ -f "$extra" ] && cp "$extra" "$dest/" || true
done
EOF
RUN chmod +x /usr/local/bin/stage_group
COPY plugins/flows/loyalty_score /src/plugins/flows/loyalty_score
RUN stage_group loyalty_score loyalty-score-flow
COPY plugins/flows/i2b2 /src/plugins/flows/i2b2
RUN stage_group i2b2 i2b2-flow
COPY plugins/flows/data_management /src/plugins/flows/data_management
RUN stage_group data_management data-management-flow
COPY plugins/flows/search_embedding /src/plugins/flows/search_embedding
RUN stage_group search_embedding search-embedding-flow
COPY plugins/flows/base /src/plugins/flows/base
RUN stage_group base d2e-flows
COPY plugins/flows/hades /src/plugins/flows/hades
RUN stage_group hades hades-flow
COPY plugins/flows/data_transformation /src/plugins/flows/data_transformation
RUN stage_group data_transformation data-transformation-flow

# Shared base for the env-build stages and the final image: same apt set and
# pixi binary everywhere, so envs compile in exactly the runtime they run in.
FROM ubuntu:24.04 AS runtime-base
ARG PIXI_VERSION=0.72.2
ENV PIXI_CACHE_DIR=/opt/pixi/cache \
    D2E_FLOWS_CACHE=/var/lib/d2e-flows \
    PATH=/usr/local/bin:$PATH
# xvfb: required by white_rabbit_plugin (Java AWT headless display) and not
# available on conda-forge — the one flow-specific apt package.
# git: pixi/uv fetch direct git dependencies (data_transformation's ner env)
# during provisioning, before any env exists that could provide it.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl git python3 xvfb \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL "https://github.com/prefix-dev/pixi/releases/download/v${PIXI_VERSION}/pixi-x86_64-unknown-linux-musl" \
        -o /usr/local/bin/pixi && chmod +x /usr/local/bin/pixi

FROM runtime-base AS provisioner
COPY services/alp-dataflow-gen-worker/provision-envs.sh /app/provision-envs.sh
RUN chmod 755 /app/provision-envs.sh

# One stage per group. Independent stages build concurrently on one builder,
# so per-stage MAKEFLAGS stays modest (-j2) to share cores/memory fairly;
# env-hades runs after env-base (see header) and gets the whole machine.
FROM provisioner AS env-loyalty-score
COPY --from=staging /staged/loyalty-score-flow /var/lib/d2e-flows/loyalty-score-flow
RUN MAKEFLAGS=-j2 /app/provision-envs.sh --dir /var/lib/d2e-flows/loyalty-score-flow/baked

FROM provisioner AS env-i2b2
COPY --from=staging /staged/i2b2-flow /var/lib/d2e-flows/i2b2-flow
RUN MAKEFLAGS=-j2 /app/provision-envs.sh --dir /var/lib/d2e-flows/i2b2-flow/baked

FROM provisioner AS env-data-management
COPY --from=staging /staged/data-management-flow /var/lib/d2e-flows/data-management-flow
RUN MAKEFLAGS=-j2 /app/provision-envs.sh --dir /var/lib/d2e-flows/data-management-flow/baked

FROM provisioner AS env-search-embedding
COPY --from=staging /staged/search-embedding-flow /var/lib/d2e-flows/search-embedding-flow
RUN MAKEFLAGS=-j2 /app/provision-envs.sh --dir /var/lib/d2e-flows/search-embedding-flow/baked

FROM provisioner AS env-base
COPY --from=staging /staged/d2e-flows /var/lib/d2e-flows/d2e-flows
RUN MAKEFLAGS=-j2 /app/provision-envs.sh --dir /var/lib/d2e-flows/d2e-flows/baked

FROM provisioner AS env-data-transformation
COPY --from=staging /staged/data-transformation-flow /var/lib/d2e-flows/data-transformation-flow
RUN MAKEFLAGS=-j2 /app/provision-envs.sh --dir /var/lib/d2e-flows/data-transformation-flow/baked

FROM provisioner AS env-hades
# Serialize behind env-base (memory headroom for hades' own duckdb/JVM
# compiles); the marker COPY is the dependency edge.
COPY --from=env-base /var/lib/d2e-flows/d2e-flows/baked/.d2e-env-ready /tmp/.env-base-done
COPY --from=staging /staged/hades-flow /var/lib/d2e-flows/hades-flow
# Secret mount, not a build-arg: the token differs per CI run and an ARG would
# poison this stage's cache key (registry cache would never hit).
RUN --mount=type=secret,id=github_pat \
    MAKEFLAGS="-j$(nproc)" GITHUB_PAT="$(cat /run/secrets/github_pat 2>/dev/null || true)" \
    /app/provision-envs.sh --dir /var/lib/d2e-flows/hades-flow/baked

FROM runtime-base
# The worker's own Prefect environment (also pixi-managed, lockfile-pinned).
COPY services/alp-dataflow-gen-worker/pyproject.toml services/alp-dataflow-gen-worker/pixi.lock /opt/worker/
RUN pixi install --locked --manifest-path /opt/worker/pyproject.toml

COPY services/alp-dataflow-gen-worker/run-flow.sh services/alp-dataflow-gen-worker/provision-envs.sh /app/
COPY services/alp-dataflow-gen-worker/entrypoint.sh /entrypoint.sh
COPY plugins/flows/drivers /app/inst/drivers/
RUN chmod 755 /app/run-flow.sh /app/provision-envs.sh /entrypoint.sh

# Baked warm cache: release plugins provisioned at build so fresh workers are
# instant and offline-capable; runtime artifact updates land beside them.
COPY --from=env-loyalty-score /var/lib/d2e-flows/loyalty-score-flow /var/lib/d2e-flows/loyalty-score-flow
COPY --from=env-i2b2 /var/lib/d2e-flows/i2b2-flow /var/lib/d2e-flows/i2b2-flow
COPY --from=env-data-management /var/lib/d2e-flows/data-management-flow /var/lib/d2e-flows/data-management-flow
COPY --from=env-search-embedding /var/lib/d2e-flows/search-embedding-flow /var/lib/d2e-flows/search-embedding-flow
COPY --from=env-base /var/lib/d2e-flows/d2e-flows /var/lib/d2e-flows/d2e-flows
COPY --from=env-hades /var/lib/d2e-flows/hades-flow /var/lib/d2e-flows/hades-flow
COPY --from=env-data-transformation /var/lib/d2e-flows/data-transformation-flow /var/lib/d2e-flows/data-transformation-flow

WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]
