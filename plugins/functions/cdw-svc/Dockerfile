ARG libs_install_type_arg=submodule

FROM node:18.20.4-slim AS libs-install-from-submodule

WORKDIR /usr/src

COPY ./alp-libs/nodejs ./libs

COPY ./alp-libs/nodejs/package.json .

COPY ./services/cdw-svc services/app

RUN --mount=type=cache,target=~/.cache/yarn \
    yarn install --network-timeout 1000000 --frozen-lockfile

RUN yarn workspace @alp/alp-base-utils run compile
RUN yarn workspace @alp/alp-config-utils run compile


FROM libs-install-from-${libs_install_type_arg} AS final-build

WORKDIR /usr/src/

RUN yarn workspace cdw-config run compile && \
    yarn install --network-timeout 1000000 --ignore-scripts --production


FROM node:18.20.4-slim AS final

LABEL app="cdw-svc"

RUN apt update && apt install -y openssl zlib1g wget

RUN rm -rf /usr/local/lib/node_modules/npm

RUN groupadd alp \
    && useradd docker \
    && adduser docker alp

USER docker

WORKDIR /home/docker

COPY --chown=docker:alp --from=final-build /usr/src src/

#ARG
#GIT COMMIT Passed during docker build time
ARG GIT_COMMIT_ARG

# ENV
ENV GIT_COMMIT=$GIT_COMMIT_ARG

WORKDIR src/services/app

ENTRYPOINT ["yarn", "start:docker"]
#CMD ["tail", "-f", "/dev/null"]

EXPOSE ${PORT}