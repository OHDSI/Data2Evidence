#!/bin/bash
set -e

echo "Processing configuration file..."

# Step 1: Replace environment variables in config.json and convert ports to numbers
envsubst < /usr/src/medplum/config.json | jq '.database.port |= tonumber | .redis.port |= tonumber' > /usr/src/medplum/temp.json

# Step 2: Copy the processed config to the medplum server location
cp /usr/src/medplum/temp.json /usr/src/medplum/packages/server/medplum.config.json

echo "Configuration file processed and copied"