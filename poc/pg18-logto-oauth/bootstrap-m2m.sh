#!/bin/sh
# One-time: give this PoC Management API access to Logto without the admin console.
# Inserts a machine-to-machine app into Logto's `default` tenant and gives it the
# seeded "Logto Management API access" role. Writes its credentials to .env.poc.
#   sh bootstrap-m2m.sh
set -eu
cd "$(dirname "$0")"

app_id=poc-m2m
if [ -f .env.poc ] && grep -q '^LOGTO_M2M_SECRET=' .env.poc; then
  secret="$(grep '^LOGTO_M2M_SECRET=' .env.poc | cut -d= -f2-)"
else
  secret="$(openssl rand -hex 24)"
fi

docker compose exec -T pg18 psql -v ON_ERROR_STOP=1 -U postgres -d logto \
  --set=app_id="$app_id" --set=secret="$secret" <<'SQL'
INSERT INTO applications (tenant_id, id, name, secret, description, type, oidc_client_metadata)
SELECT 'default', :'app_id', 'PoC management', :'secret', 'pg18 OAuth PoC setup', 'MachineToMachine',
       '{"redirectUris": [], "postLogoutRedirectUris": []}'
WHERE NOT EXISTS (SELECT 1 FROM applications WHERE tenant_id = 'default' AND id = :'app_id');

INSERT INTO application_secrets (tenant_id, application_id, name, value)
SELECT 'default', :'app_id', 'poc', :'secret'
WHERE NOT EXISTS (SELECT 1 FROM application_secrets WHERE tenant_id = 'default' AND application_id = :'app_id');

INSERT INTO applications_roles (tenant_id, id, application_id, role_id)
SELECT 'default', 'poc-m2m-mapi', :'app_id', r.id
FROM roles r
WHERE r.tenant_id = 'default' AND r.name = 'Logto Management API access'
  AND NOT EXISTS (SELECT 1 FROM applications_roles WHERE tenant_id = 'default' AND id = 'poc-m2m-mapi');
SQL

umask 077
touch .env.poc
grep -v -E '^LOGTO_M2M_(ID|SECRET)=' .env.poc > .env.poc.tmp || true
{ cat .env.poc.tmp; echo "LOGTO_M2M_ID=$app_id"; echo "LOGTO_M2M_SECRET=$secret"; } > .env.poc
rm -f .env.poc.tmp
echo "ok: $app_id can call the Logto Management API; credentials in .env.poc"
