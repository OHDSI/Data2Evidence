FROM node:24.15-trixie-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/materialize-cohorts/package.json ./package.json
COPY services/materialize-cohorts/src ./src
COPY services/materialize-cohorts/api ./api
COPY services/materialize-cohorts/README.md ./README.md

# Install only Apache-2.0 / MIT licensed runtime deps. The SAP HANA client is
# fetched on first start by src/bootstrap.js so the published image does not
# redistribute SAP-licensed binaries.
RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force

EXPOSE 3333

CMD ["npm", "start"]
