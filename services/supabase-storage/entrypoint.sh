#!/bin/sh
set -e

mkdir -p /usr/src/cert
printf '%s' "$TLS__INTERNAL__CRT" > /usr/src/cert/cert.pem
printf '%s' "$TLS__INTERNAL__KEY" > /usr/src/cert/key.pem
printf '%s' "$TLS__INTERNAL__CA_CRT" > /usr/src/cert/ca.pem

# Outbound trust for the internal CA (same move as trex and the dataflow worker),
# so this container can reach other TLS-only internal services.
cp /usr/src/cert/ca.pem /usr/local/share/ca-certificates/d2e-internal-ca.crt
update-ca-certificates

# nginx terminates TLS on 9000 and proxies to storage-api on loopback:9001; the
# server block is baked into the image at /etc/nginx/http.d/supabase-storage.conf.
nginx

# The real workload comes from the compose command (migrations + the psql view
# setup around `node dist/start/server.js`), so hand off rather than hardcode it.
exec "$@"
