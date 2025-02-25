FROM rocker/r-ver:4.4 as base-build

ARG BUILD_TYPE

COPY dataflow-gen-base /app

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

# Python Library Setup
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
RUN python3 -m venv /usr/src/app
# Enable venv
ENV PATH="/usr/src/app/bin:$PATH"
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' /app/requirements*.txt; fi
RUN pip3 install -r /app/requirements.txt

RUN useradd docker -u 1001 \
    && groupadd alp \
    && mkdir /home/docker \
    && chown docker:docker /home/docker \
    && adduser docker staff \
    && adduser docker alp

WORKDIR /app
COPY --chown=docker:docker  ./__init__.py .

# Create folder to store duckdb extensions for offline plugins
# version must match duckdb in requirements.txt
ENV duckdb_version 1.1.1
RUN mkdir -p /app/duckdb_extensions
WORKDIR /app/duckdb_extensions
RUN wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/postgres_scanner.duckdb_extension.gz \
    && wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/fts.duckdb_extension.gz \
    && gzip -d postgres_scanner.duckdb_extension.gz \
    && gzip -d fts.duckdb_extension.gz


WORKDIR /app

# Create folder for mimic database files
RUN mkdir ./mimic_omop
RUN chown docker:docker ./mimic_omop

COPY --chown=docker:docker --chmod=711 ./requirements.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' requirements*.txt; fi
RUN pip install -r requirements.txt

COPY --chown=docker:docker --chmod=711 ./shared_utils shared_utils
COPY --chown=docker:docker --chmod=711 ./flows/mimic_omop_conversion flows

USER docker
