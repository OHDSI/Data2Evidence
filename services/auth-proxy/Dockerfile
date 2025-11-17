FROM denoland/deno:2.1.4

WORKDIR /app


# Copy dependency files
COPY deno.json .

# Cache dependencies
COPY src/ ./src/
RUN deno cache src/main.ts

# Copy remaining files
COPY . .

# Expose port
EXPOSE 3001

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts"]
