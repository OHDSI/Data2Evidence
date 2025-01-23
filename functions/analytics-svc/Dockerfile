ARG libs_install_type_arg=submodule

FROM node:18.20.4-slim AS libs-install-from-submodule

WORKDIR /usr/src

COPY ./alp-libs/nodejs/package.json .
COPY ./alp-libs/nodejs/alp-base-utils/package.json ./libs/alp-base-utils/package.json
COPY ./alp-libs/nodejs/alp-config-utils/package.json ./libs/alp-config-utils/package.json
COPY ./alp-libs/nodejs/alp-swagger-node-runner/package.json ./libs/alp-swagger-node-runner/package.json
COPY ./services/analytics-svc/package.json alp-data-node/app/package.json
RUN yarn install --network-timeout 1000000

COPY ./alp-libs/nodejs ./libs
COPY ./services/analytics-svc alp-data-node/app

RUN yarn workspace @alp/alp-base-utils run compile
RUN yarn workspace @alp/alp-config-utils run compile


FROM libs-install-from-${libs_install_type_arg} AS final-build

WORKDIR /usr/src/

RUN yarn workspace analytics run compile && \
    yarn install --network-timeout 1000000 --ignore-scripts --production

WORKDIR /usr/envConverter
COPY ./services/envConverter .
RUN yarn install

FROM node:18.20.4-slim AS final

RUN apt update && apt install -y openssl zlib1g wget

RUN rm -rf /usr/local/lib/node_modules/npm

RUN groupadd alp \
    && useradd docker \
    && adduser docker alp

USER docker

WORKDIR /home/docker

COPY --chown=docker:alp --chmod=711 --from=final-build /usr/src src/

#ARG
#GIT COMMIT Passed during docker build time
ARG GIT_COMMIT_ARG

# ENV
ENV GIT_COMMIT=$GIT_COMMIT_ARG


WORKDIR src/alp-data-node/app

RUN mkdir ./duckdb_data
RUN chown docker:alp ./duckdb_data

COPY --chown=docker:alp --chmod=711 ./services/analytics-svc/start.sh .

COPY --chown=docker:alp --chmod=711 --from=final-build /usr/envConverter envConverter/

CMD ["sh", "start.sh"]
EXPOSE ${PORT}
# CMD tail -f /dev/null
