#!/usr/bin/env bash
# get drivers
set -o pipefail

# inputs
[ -z "${OP_VAULT_NAME}" ] && echo 'FATAL ${OP_VAULT_NAME} is required => set e.g. in .zshrc' && exit 1

# vars
GIT_BASE_DIR="$(git rev-parse --show-toplevel)"
DRIVERS_DIR=$GIT_BASE_DIR/cache/drivers

# action
op read --force --out-file $DRIVERS_DIR/alp-dbcli-v1.0.0.tgz "op://${OP_VAULT_NAME}/cache-alp-dbcli-v1.0.0.tgz/alp-dbcli-v1.0.0.tgz" --force
op read --force --out-file $DRIVERS_DIR/ngdbc-latest.jar "op://${OP_VAULT_NAME}/cache-ngdbc-latest/ngdbc-latest.jar" --force