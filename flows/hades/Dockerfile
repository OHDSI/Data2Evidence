ARG PYTHON_VERSION=3.12
ARG R_VERSION=4.4.3

FROM alpine AS builder

# Create .Renviron file with GITHUB_PAT
ARG GITHUB_PAT
RUN echo "GITHUB_PAT=$GITHUB_PAT" >> .Renviron

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
    --mount=type=bind,source=./hades/uv.lock,target=uv.lock \
    --mount=type=bind,source=./hades/pyproject.toml,target=pyproject.toml \
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
    libnode-dev \
    xz-utils \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

COPY --from=builder .Renviron .

# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/openjdk-11
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-11/lib/server
ENV R_REMOTES_UPGRADE="always"


RUN arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
      'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_x64_linux_11.0.16_8.tar.gz'; ;; \
      'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_aarch64_linux_11.0.16_8.tar.gz'; ;; \
      *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; \
    esac; \
    wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; \
    mkdir -p ${JAVA_HOME}; \
    tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner; \
    update-alternatives --install /usr/bin/java java ${JAVA_HOME}/bin/java 100; \
    update-alternatives --install /usr/bin/javac javac ${JAVA_HOME}/bin/javac 100; \
    rm openjdk.tgz*

WORKDIR /app

COPY --from=builder .Renviron .

COPY ./hades/renv.lock ./build/.Rprofile ./build/install_and_verify_r_packages.R /app/

# Install R depdendencies in global library
ARG REQUIRED_R_PACKAGES="Hades CohortGenerator CohortIncidence Strategus Characterization CirceR CohortDiagnostics CohortIncidence CohortMethod FeatureExtraction PatientLevelPrediction SelfControlledCaseSeries DatabaseConnector"
RUN chmod +x /app/install_and_verify_r_packages.R && \
    /app/install_and_verify_r_packages.R "$REQUIRED_R_PACKAGES" && \
    R CMD javareconf && \
    rm -f /app/renv.lock /app/.Rprofile /app/install_and_verify_r_packages.R

RUN rm -f .Renviron

FROM r-dependencies-build AS runtime


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
COPY --chown=docker:docker ./drivers /app/inst/drivers/

# Copy the Python virtual environment from the build stage
COPY --from=python-dependencies-build --chown=docker:docker /app/python /app/python
COPY --from=python-dependencies-build --chown=docker:docker /app/.venv /app/.venv

# Application files
COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils /app/_shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./hades/cohort_generator_plugin /app/flows/cohort_generator_plugin
COPY --chown=docker:docker --chmod=711 ./hades/strategus_plugin /app/flows/strategus_plugin

RUN chmod -R 755 /app

WORKDIR /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"
ENV INSTALL_SQLALCHEMY_FLAG=false

USER docker