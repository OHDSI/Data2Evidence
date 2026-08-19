# TLS

## Caddy validate TLS**INTERNAL**CA_CRT TLS**INTERNAL**CRT TLS**INTERNAL**KEY

- `gen-tls.sh` copies certs from Caddy container at runtime

- Setup

```bash
mkdir private-crt
cd private-crt
CONTAINER_NAME=alp-caddy
TLS_CA_NAME=alp-internal
DOMAIN_NAME=d2e.local
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
> DNS:\*.d2e.local

## Internal domain

Service-to-service TLS uses one internal DNS domain, `TLS__INTERNAL__DOMAIN`, defaulting to
`d2e.local`. Internal HTTPS verification is strict — both the certificate chain and the
hostname are checked — so this value **must** match the generated certificate's SAN
(`*.<domain>` plus the bare domain). Certificate generation builds the SAN from the same
variable and writes the resolved value back into the env file, so the two cannot drift.

Verify a running deployment from inside the network:

```bash
docker exec <project>-trex sh -c \
  "printf '' | openssl s_client -connect <project>-logto-1.d2e.local:3001 \
     -servername <project>-logto-1.d2e.local -verify_hostname <project>-logto-1.d2e.local \
     -verify_return_error -CAfile /usr/src/cert/ca.pem" 2>/dev/null | grep 'Verify return code'
```

> Verify return code: 0 (ok)

`-verify_hostname` matters: without it `openssl s_client` checks nothing (`-servername` only
sets SNI), and a certificate whose SAN does not cover the name being dialled looks like a pass.

### Upgrading an existing deployment

- **If your env file sets `TLS__INTERNAL__DOMAIN` explicitly to something other than the
  certificate's SAN** (e.g. a older `alp.local` value against a `*.d2e.local` certificate),
  every internal HTTPS hop fails hostname verification. Either set it to match the
  certificate, or regenerate certificates so the SAN is rebuilt from your value.
- **If your env file only has the older `TLS__INTERNAL__DOMAIN_NAME`**, certificate
  generation still honours it and then writes `TLS__INTERNAL__DOMAIN` with the same value.
  Note this happens silently: regenerating without that variable present in the environment
  resolves the domain to the `d2e.local` default, and the certificate is issued to match.
- **No action is needed** if you never set either variable — defaults are consistent.

## Trusting an external CA

Some upstreams are not ours and are not chained to the internal CA — the PS config server is
typically external/HANA-side. Add its CA to `TLS__EXTRA__CA_CRTS` (one or more concatenated
PEM blocks); the trex entrypoint installs them into the OS trust store before startup, where
`DENO_TLS_CA_STORE=system` consumers pick them up.

The value needs **real newlines**. A `.env`-style string containing literal `\n` is rejected
at startup with a `FATAL` message rather than silently trusting nothing. There is deliberately
no option to skip verification.
