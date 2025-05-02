FROM alpine AS builder

# Create .Renviron file with GITHUB_PAT
ARG GITHUB_PAT
ARG BUILD_TYPE
RUN echo "GITHUB_PAT=$GITHUB_PAT" >> .Renviron

FROM rocker/r-ver:4.4 as base-build

RUN mkdir -p /app

WORKDIR /app
# GITHUB_PAT authentication for OHDSI remotes::install_github
COPY --from=builder .Renviron .

# GitHub deploy key ssh-config authentication for OHDSI remotes::install_github. host ssh-agent supplies private keys
# COPY .github /root/

# installs
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
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    software-properties-common \
    sqlite3 \
    vim-tiny \
    wget \
    && apt-get clean

# GitHub setup & test
RUN mkdir -p -m 700 ~/.ssh/ && ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
# RUN ssh-add -l # debug only
RUN git ls-remote https://github.com/data2evidence/d2e-DatabaseConnector.git | grep HEAD || exit 1
RUN git ls-remote https://github.com/data2evidence/d2e-SqlRender.git | grep HEAD || exit 1
RUN git config --global advice.detachedHead false

# Python Library Setup
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
RUN python3 -m venv /usr/src/app
# Enable venv
ENV PATH="/usr/src/app/bin:$PATH"

# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/openjdk-17
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-17/lib/server
ENV R_REMOTES_UPGRADE="always"

ENV APP_VERSION=0.0.0
ENV PRING_PROFILES_ACTIVE=prod

# OpenJDK 17
RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_x64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_aarch64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;

RUN rm openjdk.tgz*

# Verify the installation
RUN java -version && R CMD javareconf

# Install Dependencies
RUN Rscript -e 'options(install.packages.compile.from.source = "never")'
RUN Rscript -e 'install.packages(c("remotes", "devtools", "rJava", "usethis"))'

# OHDSI packages and versions - after HADES
RUN Rscript -e 'as.data.frame(installed.packages())[,c("Package", "Version")]' | awk '{print $1,$NF}' | grep -E "$(grep -l -i ohdsi /usr/local/lib/R/site-library/*/DESCRIPTION | awk -F/ '{print $(NF-1)}' | paste -sd '|')"

# OHDSI packages and versions - after D2E
RUN Rscript -e 'as.data.frame(installed.packages())[,c("Package", "Version")]' | awk '{print $1,$NF}' | grep -E "$(grep -l -i ohdsi /usr/local/lib/R/site-library/*/DESCRIPTION | awk -F/ '{print $(NF-1)}' | paste -sd '|')"

RUN Rscript -e 'devtools::install_github("OHDSI/CommonDataModel@v5.4.1", upgrade = "never", verbose = "true")' # https://github.com/OHDSI/CommonDataModel

# D2E packages
RUN Rscript -e 'remotes::install_git("https://github.com/data2evidence/d2e-SqlRender.git", ref="alp-dqd", force = TRUE)' # overwrite existing from OHDSI
RUN Rscript -e 'remotes::install_git("https://github.com/data2evidence/d2e-DatabaseConnector.git", ref="alp-dqd", force = TRUE)' # overwrite existing from OHDSI

# OHDSI packages and versions - final
RUN Rscript -e 'as.data.frame(installed.packages())[,c("Package", "Version")]' | awk '{print $1,$NF}' | grep -E "$(grep -l -i ohdsi /usr/local/lib/R/site-library/*/DESCRIPTION | awk -F/ '{print $(NF-1)}' | paste -sd '|')"

# RUN rm -rf .Renviron /app/.github/.ssh

RUN useradd docker -u 1001 \
    && groupadd alp \
    && mkdir /home/docker \
    && chown docker:docker /home/docker \
    && adduser docker staff \
    && adduser docker alp

FROM base-build AS final-build

WORKDIR /app

COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker  ./__init__.py .

RUN mkdir /output
RUN chown -R docker:docker /output

# Create folder to store synpuf1k CSVs
RUN mkdir -p /app/synpuf1k
RUN chown -R docker:docker /app/synpuf1k

# Create folder to store vocab CSVs
RUN mkdir -p /app/vocab
RUN chown -R docker:docker /app/vocab

# Create folder to store duckdb extensions for offline plugins
# version must match duckdb in requirements.txt
ENV duckdb_version 1.2.1
RUN mkdir -p /app/duckdb_extensions
WORKDIR /app/duckdb_extensions
RUN wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/postgres_scanner.duckdb_extension.gz \
    && wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/fts.duckdb_extension.gz \
    && gzip -d postgres_scanner.duckdb_extension.gz \
    && gzip -d fts.duckdb_extension.gz

WORKDIR /app

# Create folder for duckdb database files
RUN mkdir ./duckdb_data
RUN chown docker:alp ./duckdb_data
RUN mkdir -p ./cdw-config/duckdb_data
RUN chown -R docker:alp ./cdw-config

COPY --chown=docker:docker --chmod=711 ./loyalty_score/requirements_loyalty_score.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' /app/requirements*.txt; fi
RUN pip install -r requirements_loyalty_score.txt

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./loyalty_score flows

# Change the ownership of /app folder to docker user for CohortGen error logs 
RUN chown -R docker:docker /app
# Grant docker user read/write access
RUN chmod -R 755 /app

USER docker
