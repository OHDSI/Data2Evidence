# Environment Types Scenarios - local & remote

- `ENV_TYPE=local` - a local workstation [https://localhost:4100/portal](https://localhost:4100/portal)
- `ENV_TYPE=remote` - a remote server with functional Fully Qualified Domain Name access with `https://<FQDN>/portal`

> [!NOTE]
>
> - Remote Server requires a Fully Qualified Domain Name
> - Access Remote Server by IP address is not supported
> - Defaults are specified in the `docker-compose.yml` file

## Variables

### `CADDY__ALP__PUBLIC_FQDN` - Fully Qualified Domain Name (FQDN) for TLS communication over https

- `localhost:41000` (**default**) - access portal at https://localhost:41000
- `<FQDN>` - resolvable FQDN

> [!TIP]
>
> - `hostname --fqdn` - command on a linux server to output FQDN

### `TLS__CADDY_DIRECTIVE` - governs certificate creation 

- `tls internal` (**default**) - caddy will generate a self-signed certificate with Internal Certificate Authority
- `***blank***` - caddy will generate with a publicly trusted certificate using Let's Encrypt
- For further information: https://caddyserver.com/docs/caddyfile/directives/tls

## Scenarios

### Local Workstation - `ENV_TYPE=local` **Default**

```bash
CADDY__ALP__PUBLIC_FQDN=localhost:41000
TLS__CADDY_DIRECTIVE='tls internal'
```

### Remote Virtual Machine Server scenario - `ENV_TYPE=remote`

#### a) Internal FQDN

- Corporate DNS resolvable FQDN
- Caddy will generate a self-signed certificate with Internal Certificate Authority

```bash
CADDY__ALP__PUBLIC_FQDN=<FQDN>
TLS__CADDY_DIRECTIVE='tls internal'
```

#### b) Public FQDN

- Public internet resolvable FQDN
- Caddy will generate with a publicly trusted certificate using Let's Encrypt

```bash
CADDY__ALP__PUBLIC_FQDN=<FQDN>
TLS__CADDY_DIRECTIVE=''
```
