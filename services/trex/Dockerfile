FROM ghcr.io/data2evidence/d2e-trex-base@sha256:dda060241650e41817afe4088f42ed894aaddb92edf8761d121f1ffe60959ae0 AS base

WORKDIR /usr/src

COPY core /usr/src/core
RUN mkdir -p /usr/src/data/cache
RUN mkdir -p /usr/src/data/plugins
COPY _npmrc /usr/src/data/plugins/.npmrc
COPY package.json.plugin /usr/src/data/plugins/package.json
COPY bunfig.toml /usr/src/data/plugins/bunfig.toml

COPY package.json /usr/src

RUN npm install

RUN /usr/src/trex bundle --entrypoint /usr/src/core/server/index.ts --output /usr/src/core/server/index.eszip 
RUN /usr/src/trex bundle --entrypoint /usr/src/core/event/index.ts --output /usr/src/core/event/index.eszip 

# Allows usage of npx
RUN if [ "$(uname -m)" = "aarch64" ]; then \
    npm install @oven/bun-linux-aarch64; \
    ln -sf /usr/src/node_modules/bun-linux-aarch64/bin/bun /usr/src/node_modules/.bin/bun; \
    else \
    npm install @oven/bun-linux-x64-baseline; \
    ln -sf /usr/src/node_modules/bun-linux-x64-baseline/bin/bun /usr/src/node_modules/.bin/bun; \
    fi


CMD ["npm", "run", "start"]
EXPOSE 33000
