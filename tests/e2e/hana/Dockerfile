FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /work
RUN pwd && echo "1Working directory is: $(pwd)"
RUN ls -l

# Copy package files and install dependencies
COPY package*.json ./
RUN pwd && echo "2Working directory is: $(pwd)"
RUN ls -l

RUN npm ci

# Install Playwright browser and dependencies
RUN npx playwright install chromium --with-deps

# Copy test files and config
COPY playwright.config.ts ./
COPY tests ./tests

CMD ["npm", "test"]
