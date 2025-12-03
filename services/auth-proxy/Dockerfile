FROM node:20-alpine AS plugin-builder

WORKDIR /app/plugin

# Copy plugin files
COPY plugin/package*.json ./
RUN npm ci

COPY plugin/ ./

# Build the plugin
RUN npm run build

# Build Atlas3 from OHDSI GitHub
FROM node:20-alpine AS atlas-builder

RUN apk add --no-cache git

WORKDIR /app/atlas

# Install Atlas3 from GitHub and build
RUN npm init -y && \
    npm install github:OHDSI/Atlas3 && \
    cd node_modules/atlas-cohort-builder && \
    npm ci && \
    npm run build

# Final stage
FROM denoland/deno:2.1.4

WORKDIR /app

# Copy dependency files
COPY deno.json .

# Cache dependencies
COPY src/ ./src/
RUN deno cache src/main.ts

# Copy remaining files
COPY . .

# Copy built plugin from builder stage
COPY --from=plugin-builder /app/static/plugins ./static/plugins

# Copy built Atlas3 from atlas-builder stage
COPY --from=atlas-builder /app/atlas/node_modules/atlas-cohort-builder/dist ./atlas-static

# Expose port
EXPOSE 3001

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts"]
