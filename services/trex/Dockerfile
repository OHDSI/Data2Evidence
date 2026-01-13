# syntax=docker/dockerfile:1.4

FROM debian:bookworm-slim AS base

ENV ONNXRUNTIME_VERSION=1.20.1

RUN mkdir -p ./scripts
COPY install_onnx.sh ./scripts
COPY install_libchdb.sh ./scripts

RUN echo "deb http://deb.debian.org/debian testing main" >> /etc/apt/sources.list && \
apt-get update && apt-get install -y \
    curl clang libgomp1 unzip wget libssl-dev default-jre-headless mesa-vulkan-drivers libopenblas-dev npm \
    && apt-get install -y -t testing libstdc++6 && \
    rm -rf /var/lib/apt/lists/*

RUN ./scripts/install_onnx.sh $ONNXRUNTIME_VERSION linux linux/amd64 /root/onnxruntime && \
    cp -a /root/onnxruntime/lib/libonnxruntime.so* /usr/lib/ && \
    rm -rf /root/onnxruntime

RUN bash ./scripts/install_libchdb.sh

RUN mkdir -p /usr/src /usr/src/data/cache /usr/src/data/plugins /usr/src/cdw_data/built_in

WORKDIR /usr/src

COPY deno.json package.json package-lock.json .npmrc ./

RUN npm install

# Pre-install DuckDB extensions for offline use
ENV DUCKDB_VERSION=1.4.0
RUN mkdir -p /root/.duckdb/extensions/v${DUCKDB_VERSION}/linux_amd64 && \
    cd /root/.duckdb/extensions/v${DUCKDB_VERSION}/linux_amd64 && \
    for lib in autocomplete avro aws azure fts httpfs icu inet json mysql_scanner parquet postgres_scanner spatial sqlite sqlite_scanner ui vss; do \
        wget -q http://extensions.duckdb.org/v${DUCKDB_VERSION}/linux_amd64/${lib}.duckdb_extension.gz && \
        gzip -d ${lib}.duckdb_extension.gz; \
    done && \
    for lib in bigquery; do \
        wget -q http://community-extensions.duckdb.org/v${DUCKDB_VERSION}/linux_amd64/${lib}.duckdb_extension.gz && \
        gzip -d ${lib}.duckdb_extension.gz; \
    done

RUN mkdir -p ./cert ./core

ENV TREXAS_HOST=0.0.0.0
ENV TREXAS_PORT=9876
ENV PGWIRE_HOST=0.0.0.0
ENV PGWIRE_PORT=5433
ENV TLS_CERT_PATH=""
ENV TLS_KEY_PATH=""
ENV TLS_PORT=9443
ENV MAIN_PATH=/usr/src/main

EXPOSE 33001 5432 33000

COPY ./core ./core

RUN npx trex bundle -e ./core/server/index.ts -o ./core/server/index.eszip && \
    npx trex bundle -e ./core/event/index.ts -o ./core/event/index.eszip

RUN mkdir -p ./logto
COPY ./logto ./logto

COPY ./cdw_data/built_in /usr/src/cdw_data/built_in

CMD ["npm", "run", "start"]
