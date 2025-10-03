FROM node:22.20.0-trixie-slim AS builder

RUN apt update && apt install git bzip2 -y

WORKDIR /app

RUN yarn -v

# Copy the entire application (node_modules excluded via .dockerignore)
COPY ./ui .

# Install dependencies
RUN yarn install

WORKDIR /app/apps/vue-mri-ui-lib

RUN npm run build:mock

RUN rm -rf /app/apps/vue-mri-ui-lib/node_modules

FROM node:22.20.0-trixie-slim AS prod

COPY --from=builder /app/apps/vue-mri-ui-lib /app/apps/vue-mri-ui-lib

WORKDIR /app/apps/vue-mri-ui-lib

CMD ["npm", "run", "start:mock"]