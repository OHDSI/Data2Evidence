FROM node:24.15-trixie-slim

RUN apt-get update && apt-get install -y curl

WORKDIR /app

COPY services/materialize-cohorts/package.json ./package.json
COPY services/materialize-cohorts/src ./src
COPY services/materialize-cohorts/api ./api
COPY services/materialize-cohorts/README.md ./README.md

RUN npm install

EXPOSE 3333

CMD ["npm", "start"]
