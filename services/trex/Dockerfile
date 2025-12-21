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

RUN ./scripts/install_onnx.sh $ONNXRUNTIME_VERSION linux linux/amd64 /root/onnxruntime
RUN cp -a /root/onnxruntime/lib/libonnxruntime.so* /usr/lib/

RUN bash ./scripts/install_libchdb.sh

RUN mkdir -p /usr/src
RUN mkdir -p /usr/src/data/cache
RUN mkdir -p /usr/src/data/plugins

WORKDIR /usr/src

COPY deno.json package.json package-lock.json .npmrc ./

RUN npm install

RUN mkdir -p ./cert

ENV TREXAS_HOST=0.0.0.0
ENV TREXAS_PORT=9876
ENV PGWIRE_HOST=0.0.0.0
ENV PGWIRE_PORT=5433
ENV TLS_CERT_PATH=""
ENV TLS_KEY_PATH=""
ENV TLS_PORT=9443
ENV MAIN_PATH=/usr/src/main

EXPOSE 33001 5432 33000

RUN mkdir -p ./core
COPY ./core ./core

COPY trexas.duckdb_extension ./node_modules/@trex/as/trexas.duckdb_extension

CMD ["npm", "run", "start"]


