# Scenarios

Each file in this directory covers one API flow or endpoint group.

## Pattern

```js
import { enableTracing } from "../lib/tracing.js";
import { get, post } from "../lib/client.js";
import { logtoAuth } from "../auth/logto.js";
import { handleSummary } from "../summary.js";
import { check } from "k6";

enableTracing();

export const options = {
  vus: 1,
  iterations: 10,
  insecureSkipTLSVerify: true,
};

export function setup() {
  return logtoAuth();
}

export default function (data) {
  const res = get("/analytics-svc/api/...", data.bearerToken);
  check(res, { "status 200": (r) => r.status === 200 });
}

export { handleSummary };
```

## Required env vars

| Variable         | Description                                      |
|------------------|--------------------------------------------------|
| `BASE_URL`       | Base URL of the d2e stack (e.g. `https://d2e-caddy.alp.local:41130`) |
| `LOGTO_CLIENT_ID`| Value of `LOGTO__D2E_APP__CLIENT_ID`             |
| `ADMIN_USERNAME` | Test user username (default: `admin`)            |
| `ADMIN_PASSWORD` | Test user password                               |

## Running

```sh
docker compose \
  -f docker-compose.yml \
  -f tests/regression/docker-compose.regression.yml \
  run --rm k6 run \
  -e BASE_URL=https://d2e-caddy.alp.local:41130 \
  -e LOGTO_CLIENT_ID=<client_id> \
  /scripts/scenarios/<scenario>.js
```
