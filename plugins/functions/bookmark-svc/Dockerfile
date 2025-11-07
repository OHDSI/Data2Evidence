ARG libs_install_type_arg=submodule

FROM node:18.20.4-alpine AS libs-install-from-submodule

WORKDIR /usr/src

COPY ./alp-libs/nodejs ./libs
COPY ./alp-libs/nodejs/package.json .

COPY ./services/bookmark-svc alp-data-node/app

RUN yarn install --network-timeout 1000000
RUN yarn workspace @alp/alp-base-utils run compile

FROM libs-install-from-${libs_install_type_arg} AS final-build

WORKDIR /usr/src/

RUN yarn workspace bookmark run compile && \
    yarn install --ignore-scripts --production


FROM node:18.20.4-alpine AS final

LABEL app="bookmark-svc"

RUN apk add --update --upgrade openssl zlib

RUN rm -rf /usr/local/lib/node_modules/npm

RUN addgroup -S alp -g 3000 && adduser --uid 3000 -S docker -G alp

USER docker

WORKDIR /home/docker

COPY --chown=docker:alp --chmod=711 --from=final-build /usr/src src/

#ARG
#GIT COMMIT Passed during docker build time
ARG GIT_COMMIT_ARG

# ENV
ENV GIT_COMMIT=$GIT_COMMIT_ARG

WORKDIR /home/docker/src/alp-data-node/app

EXPOSE ${PORT}

CMD ["sh", "start.sh"]
