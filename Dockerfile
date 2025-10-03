FROM node:22.20.0-trixie-slim

RUN apt update && apt install git bzip2 -y

WORKDIR /app

RUN yarn -v

# Copy the entire application (node_modules excluded via .dockerignore)
COPY ./ui .

# Install dependencies
RUN yarn install

WORKDIR /app/apps/vue-mri-ui-lib

RUN npm run build:mock

CMD ["npm", "run", "start:mock"]