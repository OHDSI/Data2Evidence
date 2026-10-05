#!/bin/sh
# [RUN] one command: logto_setup.py -> .env.poc -> build missing files -> start docker-compose.yml
# D2E must be running (d2e CLI). Safe to run again.
#   sh run.sh            # set up and start
#   sh run.sh --remove   # stop, and remove the PoC users/roles/app from D2E Logto
set -eu
cd "$(dirname "$0")"

export LOGTO_M2M_ID="$(docker exec d2e-logto-1 printenv LOGTO_API_M2M_CLIENT_ID)"
export LOGTO_M2M_SECRET="$(docker exec d2e-logto-1 printenv LOGTO_API_M2M_CLIENT_SECRET)"
setup() {
  docker run --rm --network d2e_alp -v "$PWD:/w:ro" -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET \
    python:3.12-alpine python /w/logto_setup.py "$@"
}

if [ "${1:-}" = "--remove" ]; then
  docker compose --env-file .env.poc down -v 2>/dev/null || docker compose down -v
  for c in $(docker ps -aq --filter 'name=^jupyter-'); do docker rm -f "$c" >/dev/null; done
  setup --remove
  rm -f .env.poc
  exit 0
fi

# 1. D2E Logto: roles, users, hub app -> .env.poc (gitignored)
umask 077
key="$(grep '^POC_HUB_CRYPT_KEY=' .env.poc 2>/dev/null | cut -d= -f2- || true)"
[ -n "$key" ] || key="$(openssl rand -hex 32)"
{ setup; echo "POC_HUB_CRYPT_KEY=$key"; } > .env.poc.new
if ! grep -q '^POC_HUB_CLIENT_ID=' .env.poc.new; then
  rm -f .env.poc.new
  echo "D2E Logto setup failed (no hub client id); see the messages above" >&2
  exit 1
fi
mv .env.poc.new .env.poc

# 2. build what the plain images lack, once
[ -f validator/out/pg_oidc_validator.so ] || docker build --output validator/out validator
docker image inspect pgoauth-notebook:local >/dev/null 2>&1 || docker build -t pgoauth-notebook:local notebook

# 3. start pg18 and the hub
docker compose --env-file .env.poc up -d --build
echo "open http://localhost:8000 (accept the https://localhost certificate first)"
