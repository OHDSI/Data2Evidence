# Enabling the Logto Admin Console (local dev)

The admin console is disabled by default because Logto's `ENDPOINT` env var is set to an internal Docker hostname (`http://<project>-caddy:8080`) — required for WebAPI's strict OIDC `iss` validation. That hostname gets baked into the admin console's JS bundle, so the browser can't reach it without a small workaround.

## Steps

1. In `docker-compose.yml`, uncomment every block tagged `Enable if need to access admin console`.
2. Add to `/etc/hosts` on your Mac (replace `d2e` with your `PROJECT_NAME` if different):
   ```
   127.0.0.1 d2e-caddy
   ```
3. Recreate Caddy:
   ```bash
   docker compose up -d --force-recreate caddy
   ```
4. Open `http://localhost:3002`.

To disable again, re-comment the same blocks and recreate Caddy.
