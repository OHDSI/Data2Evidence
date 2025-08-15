ARG PYTHON_VERSION=3.12
ARG R_VERSION=4.4.3

FROM rocker/r-ver:${R_VERSION} AS python-dependencies-build

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
    --mount=type=bind,source=./base/uv.lock,target=uv.lock \
    --mount=type=bind,source=./base/pyproject.toml,target=pyproject.toml \
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
    libpng-dev \
    libpq-dev \
    libpq5 \
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
    wget \
    && apt-get clean --yes \
    && rm -rf /var/lib/apt/{apt,dpkg,cache,log}/

# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/openjdk-17
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-17/lib/server
ENV R_REMOTES_UPGRADE="always"

ENV APP_VERSION=0.0.0
ENV PRING_PROFILES_ACTIVE=prod   


RUN set -e; \
    mkdir -p -m 700 ~/.ssh && \
    # GitHub setup & test
    ssh-keyscan github.com | tee -a ~/.ssh/known_hosts && \
    git ls-remote https://github.com/data2evidence/d2e-DatabaseConnector.git | grep HEAD && \
    git ls-remote https://github.com/data2evidence/d2e-SqlRender.git | grep HEAD && \
    git config --global advice.detachedHead false && \
    # Install OpenJDK 17
    arch="$(dpkg --print-architecture)" && \
    case "$arch" in \
      'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_x64_linux_hotspot_2021-05-06-23-30.tar.gz' ;; \
      'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_aarch64_linux_hotspot_2021-05-06-23-30.tar.gz' ;; \
      *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; \
    esac && \
    wget --progress=dot:giga -O openjdk.tgz "$downloadUrl" && \
    mkdir -p ${JAVA_HOME} && \
    tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner && \
    rm openjdk.tgz*


WORKDIR /app

COPY ./base/renv.lock ./build/.Rprofile ./build/install_and_verify_r_packages.R /app/

# Install R depdendencies in global library
ARG REQUIRED_R_PACKAGES="Achilles DataQualityDashboard CommonDataModel DatabaseConnector SqlRender"
RUN chmod +x /app/install_and_verify_r_packages.R && \
    /app/install_and_verify_r_packages.R "$REQUIRED_R_PACKAGES" && \
    R CMD javareconf && \
    rm -f /app/renv.lock /app/.Rprofile /app/install_and_verify_r_packages.R

FROM r-dependencies-build AS runtime

ARG DUCKDB_VERSION=1.3.2
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
    g++ \
    gcc \
    cmake \
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


COPY ./build/download_duckdb_extensions.sh /app/download_duckdb_extensions.sh

RUN \
    # Create output directory and set ownership
    mkdir -p /output \
    && chown -R docker:docker /output \
    # Create directory for DuckDB extensions
    && mkdir -p /app/duckdb_extensions \
    && chmod -R 755 /app/duckdb_extensions \
    # Make the download script executable
    && chmod +x /app/download_duckdb_extensions.sh \
    # Install DuckDB extensions in the duckdb_extensions directory
    && cd /app/duckdb_extensions \
    && /app/download_duckdb_extensions.sh "$DUCKDB_VERSION" "$DUCKDB_EXTENSIONS" \
    && rm -f /app/download_duckdb_extensions.sh


COPY --chown=docker:docker  ./__init__.py /app/
COPY --chown=docker:docker ./_shared_flow_utils/drivers /app/inst/drivers/

# Copy the Python virtual environment and uv binary from the build stage
COPY --from=python-dependencies-build --chown=docker:docker /bin/uv /usr/local/bin/uv
COPY --from=python-dependencies-build --chown=docker:docker /app/python /app/python
COPY --from=python-dependencies-build --chown=docker:docker /app/.venv /app/.venv

# For post installs during runtime
COPY --chown=docker:docker ./base/pyproject.toml ./base/uv.lock /app/

# Application files
COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils /app/_shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./base/*_plugin /app/flows/

RUN chmod -R 755 /app

WORKDIR /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"
ENV INSTALL_SQLALCHEMY_FLAG=true

USER docker