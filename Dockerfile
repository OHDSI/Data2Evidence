FROM node:22.20.0-trixie-slim

RUN apt update && apt install git bzip2 -y

WORKDIR /app

RUN yarn -v

# Copy package files for dependency installation (better caching)
COPY ./ui/package.json ./ui/yarn.lock ./

# Copy workspace package.json files
COPY ./ui/libs/*/package.json ./libs/
COPY ./ui/apps/*/package.json ./apps/

# Install dependencies (cached unless package files change)
RUN yarn install

# Copy the rest of the application
COPY ./ui .

WORKDIR /app/apps/vue-mri-ui-lib

RUN npm run build:mock

CMD ["npm", "run", "start:mock"]