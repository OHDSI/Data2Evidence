#!/bin/sh
# Grant, revoke or list the JupyterHub Logto role.
#
#   ./role.sh list
#   ./role.sh grant <username>
#   ./role.sh revoke <username>
#
# Reads the Logto management credentials straight from the running Logto
# container, so nothing has to be exported first. Run it from the directory that
# holds services/jupyterhub.
set -e

DIR=$(cd "$(dirname "$0")" && pwd)
if [ ! -f "$DIR/services/jupyterhub/logto-role.py" ]; then
  echo "services/jupyterhub/logto-role.py not found next to this script." >&2
  echo "Run it from the checkout that holds the JupyterHub code." >&2
  exit 1
fi

LOGTO_CONTAINER=${LOGTO_CONTAINER:-d2e-logto-1}
NETWORK=${NETWORK:-d2e_alp}

ID=$(docker exec "$LOGTO_CONTAINER" printenv LOGTO_API_M2M_CLIENT_ID)
SECRET=$(docker exec "$LOGTO_CONTAINER" printenv LOGTO_API_M2M_CLIENT_SECRET)

exec docker run --rm --network "$NETWORK" \
  -v "$DIR/services/jupyterhub:/s:ro" \
  -e LOGTO_API_M2M_CLIENT_ID="$ID" \
  -e LOGTO_API_M2M_CLIENT_SECRET="$SECRET" \
  python:3.12-alpine python /s/logto-role.py "$@"
