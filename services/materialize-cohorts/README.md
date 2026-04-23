# HANA Cohort Materializer Service

Express service that streams HANA query results and inserts them into cohort results.

## Setup

1. Install dependencies: `npm install`
2. Start server: `npm run dev`

## API

- `GET /health`
- `POST /api/stream/run-all`

### Example request body

```json
{
  "query": "SELECT SUBJECT_ID, COHORT_START_DATE, COHORT_END_DATE FROM cdmsynpuf.cohort WHERE cohort_definition_id = 7",
  "cohortDefinitionId": 6,
  "resultsSchema": "CDMSYNPF",
  "sqlQueryParameters": [],
  "dbCredential": {
    "host": "hana-host.example.com",
    "port": 30013,
    "user": "TENANT_ADMIN_USER",
    "password": "secret",
    "databaseName": "ALPDEV",
    "encrypt": true,
    "validateCertificate": true
  }
}
```

## API mutual TLS support

Mutual TLS is supported for incoming REST calls to this Express server.

Set:

- `API_MTLS_ENABLED=true`
- `API_TLS_KEY_PATH=/path/to/server.key`
- `API_TLS_CERT_PATH=/path/to/server.crt`
- `API_TLS_CA_PATH=/path/to/ca.crt`

For self-signed client certificates:

- `API_TLS_SELF_SIGNED_CLIENT_CERT_PATH=/path/to/client-self-signed.crt`

When enabled, the server starts as HTTPS and requests a client certificate.
`/health` is exempt from mTLS checks, while all other routes require an authorized client certificate.

### Example mTLS request

```bash
curl --cert /path/to/client.crt \
  --key /path/to/client.key \
  --cacert /path/to/ca.crt \
  -X POST https://localhost:3333/api/stream/run-all \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT 1","cohortDefinitionId":1,"resultsSchema":"CDM","sqlQueryParameters":[]}'
```

## Generate certificates with OpenSSL

The commands below create certificates for local/dev mTLS testing.

### 1) Create a local CA

```bash
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/CN=local-mtls-ca"
```

### 2) Create server certificate

```bash
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,DNS:alp-materialize-cohorts,DNS:d2e-materialize-cohorts" -addext "extendedKeyUsage=serverAuth"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 1825 -sha256 -copy_extensions copyall
```

Use with:

- `API_TLS_KEY_PATH=/absolute/path/server.key`
- `API_TLS_CERT_PATH=/absolute/path/server.crt`
- `API_TLS_CA_PATH=/absolute/path/ca.crt`

### 3) Create CA-signed client certificate

```bash
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr -subj "/CN=local-client"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 1825 -sha256
```

Use this client cert with `curl --cert client.crt --key client.key --cacert ca.crt ...`.

### 4) Create self-signed client certificate (alternative)

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout client-selfsigned.key -out client-selfsigned.crt -days 1825 -sha256 -subj "/CN=local-selfsigned-client"
```

Use with:

- `API_TLS_SELF_SIGNED_CLIENT_CERT_PATH=/absolute/path/client-selfsigned.crt`

Then call:

```bash
curl --cert client-selfsigned.crt \
  --key client-selfsigned.key \
  --cacert ca.crt \
  -X POST https://localhost:3333/api/stream/run-all
```
