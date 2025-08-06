ARG PYTHON_VERSION=3.12

FROM alpine AS builder

# Create .Renviron file with GITHUB_PAT
ARG GITHUB_PAT
RUN echo "GITHUB_PAT=$GITHUB_PAT" >> .Renviron

FROM python:${PYTHON_VERSION}-slim-bookworm AS python-source
# For copying into R images

FROM rocker/r-ver:4.4.1 AS python-dependencies-build


# RPY2 needs R to compile

ENV PYTHON_ROOT=/opt/python
ENV VENV_PATH=/app/venv
ENV PATH="${VENV_PATH}/bin:${PYTHON_ROOT}/bin:$PATH"


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
    sqlite3 \
    vim-tiny \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy Python 3.12 binary, libs, and site-packages from the python image
COPY --from=python-source /usr/local /opt/python


COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /uvx /bin/


ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

# Install dependencies with uv into /app/venv
WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=./base/uv.lock,target=uv.lock \
    --mount=type=bind,source=./base/pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-editable --no-dev


FROM rocker/r-ver:4.4.1 AS r-dependencies-build


WORKDIR /app
# GITHUB_PAT authentication for OHDSI remotes::install_github
COPY --from=builder .Renviron .

# GitHub deploy key ssh-config authentication for OHDSI remotes::install_github. host ssh-agent supplies private keys
# COPY .github /root/

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    cmake \
    dirmngr \
    ed \
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
    sqlite3 \
    vim-tiny \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# GitHub setup & test
RUN mkdir -p -m 700 ~/.ssh/ && ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
# RUN ssh-add -l # debug only
RUN git ls-remote https://github.com/data2evidence/d2e-DatabaseConnector.git | grep HEAD || exit 1
RUN git ls-remote https://github.com/data2evidence/d2e-SqlRender.git | grep HEAD || exit 1
RUN git config --global advice.detachedHead false

ENV PATH="/usr/src/app/bin:$PATH"

# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/openjdk-17
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-17/lib/server
ENV APP_VERSION=0.0.0
ENV PRING_PROFILES_ACTIVE=prod

# OpenJDK 17
RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_x64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_aarch64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;

RUN rm openjdk.tgz*

# Verify the installation
RUN java -version && R CMD javareconf

COPY ./base/renv.lock renv.lock
COPY ./base/.Rprofile .Rprofile

# Install in global library
RUN Rscript -e 'install.packages("remotes", repos = "https://cloud.r-project.org"); \
                remotes::install_version("renv", version = "1.1.4", repos = "https://cloud.r-project.org"); \
                Sys.setenv(RENV_CONFIG_SANDBOX_ENABLED = FALSE); \
                Sys.setenv(RENV_PATHS_LIBRARY = "/usr/local/lib/R/site-library"); \ 
                .libPaths("/usr/local/lib/R/site-library"); \
                renv::restore(lockfile = "/app/renv.lock",library = "/usr/local/lib/R/site-library",prompt = FALSE)'

# Verify installation and fail if any are missing
RUN Rscript -e "required <- c('Achilles', 'DataQualityDashboard', 'CommonDataModel', 'DatabaseConnector', 'SqlRender'); \
                installed <- rownames(installed.packages()); \
                missing <- setdiff(required, installed); \
                if (length(missing) > 0) { \
                    stop(paste('Missing packages:', paste(missing, collapse = ', '))) \
                }"

FROM r-dependencies-build AS runtime


ARG BUILD_TYPE
ARG USER=docker
ENV USER=${USER}
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER}


RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq5 \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean


# Copy Python 3.12 binary, libs, and site-packages from the python image
COPY --from=python-source /usr/local /opt/python


RUN mkdir /output
RUN chown -R docker:docker /output

WORKDIR /app

COPY --from=python-dependencies-build --chown=app:app /app/.venv /app/.venv

# Create folder to store duckdb extensions for offline plugins
# Version must match duckdb in pyproject.toml
ENV duckdb_version=1.2.1
RUN mkdir -p /app/duckdb_extensions
WORKDIR /app/duckdb_extensions
RUN wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/postgres_scanner.duckdb_extension.gz \
    && wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/fts.duckdb_extension.gz \
    && gzip -d postgres_scanner.duckdb_extension.gz \
    && gzip -d fts.duckdb_extension.gz

# Create folder for duckdb database files
RUN mkdir ./duckdb_data
RUN chown docker:docker ./duckdb_data
RUN mkdir -p ./cdw-config/duckdb_data
RUN chown -R docker:docker ./cdw-config

WORKDIR /app

COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker ./_shared_flow_utils/ngdbc-latest.jar ./inst/drivers/
COPY --chown=docker:docker  ./__init__.py .
COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./base flows

# Grant docker user read/write access
RUN chmod -R 755 /app

RUN rm -rf .Renviron /app/.github/.ssh

ENV PATH="/app/.venv/bin:$PATH"

WORKDIR /app

USER docker