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
RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    --mount=type=bind,source=./base/uv.lock,target=uv.lock \
    --mount=type=bind,source=./base/pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev --no-editable

FROM rocker/r-ver:${R_VERSION} AS r-dependencies-build

# Create user and group for ownership
RUN useradd docker -u 1001 \
    && groupadd alp \
    && mkdir /home/docker \
    && chown docker:docker /home/docker \
    && adduser docker staff \
    && adduser docker alp

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
    python3-pip \
    software-properties-common \
    sqlite3 \
    vim-tiny \
    wget \
    libglpk40 \
    && apt-get clean

# GitHub setup & test
RUN mkdir -p -m 700 ~/.ssh/ && ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
# RUN ssh-add -l # debug only
RUN git ls-remote https://github.com/data2evidence/d2e-DatabaseConnector.git | grep HEAD || exit 1
RUN git ls-remote https://github.com/data2evidence/d2e-SqlRender.git | grep HEAD || exit 1
RUN git config --global advice.detachedHead false

ENV JAVA_HOME=/usr/lib/jvm/openjdk-11
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-11/lib/server
ENV R_REMOTES_UPGRADE="always"


# OpenJDK 11
RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_x64_linux_11.0.16_8.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_aarch64_linux_11.0.16_8.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;

RUN update-alternatives --install /usr/bin/java java ${JAVA_HOME}/bin/java 100 && \
    update-alternatives --install /usr/bin/javac javac ${JAVA_HOME}/bin/javac 100 && \
    rm openjdk.tgz*

# Verify the installation
RUN java -version && R CMD javareconf


ARG POSIT_DATE=2025-09-22
ARG CODENAME=noble


COPY --chown=docker:docker  ./__init__.py /app/
COPY --chown=docker:docker ./drivers /app/inst/drivers/

COPY <<-EOF /usr/local/lib/R/etc/Rprofile.site
    options(repos=c(CRAN='https://packagemanager.posit.co/cran/__linux__/$CODENAME/$POSIT_DATE'))
    options(renv.config.repos.override = c(CRAN='https://packagemanager.posit.co/cran/__linux__/$CODENAME/$POSIT_DATE'))
    options(HTTPUserAgent = sprintf("R/%s R (%s)", getRversion(), paste(getRversion(), R.version["platform"], R.version["arch"], R.version["os"])))
    options(download.file.extra = sprintf('--header "User-Agent: R (%s)"', paste(getRversion(), R.version["platform"], R.version["arch"], R.version["os"])))
EOF

# install renv package
RUN install2.r --error --skipinstalled renv

WORKDIR /app
COPY --from=builder .Renviron .

COPY ./hades/renv.lock ./build/.Rprofile ./build/install_and_verify_r_packages.R /app/

# Install R depdendencies in global library
ARG REQUIRED_R_PACKAGES="Hades CohortGenerator CohortIncidence Strategus Characterization CirceR CohortDiagnostics CohortIncidence CohortMethod FeatureExtraction PatientLevelPrediction SelfControlledCaseSeries DatabaseConnector TreatmentPatterns Cyclops Andromeda BrokenAdaptiveRidge"
RUN chmod +x /app/install_and_verify_r_packages.R && \
    /app/install_and_verify_r_packages.R "$REQUIRED_R_PACKAGES" && \
    R CMD javareconf && \
    rm -f /app/renv.lock /app/.Rprofile /app/install_and_verify_r_packages.R

RUN rm -f .Renviron

# Copy the Python virtual environment and uv binary from the build stage
COPY --from=python-dependencies-build --chown=docker:docker /bin/uv /usr/local/bin/uv
COPY --from=python-dependencies-build --chown=docker:docker /app/python /app/python
COPY --from=python-dependencies-build --chown=docker:docker /app/.venv /app/.venv

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils /app/_shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./hades /app/flows/


RUN chmod -R 755 /app

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH"
ENV INSTALL_SQLALCHEMY_HANA=true

USER docker