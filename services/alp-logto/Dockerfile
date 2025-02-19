###### [STAGE] Build ######
FROM node:20-alpine AS builder

WORKDIR /etc/logto/packages

RUN apk add unzip
COPY experience.zip .
RUN unzip experience.zip

###### [STAGE] Seal ######
FROM ghcr.io/logto-io/logto:1.18

WORKDIR /etc/logto
RUN apk update && apk add openssl>3

RUN rm -rf packages/experience
COPY --from=builder /etc/logto/packages/experience packages/experience

COPY ./connector-alp-azuread /etc/logto/packages/connectors/connector-alp-azuread

WORKDIR /etc/logto/packages/connectors/connector-alp-azuread

RUN yarn
RUN yarn build

WORKDIR /etc/logto/

RUN npx @logto/cli connector link
