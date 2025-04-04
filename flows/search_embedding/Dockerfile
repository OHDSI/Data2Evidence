FROM python:3.10-slim

ARG BUILD_TYPE
ARG USER=docker
ENV USER=${USER}
ARG UID=1001
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER}

WORKDIR /app
RUN apt-get update && apt-get install libpq5 libpq-dev curl gcc g++ unzip wget -y --no-install-recommends && apt-get clean

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

# Change owner of duckdb_data to align with create_cachedb_plugin
RUN groupadd alp && \
    adduser docker alp && \
    mkdir -p ./duckdb_data && \
    chown -R docker:alp ./duckdb_data

COPY --chown=docker:docker  ./__init__.py .
COPY --chown=docker:docker --chmod=711 ./search_embedding/requirements_search_embedding.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' requirements*.txt; fi
RUN pip install -r requirements_search_embedding.txt

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./search_embedding flows


USER docker