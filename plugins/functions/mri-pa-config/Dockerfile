ARG libs_install_type_arg=submodule

FROM node:18.20.4-alpine AS libs-install-from-submodule

WORKDIR /usr/src

COPY ./alp-libs/nodejs ./libs
COPY ./alp-libs/nodejs/package.json .

COPY ./services/mri-pa-config services/app

RUN yarn install --network-timeout 1000000
RUN yarn workspace @alp/alp-base-utils run compile
RUN yarn workspace @alp/alp-config-utils run compile

FROM libs-install-from-${libs_install_type_arg} AS final-build

WORKDIR /usr/src/

RUN yarn workspace pa-config run compile && \
    yarn install --network-timeout 1000000 --ignore-scripts --production


FROM node:18.20.4-alpine AS final

LABEL app="pa-config-svc"

RUN apk add --update --upgrade openssl zlib

RUN rm -rf /usr/local/lib/node_modules/npm

RUN addgroup -S alp -g 3000 && adduser --uid 3000 -S docker -G alp

USER docker

WORKDIR /home/docker

#ARG
#GIT COMMIT Passed during docker build time
ARG GIT_COMMIT_ARG

# ENV
ENV GIT_COMMIT=$GIT_COMMIT_ARG

COPY --chown=docker:alp --from=final-build /usr/src src/

WORKDIR src/services/app

ENTRYPOINT ["yarn", "start:docker"]
EXPOSE ${PORT}