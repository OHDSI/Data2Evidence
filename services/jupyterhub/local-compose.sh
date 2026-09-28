# for docker compose for poc
set -eu

repo="$(cd "$(dirname "$0")/../.." && pwd)"
project="${PROJECT_NAME:-d2e}"

if [ -z "${D2E_COMPOSE_FILE:-}" ]; then
  D2E_COMPOSE_FILE="$(npm root -g 2>/dev/null)/@ohdsi/d2e/docker-compose.yml"
fi
if [ -z "${D2E_ENV_FILE:-}" ]; then
  D2E_ENV_FILE="$(docker inspect "${project}-logto-1" \
    --format '{{index .Config.Labels "com.docker.compose.project.environment_file"}}' 2>/dev/null || true)"
fi
JUPYTER_ENV_FILE="${JUPYTER_ENV_FILE:-$repo/.env.jupyterhub-local}"

for f in "$D2E_COMPOSE_FILE" "$D2E_ENV_FILE" "$JUPYTER_ENV_FILE"; do
  if [ ! -f "$f" ]; then
    echo "missing file: '$f'. Set D2E_COMPOSE_FILE, D2E_ENV_FILE or JUPYTER_ENV_FILE." >&2
    exit 1
  fi
done

exec docker compose -p "$project" --project-directory "$repo" \
  --env-file "$D2E_ENV_FILE" --env-file "$JUPYTER_ENV_FILE" \
  -f "$D2E_COMPOSE_FILE" -f "$repo/docker-compose-jupyterhub.yml" "$@"
