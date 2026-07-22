# Environment types

- `ENV_TYPE=local` - a local workstation [https://localhost:443/portal](https://localhost:443/portal)
- `ENV_TYPE=remote` - a remote server with functional Fully Qualified Domain Name (FQDN) access with `https://<FQDN>/portal`

:::note

- Remote Server requires a FQDN
- Access Remote Server by IP address is not supported
- Defaults are specified in the `docker-compose.yml` file

:::

## Variables

### `CADDY__ALP__PUBLIC_FQDN` - FQDN for TLS communication over https

- `localhost:443` (**default**) - use [https://localhost:443](https://localhost:443)
- `<FQDN>` - resolvable FQDN. Ensure that the `FQDN` url is in lowercase. 

:::tip

Use `hostname --fqdn` - command on a Linux server to output FQDN
Ensure that the `FQDN` url is in lowercase. 

:::

### `TLS__CADDY_DIRECTIVE` - governs certificate creation

- `tls internal` (**default**) - caddy will generate a self-signed certificate with internal Certificate Authority
- `***blank***` - caddy will generate with a publicly trusted certificate using Let's Encrypt
- For further information: [https://caddyserver.com/docs/caddyfile/directives/tls](https://caddyserver.com/docs/caddyfile/directives/tls)

## Scenarios

### Local Workstation - `ENV_TYPE=local` (default)

```bash
export CADDY__ALP__PUBLIC_FQDN=localhost:443
export TLS__CADDY_DIRECTIVE='tls internal'
```

### Remote Virtual Machine Server - `ENV_TYPE=remote`

#### Internal FQDN

- Corporate DNS resolvable FQDN
- Caddy will generate a self-signed certificate with Internal Certificate Authority

```bash
export CADDY__ALP__PUBLIC_FQDN=<FQDN>
export TLS__CADDY_DIRECTIVE='tls internal'
```

#### Public FQDN

- Public internet resolvable FQDN
- Caddy will generate with a publicly trusted certificate using Let's Encrypt

```bash
export CADDY__ALP__PUBLIC_FQDN=<FQDN>
export TLS__CADDY_DIRECTIVE=' '
```
