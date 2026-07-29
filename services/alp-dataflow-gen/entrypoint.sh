#!/bin/sh
set -e

mkdir -p /usr/src/cert
printf '%s' "$TLS__INTERNAL__CRT" > /usr/src/cert/cert.pem
printf '%s' "$TLS__INTERNAL__KEY" > /usr/src/cert/key.pem
printf '%s' "$TLS__INTERNAL__CA_CRT" > /usr/src/cert/ca.pem

mkdir -p /etc/nginx/conf.d
cat <<EOT > /etc/nginx/conf.d/dataflow-gen.conf
server {
    listen 41120 ssl;
    server_name ${DATAFLOW_GEN_HOSTNAME:-dataflow-gen-1};

    ssl_certificate     /usr/src/cert/cert.pem;
    ssl_certificate_key /usr/src/cert/key.pem;

    # Prefect artifact/result payloads (e.g. DQD reports) routinely exceed
    # nginx's default 1m limit; Prefect had no such cap before nginx sat in
    # front of it for TLS termination.
    client_max_body_size 0;

    location / {
        proxy_pass http://127.0.0.1:41121;
        proxy_http_version 1.1;
        # $host strips the port; Prefect needs the real port (incl. :41120)
        # to build correct absolute redirect Location headers (e.g. the
        # trailing-slash 307 on /variables), so use $http_host instead.
        proxy_set_header Host \$http_host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # Prefect's events API is websocket-only (/d2e/api/events/in, /out);
        # without these, nginx forwards the upgrade request as a plain GET,
        # which Prefect's ASGI router 404s on instead of upgrading.
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOT

nginx

exec prefect server start
