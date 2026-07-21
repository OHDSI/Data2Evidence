# TLS

## Caddy validate TLS**INTERNAL**CA_CRT TLS**INTERNAL**CRT TLS**INTERNAL**KEY

- `gen-tls.sh` copies certs from Caddy container at runtime

- Setup

```bash
mkdir private-crt
cd private-crt
CONTAINER_NAME=alp-caddy
TLS_CA_NAME=alp-internal
DOMAIN_NAME=alp.local
CONTAINER_CRT_DIR=/data/caddy/certificates/$TLS_CA_NAME/wildcard_.$DOMAIN_NAME
CONTAINER_CA_DIR=/data/caddy/pki/authorities/$TLS_CA_NAME
```

- Option 1 - copy certs from Caddy container
  > [!NOTE]
  >
  > - TLS**INTERNAL**CRT.crt contains CA and CRT => extract CRT only

```bash
docker exec $CONTAINER_NAME cat $CONTAINER_CRT_DIR/wildcard_.${DOMAIN_NAME}.crt | head -n 12 | awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' > TLS__INTERNAL__CRT.crt
docker cp $CONTAINER_NAME:$CONTAINER_CRT_DIR/wildcard_.${DOMAIN_NAME}.key TLS__INTERNAL__KEY.key
docker cp $CONTAINER_NAME:$CONTAINER_CA_DIR/root.crt TLS__INTERNAL__CA_CRT.crt
```

- Option 2 - echo certs from env-var

```bash
source ../.env.local
echo $TLS__INTERNAL__CRT > TLS__INTERNAL__CRT.crt
echo $TLS__INTERNAL__KEY > TLS__INTERNAL__KEY.key
echo $TLS__INTERNAL__CA_CRT > TLS__INTERNAL__CA_CRT.crt
```

- Validate CA matches CRT

```bash
openssl verify -verbose -CAfile TLS__INTERNAL__CA_CRT.crt TLS__INTERNAL__CRT.crt
```

> TLS**INTERNAL**CRT.crt: OK

- Validate CRT SAN

```bash
openssl x509 -noout -ext subjectAltName -in TLS__INTERNAL__CRT.crt
```

> X509v3 Subject Alternative Name: critical
> DNS:\*.alp.local
