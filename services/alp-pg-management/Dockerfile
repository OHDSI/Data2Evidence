FROM debian:bookworm-slim AS base

RUN apt-get update && apt-get install -y sudo bash curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
RUN sudo apt-get install -y nodejs
RUN npm i -g yarn

FROM base AS builder

WORKDIR /home/builder

COPY --chown=docker:alp --chmod=711 ./app app/

RUN cd app && yarn install --network-timeout 1000000 && yarn postinstall

FROM base AS final

RUN curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

RUN groupadd alp \
	&& useradd docker \
	&& adduser docker alp

USER docker

WORKDIR /home/docker

COPY --from=builder --chown=docker:alp --chmod=711 /home/builder/app/target/ target/
COPY --chown=docker:alp --chmod=711 ./app/package.json .

RUN yarn install --network-timeout 1000000 --prod --ignore-scripts
RUN yarn cache clean

#ARG
#GIT COMMIT Passed during docker build time
ARG GIT_COMMIT_ARG

# ENV
ENV GIT_COMMIT=$GIT_COMMIT_ARG

ENTRYPOINT ["yarn", "start"]
