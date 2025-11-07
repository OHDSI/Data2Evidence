ARG IMAGE=node:18.20.1-alpine

FROM $IMAGE as development

RUN apk update && apk add busybox=1.36.1-r19
WORKDIR /usr/src/app

COPY --chown=node:node --chmod=711 package.json ./
COPY --chown=node:node --chmod=711 yarn.lock ./

RUN yarn install --network-timeout 1000000 --frozen-lockfile

RUN apk update && \
    apk add --upgrade openssl

COPY --chown=node:node --chmod=711 ./local-postgres.sh .
RUN wget https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh
RUN chown node:node wait-for-it.sh
RUN chmod +x wait-for-it.sh

COPY --chown=node:node --chmod=711 . .

RUN yarn compile:local

RUN chown -R node:node /usr/src/app

USER node

FROM $IMAGE AS build

WORKDIR /usr/src/app

COPY --chown=node:node --chmod=711 package.json ./
COPY --chown=node:node --chmod=711 yarn.lock ./

COPY --chown=node:node --chmod=711 --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node --chmod=711 . .

RUN yarn compile

ENV NODE_ENV production

RUN yarn install --production

FROM $IMAGE AS production

RUN apk update && apk add busybox=1.36.1-r19
RUN rm -rf /usr/local/lib/node_modules/npm

RUN addgroup -S alp -g 3000 && adduser --uid 3000 -S docker -G alp

RUN mkdir -p /usr/src/app && chown -R docker:alp /usr/src/app

USER docker

WORKDIR /usr/src/app

COPY --chown=docker:alp --chmod=711 --from=build /usr/src/app/target ./target
COPY --chown=docker:alp --chmod=711 --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=docker:alp --chmod=711 ./package.json .
COPY --chown=docker:alp --chmod=711 ./start.sh .

#ARG
#GIT COMMIT Passed during docker build time
ARG GIT_COMMIT_ARG

# ENV
ENV GIT_COMMIT=$GIT_COMMIT_ARG

CMD ["sh", "start.sh"]
EXPOSE ${PORT}