FROM node:18.20.4-alpine AS base

RUN apk add --update --upgrade openssl openjdk11-jre bash zlib

RUN addgroup -S alp -g 3000 && adduser --uid 3000 -S docker -G alp

USER docker

WORKDIR /home/docker

COPY --chown=docker:alp ./package.json ./tsconfig.json ./yarn.lock ./

RUN yarn install --network-timeout 1000000 \
    && yarn cache clean

COPY --chown=docker:alp ./src src/
COPY --chown=docker:alp ./start.sh ./local-postgres.sh ./

USER root
RUN rm -rf /usr/local/lib/node_modules/npm
RUN wget https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh
RUN chown docker:alp wait-for-it.sh
RUN chmod +x wait-for-it.sh
USER docker

CMD ["sh","start.sh"]