#!/usr/bin/env bash

########################
# USAGE INSTRUCTIONS
########################

# Generate latest .env.local first
# Remove all docker containers first
# This script changes volume names in docker compose to avoid overwriting existing volumes
# Revert docker compose changes, remove containers, and rerun docker compose to resume normal development
# Find the one password addresses manually for the values below at .github/workflows/http-tests.yml in "Load dotenv from 1password"

# Run on command line from root of d2e repo. 1pw will require log in in the script
# bash tests/backend_integration_tests/run-http-tests-local.sh

HANASERVER="CHANGE ME" \
    HDIUSER="CHANGE ME" \
    HDIPORT="CHANGE ME" \
    HDIPW="CHANGE ME" \
    TESTSYSTEMPW="CHANGE ME" \
    TESTPORT="CHANGE ME" \
    TESTSCHEMA="CHANGE ME" \
    time bash ./tests/backend_integration_tests/http-tests-local.sh
