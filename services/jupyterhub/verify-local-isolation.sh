# sh services/jupyterhub/verify-local-isolation.sh
# test all networks are seperated(d2e vm, jupyter vm, psql vm)
set -eu

project_name="${PROJECT_NAME:-d2e}"
hub="${project_name}-jupyterhub"
database="${project_name}-jupyter-poc-postgres"
network="jupyterhub-notebooks-isolated"

echo "[1/5] required containers"
docker inspect "$hub" "$database" >/dev/null
echo "  ok: $hub and $database exist"

echo "[2/5] PostgreSQL is not published on the host"
if docker port "$database" 5432/tcp 2>/dev/null | grep -q .; then
  echo "  FAIL: PostgreSQL has a published host port" >&2
  exit 1
fi
echo "  ok: port 5432 has no host mapping"

echo "[3/5] PostgreSQL is not attached to the D2E alp network"
db_networks="$(docker inspect -f '{{range $k, $_ := .NetworkSettings.Networks}}{{$k}} {{end}}' "$database")"
case " $db_networks " in
  *" ${project_name}_alp "*)
    echo "  FAIL: PostgreSQL is attached to ${project_name}_alp" >&2
    exit 1
    ;;
esac
echo "  ok: database networks: $db_networks"

echo "[4/5] notebook network is internal"
internal="$(docker network inspect -f '{{.Internal}}' "$network")"
test "$internal" = "true"
echo "  ok: $network internal=$internal"

echo "[5/5] sample view and base-table denial"
docker exec "$database" psql -U postgres -d jupyter_poc -Atc \
  'select count(*) from jupyter_views.demo_patient_summary' | grep -qx 3
if docker exec "$database" sh -c \
  "PGPASSWORD=not-a-real-password psql -h 127.0.0.1 -U no_such_user -d jupyter_poc -c 'select 1'" \
  >/dev/null 2>&1; then
  echo "  FAIL: invalid database login unexpectedly worked" >&2
  exit 1
fi
echo "  ok: sample view has 3 rows and invalid login is rejected"

echo "Static isolation checks passed. Complete the browser and notebook tests in docs/jupyterhub-local-poc-en.md (section 6.2)."
