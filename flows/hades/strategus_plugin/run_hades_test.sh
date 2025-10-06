#!/bin/bash
set -e

# Start the container in detached mode
docker compose -f flows/hades/strategus_plugin/dc-local.yml up -d

# Name of the service as defined in dc-local.yml
SERVICE_NAME="app"

docker network create alp_alp
# Run the test inside the container
docker compose -f flows/hades/strategus_plugin/dc-local.yml exec $SERVICE_NAME \
  /app/.venv/bin/python -m pytest /app/flows/hades/strategus_plugin/tests/
