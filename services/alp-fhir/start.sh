#!/bin/bash
set -e

echo "Processing configuration file..."
# Set up environment variables for FHIR server
export BINARY_UPLOAD_LIMIT_SIZE="${BINARY_UPLOAD_LIMIT_SIZE:-1000000000}"

# Database configuration
export PG__HOST="${PG__HOST:-localhost}"
export PG__PORT="${PG__PORT:-5432}"
export PG__DB_NAME="${PG__DB_NAME:-medplum}"
export PG_SUPER_USER="${PG_SUPER_USER:-postgres}"
export PG_SUPER_PASSWORD="${PG_SUPER_PASSWORD:-postgres}"

# Redis configuration
export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Node.js compatibility
export NODE_ENV="${NODE_ENV:-production}"

# Step 1: Replace environment variables in config.json and convert ports to numbers
envsubst < config.json | jq '.database.port |= tonumber | .redis.port |= tonumber' > temp.json

# Step 2: Copy the processed config to the medplum server location
cp temp.json /home/docker/app/medplum/packages/server/medplum.config.json

echo "Configuration file processed and copied"

# Step 4: Start the Medplum server with Deno 2
echo "Starting Medplum server with Deno 2..."

# Export all environment variables for Deno
export BINARY_UPLOAD_LIMIT_SIZE
export PG__HOST
export PG__PORT
export PG__DB_NAME
export PG_SUPER_USER
export PG_SUPER_PASSWORD
export REDIS_HOST
export REDIS_PORT
export REDIS_PASSWORD
export NODE_ENV

# Start the Medplum server using Deno 2 task
cd /home/docker/app
exec deno task start:server
