# syntax=docker/dockerfile:1.4

FROM rust:1.83.0-bookworm AS builder

ARG TARGETPLATFORM
ARG ONNXRUNTIME_VERSION=1.17.0
ARG GIT_V_VERSION
ARG PROFILE=release
ARG FEATURES=cli/tracing

ENV ZERO_AR_DATE=1
ENV DUCKDB_STATIC_BUILD=1
ENV LLAMA_CUBLAS=1
ENV duckdb_version=1.3.2

RUN echo "Platform: $TARGETPLATFORM"

RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
    export RUSTFLAGS="-C target-feature=+neon,+dotprod,+fp16,+rcpc,+crypto" && \
    export CFLAGS="-march=armv8-a+dotprod+fp16+rcpc+crypto -O3" && \
    export CXXFLAGS="-march=armv8-a+dotprod+fp16+rcpc+crypto -O3" && \
    export CC=clang && \
    export CXX=clang++ \
    ; fi

RUN apt-get update && apt-get install -y binutils llvm-dev libclang-dev clang cmake ninja-build libgomp1 libopenblas-dev unzip wget
RUN rustup component add rustfmt

# Download and install DuckDB library
RUN mkdir -p /usr/local/lib && \
    wget -O /tmp/libduckdb-linux-amd64.zip https://github.com/duckdb/duckdb/releases/download/v1.3.2/libduckdb-linux-amd64.zip && \
    unzip /tmp/libduckdb-linux-amd64.zip -d /tmp/duckdb && \
    cp /tmp/duckdb/libduckdb.so /usr/local/lib/ && \
    cp /tmp/duckdb/libduckdb_static.a /usr/local/lib/ && \
    cp /tmp/duckdb/duckdb.h /usr/local/include/ && \
    cp /tmp/duckdb/duckdb.hpp /usr/local/include/ && \
    rm -rf /tmp/libduckdb-linux-amd64.zip /tmp/duckdb && \
    ldconfig

#WORKDIR /usr/src/

#RUN --mount=type=cache,target=/usr/local/cargo/registry,id=${TARGETPLATFORM} \
#    cargo install cargo-strip

COPY ./services/trex/trex /usr/src/trex
WORKDIR /usr/src/trex

RUN --mount=type=cache,target=/usr/local/cargo/registry,id=${TARGETPLATFORM} \
    --mount=type=cache,target=/usr/src/trex/target,id=${TARGETPLATFORM} \
    #(cargo build --profile ${PROFILE} --workspace || true) && \
    CARGO_BUILD_JOBS=2 GIT_V_TAG=${GIT_V_VERSION} cargo build --profile ${PROFILE} --features "${FEATURES}" && \
    #cargo strip && \
    mv /usr/src/trex/target/${PROFILE}/trex /root #&& \
    #cp /usr/src/trex/target/${PROFILE}/build/circe-rust-wrapper-*/out/libcirce-native.so /root/ || true && \
    #CIRCE_REV=$(grep -A1 'circe.*git.*circe-be' ext/trex/Cargo.toml | grep 'rev' | sed 's/.*rev = "\([^"]*\)".*/\1/' | cut -c1-7) && \
    #cp /usr/local/cargo/git/checkouts/circe-be-*/${CIRCE_REV}*/native-libs/linux-x86_64/libcirce-native.so /root/libcirce-native.so || \
    #echo "Warning: Could not find CIRCE native library for revision $CIRCE_REV"

RUN objcopy --compress-debug-sections \
    --only-keep-debug \
    /root/trex \
    /root/trex.debug
RUN objcopy --strip-debug \
#    --add-gnu-debuglink=/root/trex.debug \
    /root/trex
    

# ONNX Runtime provider
# Application runtime with ONNX
FROM builder as ort
RUN ./scripts/install_onnx.sh $ONNXRUNTIME_VERSION linux $TARGETPLATFORM /root/onnxruntime

FROM ghcr.io/p-hoffmann/duckdb-extension-circe:sha-265ca31 AS duckdb_circe

FROM ghcr.io/data2evidence/d2e-medplum:main AS medplum-builder

FROM node:20.19.4-trixie-slim AS trex-base

ARG DUCKDB_VERSION=1.3.2
ENV DUCKDB_VERSION=${DUCKDB_VERSION}

RUN apt-get update && apt-get install -y curl libssl-dev mesa-vulkan-drivers libgomp1 libopenblas-dev && rm -rf /var/lib/apt/lists/*
RUN apt-get remove -y perl && apt-get autoremove -y


COPY --from=builder /root/trex /usr/src/trex

#Copy medplum 
COPY --from=medplum-builder /usr/src/medplum /usr/src/medplum
#start.sh edits config file with env vars and then starts medplum server
COPY /functions/d2e-fhir/start.sh /usr/src/medplum/start.sh
COPY /functions/d2e-fhir/config.json /usr/src/medplum/config.json
RUN chmod +x /usr/src/medplum/start.sh
# Install envsubst if not present
RUN apt-get update && apt-get install -y gettext-base jq

#COPY --from=builder /root/trex.debug /usr/src/trex.debug

COPY --from=ort /root/onnxruntime/lib/libonnxruntime.so* /usr/lib/
COPY --from=builder /usr/local/lib/libduckdb.so /usr/lib/

RUN mkdir -p /root/.duckdb/extensions/v${DUCKDB_VERSION}/linux_amd64
COPY --from=duckdb_circe /extensions/circe.duckdb_extension /root/.duckdb/extensions/v${DUCKDB_VERSION}/linux_amd64/circe.duckdb_extension

#ENV DUCKDB_EXTENSION_DIR=/usr/lib/duckdb/extensions \
#    DUCKDB_CIRCE_EXTENSION=/usr/lib/duckdb/extensions/circe/circe.duckdb_extension

WORKDIR /usr/src

RUN useradd docker -u 1001 \
    && groupadd alp \
    && adduser docker staff \
    && adduser docker alp

# Create folder to store duckdb extensions for offline plugins
ENV duckdb_version=1.3.2
RUN mkdir -p /root/.duckdb/extensions/v${duckdb_version}/linux_amd64
WORKDIR /root/.duckdb/extensions/v${duckdb_version}/linux_amd64
RUN apt-get update && apt-get install -y wget 
RUN for lib in \
    autocomplete avro aws azure delta excel fts httpfs iceberg icu inet json \
    mysql_scanner parquet postgres_scanner spatial sqlite sqlite_scanner tpcds tpch ui vss; do \
    wget http://extensions.duckdb.org/v${duckdb_version}/linux_amd64/${lib}.duckdb_extension.gz && \
    gzip -d ${lib}.duckdb_extension.gz; \
    done
RUN for lib in \
    bigquery; do \ 
    wget http://community-extensions.duckdb.org/v${duckdb_version}/linux_amd64/${lib}.duckdb_extension.gz && \
    gzip -d ${lib}.duckdb_extension.gz; \
    done

WORKDIR /usr/src/cdw_data
# Copy cdw-svc built in duckdb file into trex
COPY --chown=root:root ./functions/cdw-svc/src/duckdb/cdw_config_svc_validation_schema ./built_in/cdw_config_svc_validation_schema

WORKDIR /usr/src



# Build main function
COPY ./services/trex/core /usr/src/core
RUN mkdir -p /usr/src/data/cache
RUN chown -R docker:alp /usr/src/data/cache
RUN mkdir -p /usr/src/data/plugins
COPY ./services/trex/_npmrc /usr/src/data/plugins/.npmrc
COPY ./services/trex/package.json.plugin /usr/src/data/plugins/package.json
COPY ./services/trex/bunfig.toml /usr/src/data/plugins/bunfig.toml

COPY ./services/trex/package.json /usr/src
COPY ./services/trex/deno.json /usr/src

RUN npm install
RUN npm install -g deno@2.1

# Allows usage of npx
RUN if [ "$(uname -m)" = "aarch64" ]; then \
    npm install @oven/bun-linux-aarch64; \
    ln -sf /usr/src/node_modules/bun-linux-aarch64/bin/bun /usr/src/node_modules/.bin/bun; \
    else \
    npm install @oven/bun-linux-x64-baseline; \
    ln -sf /usr/src/node_modules/bun-linux-x64-baseline/bin/bun /usr/src/node_modules/.bin/bun; \
    fi

WORKDIR /usr/src/core
RUN deno install --allow-scripts

WORKDIR /usr/src
RUN /usr/src/trex bundle --entrypoint /usr/src/core/server/index.ts --output /usr/src/core/server/index.eszip
RUN /usr/src/trex bundle --entrypoint /usr/src/core/event/index.ts --output /usr/src/core/event/index.eszip

ENTRYPOINT ["./medplum/start.sh"]
CMD ["npm", "run", "start"]
EXPOSE 33000
