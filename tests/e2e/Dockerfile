FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /work

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies (cached unless package.json changes)
RUN npm install

# Install Playwright and browser dependencies (cached)
RUN npx playwright install chromium --with-deps

# Copy the rest of the code (tests, config, etc.)
COPY . .

CMD ["npx", "playwright", "test"]
