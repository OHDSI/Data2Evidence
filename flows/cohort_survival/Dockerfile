ARG PYTHON_VERSION=3.12
ARG R_VERSION=4.4.3

FROM rocker/r-ver:${R_VERSION} AS python-dependencies-build

# RUN apt-get update && \
#     apt-get install -y --no-install-recommends \
#     ca-certificates \
#     cmake \
#     curl \
#     dirmngr \
#     ed \
#     gcc \
#     git \
#     less \
#     libbz2-dev \
#     libcairo2-dev \
#     libcurl4-gnutls-dev \
#     libfontconfig1-dev \
#     libfreetype6-dev \
#     libfribidi-dev \
#     libgit2-dev \
#     libharfbuzz-dev \
#     libicu-dev \
#     libjpeg-dev \
#     libpng-dev \
#     libpq-dev \
#     libprotobuf-dev \
#     libsodium23 libsodium-dev libsecret-tools \
#     libssh2-1-dev \
#     libssl-dev \
#     libtiff-dev \
#     libxml2-dev \
#     libxt-dev \
#     locales \
#     openssh-client \
#     protobuf-compiler \
#     software-properties-common \
#     sqlite3 \
#     vim-tiny \
#     wget \
#     && apt-get clean --yes \
#     && rm -rf /var/lib/apt/{apt,dpkg,cache,log}/

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    cmake \
    gcc \
    g++ \
    software-properties-common \
    # To build psycopg2-binary
    libpq-dev \
    # To build rpy2
    liblzma-dev \
    libdeflate-dev \
    libcairo2-dev \
    libssl-dev \
    libxml2-dev \
    && apt-get clean --yes \
    && rm -rf /var/lib/apt/{apt,dpkg,cache,log}/

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    # UV_PYTHON_DOWNLOADS=manual
    # Install managed python which will be copied over to runtime build
    UV_PYTHON_INSTALL_DIR=/app/python \
    UV_PYTHON_PREFERENCE=only-managed

COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /uvx /bin/
RUN uv python install ${PYTHON_VERSION}

WORKDIR /app

# Install dependencies with uv into a venv
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=./cohort_survival/uv.lock,target=uv.lock \
    --mount=type=bind,source=./cohort_survival/pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev --no-editable

    # To check on installation of rpy2:
    # uv sync --all-groups
    # ENV PATH="/app/.venv/bin:$PATH"
    # pytest --pyargs 'rpy2.tests'

FROM rocker/r-ver:${R_VERSION} AS r-dependencies-build

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    cmake \
    curl \
    dirmngr \
    ed \
    gcc \
    git \
    less \
    libbz2-dev \
    libcairo2-dev \
    libcurl4-gnutls-dev \
    libfontconfig1-dev \
    libfreetype6-dev \
    libfribidi-dev \
    libgit2-dev \
    libharfbuzz-dev \
    libicu-dev \
    libjpeg-dev \
    libglpk-dev \
    libpng-dev \
    libpq-dev \
    libprotobuf-dev \
    libsodium23 libsodium-dev libsecret-tools \
    libssh2-1-dev \
    libssl-dev \
    libtiff-dev \
    libxml2-dev \
    libxt-dev \
    locales \
    openssh-client \
    protobuf-compiler \
    software-properties-common \
    vim-tiny \
    libnode-dev \
    xz-utils \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

ENV R_REMOTES_UPGRADE="always"

WORKDIR /app

COPY ./cohort_survival/renv.lock ./build/.Rprofile ./build/install_and_verify_r_packages.R /app/

# Install R depdendencies in global library
ARG REQUIRED_R_PACKAGES="CDMConnector PatientProfiles CohortSurvival RPostgres duckdb visOmopResults omopgenerics"
RUN chmod +x /app/install_and_verify_r_packages.R && \
    /app/install_and_verify_r_packages.R "$REQUIRED_R_PACKAGES" && \
    rm -f /app/renv.lock /app/.Rprofile /app/install_and_verify_r_packages.R

FROM r-dependencies-build AS runtime

ARG DUCKDB_VERSION=1.2.1
ARG DUCKDB_EXTENSIONS="postgres_scanner,fts"

RUN apt-get purge -y \
    libbz2-dev \
    libcairo2-dev \
    libcurl4-gnutls-dev \
    libfontconfig1-dev \
    libfreetype6-dev \
    libfribidi-dev \
    libgit2-dev \
    libharfbuzz-dev \
    libicu-dev \
    libjpeg-dev \
    libpng-dev \
    libpq-dev \
    libprotobuf-dev \
    libsodium-dev \
    libssh2-1-dev \
    libssl-dev \
    libtiff-dev \
    libxml2-dev \
    libxt-dev \
    libnode-dev \
    g++ \
    gcc \
    cmake \
    liblzma-dev \
    libdeflate-dev \
    && apt-get autoremove -y \
    && apt-get clean --yes \
    && rm -rf /var/lib/apt/{apt,dpkg,cache,log}/ \
    # Create user and group for ownership
    && useradd docker -u 1001 \
    && groupadd alp \
    && mkdir /home/docker \
    && chown docker:docker /home/docker \
    && adduser docker staff \
    && adduser docker alp


COPY --chown=docker:docker  ./__init__.py /app/
COPY --chown=docker:docker ./_shared_flow_utils/drivers /app/inst/drivers/

# Copy the Python virtual environment and uv binary from the build stage
COPY --from=python-dependencies-build --chown=docker:docker /app/python /app/python
COPY --from=python-dependencies-build --chown=docker:docker /app/.venv /app/.venv

# Application files
COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils /app/_shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./cohort_survival/*_plugin /app/flows

RUN chmod -R 755 /app

WORKDIR /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"
ENV INSTALL_SQLALCHEMY_FLAG=false

USER docker