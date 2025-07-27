FROM ghcr.io/data2evidence/d2e-trex-base@sha256:18ac2039efc098426907d28f7e6de7bcdb7635b19118467fc660d0e67e808b36 AS base

RUN useradd docker -u 1001 \
    && groupadd alp \
    && adduser docker staff \
    && adduser docker alp

# Create folder to store duckdb extensions for offline plugins
ENV duckdb_version=1.2.1
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

# Allows usage of npx
RUN if [ "$(uname -m)" = "aarch64" ]; then \
    npm install @oven/bun-linux-aarch64; \
    ln -sf /usr/src/node_modules/bun-linux-aarch64/bin/bun /usr/src/node_modules/.bin/bun; \
    else \
    npm install @oven/bun-linux-x64-baseline; \
    ln -sf /usr/src/node_modules/bun-linux-x64-baseline/bin/bun /usr/src/node_modules/.bin/bun; \
    fi

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

RUN /usr/src/trex bundle --entrypoint /usr/src/core/server/index.ts --output /usr/src/core/server/index.eszip
RUN /usr/src/trex bundle --entrypoint /usr/src/core/event/index.ts --output /usr/src/core/event/index.eszip

CMD ["npm", "run", "start"]
EXPOSE 33000
