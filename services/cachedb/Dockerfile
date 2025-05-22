FROM python:3.11.1 AS base

ARG BUILD_TYPE

ENV PYTHONUNBUFFERED=1
ENV TZ=UTC
ENV DEBIAN_FRONTEND=noninteractive

# Install node and yarn for env converter
RUN mkdir -p /usr/local/node
ENV NVM_DIR=/usr/local/node
ENV NODE_VERSION=18.20.4

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN . $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use $NODE_VERSION
ENV NODE_HOME=$NVM_DIR/versions/node/v$NODE_VERSION
ENV NODE_PATH=$NODE_HOME/lib/node_modules
ENV PATH=$NODE_HOME/bin:$PATH

RUN npm install --global yarn

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV TINI_VERSION="v0.19.0"
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

RUN groupadd alp \
  && useradd docker -u 1001 \
  && adduser docker alp

USER docker

### Start env converter ###
WORKDIR /home/docker/envConverter
COPY ./services/envConverter .
RUN --mount=type=cache,target=~/.cache/yarn yarn install
### End env converter ###


# Create folder to store duckdb extensions for offline plugins
# version must match duckdb in requirements.txt
ENV duckdb_version=1.2.1
WORKDIR /home/docker/duckdb_extensions
RUN wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/postgres_scanner.duckdb_extension.gz \
  && wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/fts.duckdb_extension.gz \
  && gzip -d postgres_scanner.duckdb_extension.gz \
  && gzip -d fts.duckdb_extension.gz

WORKDIR /home/docker
COPY ./services/cachedb/requirements.txt .
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' requirements.txt; fi
RUN --mount=type=cache,target=/home/docker/.cache/pip \
  pip install -r requirements.txt

# Copy cdw-svc built in duckdb file into cachedb
COPY --chown=docker:alp ./functions/cdw-svc/src/duckdb/cdw_config_svc_validation_schema ./cdw_svc/built_in_duckdb_data/cdw_config_svc_validation_schema

COPY ./services/cachedb/src src

FROM base AS development

COPY ./services/cachedb/requirements-dev.txt .
RUN --mount=type=cache,target=/home/docker/.cache/pip \
  pip install -r requirements-dev.txt

ENTRYPOINT ["/tini", "--"]
CMD cd ./envConverter && yarn generate:envs -s alp-minerva-analytics-svc && cd - && . ./generated-env.sh && python -m watchdog.watchmedo auto-restart --recursive --pattern="*.py" --directory="/home/docker/src" python ./src/main.py

FROM base AS production

ENTRYPOINT ["/tini", "--"]
CMD cd ./envConverter && yarn generate:envs -s alp-minerva-analytics-svc && cd - && . ./generated-env.sh && python ./src/main.py

