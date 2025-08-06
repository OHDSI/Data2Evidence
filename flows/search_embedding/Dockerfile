ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim AS python-dependencies-build

ARG PLUGIN_FOLDER=search_embedding

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    libpq-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean


COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /uvx /bin/

WORKDIR /app

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

# Install dependencies with uv into /app/venv
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=./${PLUGIN_FOLDER}/uv.lock,target=uv.lock \
    --mount=type=bind,source=./${PLUGIN_FOLDER}/pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-editable --no-dev
FROM python:${PYTHON_VERSION}-slim AS runtime

ARG USER=docker
ENV USER=${USER}
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER}


RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq5 \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean


WORKDIR /app

COPY --from=python-dependencies-build --chown=docker:docker /app/.venv .venv

# Create folder to store duckdb extensions for offline plugins
# Version must match duckdb in requirements.txt
ENV duckdb_version=1.2.1
RUN mkdir -p /app/duckdb_extensions
WORKDIR /app/duckdb_extensions
RUN wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/postgres_scanner.duckdb_extension.gz \
    && wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/fts.duckdb_extension.gz \
    && wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/vss.duckdb_extension.gz \
    && gzip -d postgres_scanner.duckdb_extension.gz \
    && gzip -d fts.duckdb_extension.gz \
    && gzip -d vss.duckdb_extension.gz


WORKDIR /app

# Change owner of duckdb_data to align with create_cachedb_plugin
RUN groupadd alp && \
    adduser docker alp && \
    mkdir -p ./duckdb_data && \
    chown -R docker:alp ./duckdb_data


COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker ./__init__.py .
COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./search_embedding flows

ENV PATH="/app/.venv/bin:$PATH"

USER docker