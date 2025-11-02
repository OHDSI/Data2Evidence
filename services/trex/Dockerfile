# syntax=docker/dockerfile:1.4

#FROM rust:1.84.0-bookworm AS ort
FROM node:24-bookworm AS base

ENV ONNXRUNTIME_VERSION=1.20.1
ENV DENO_VERSION=2.1.4

RUN mkdir -p ./scripts
COPY install_onnx.sh ./scripts
RUN ./scripts/install_onnx.sh $ONNXRUNTIME_VERSION linux linux/amd64 /root/onnxruntime
RUN cp -a /root/onnxruntime/lib/libonnxruntime.so* /usr/lib/

RUN echo "deb http://deb.debian.org/debian testing main" >> /etc/apt/sources.list && \
apt-get update && apt-get install -y \
    curl clang libgomp1 unzip wget libssl-dev default-jre-headless mesa-vulkan-drivers libopenblas-dev \
    && apt-get install -y -t testing libstdc++6 && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/local/lib && \
    wget -O /tmp/libduckdb-linux-amd64.zip https://github.com/duckdb/duckdb/releases/download/v1.3.2/libduckdb-linux-amd64.zip && \
    unzip /tmp/libduckdb-linux-amd64.zip -d /tmp/duckdb && \
    cp /tmp/duckdb/libduckdb.so /usr/local/lib/ && \
    cp /tmp/duckdb/libduckdb_static.a /usr/local/lib/ && \
    cp /tmp/duckdb/duckdb.h /usr/local/include/ && \
    cp /tmp/duckdb/duckdb.hpp /usr/local/include/ && \
    rm -rf /tmp/libduckdb-linux-amd64.zip /tmp/duckdb && \
    ldconfig

RUN curl -sL https://lib.chdb.io | bash

RUN mkdir -p /usr/src
RUN mkdir -p /usr/src/data/cache
RUN mkdir -p /usr/src/data/plugins

WORKDIR /usr/src

COPY deno.json package.json package-lock.json .npmrc ./

RUN npm install -g nbb

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

CMD ["npm", "run", "start"]


