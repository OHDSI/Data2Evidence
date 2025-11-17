FROM node:20-alpine AS plugin-builder

WORKDIR /app/plugin

# Copy plugin files
COPY plugin/package*.json ./
RUN npm ci

COPY plugin/ ./

# Build the plugin
RUN npm run build

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

# Expose port
EXPOSE 3001

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts"]
