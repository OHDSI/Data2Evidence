# JupyterHub with D2E Logto: local PoC

## The ticket

> Create a temporary local container-based setup to validate JupyterHub
> authentication against the existing D2E Logto provider before deploying it to
> the new VM.

The PoC has to show:

- login to JupyterHub through D2E's Logto
- JupyterHub reading the role or claim it authorizes on
- rejection of users without that role
- basic notebook creation seperated by user
- user can select things from seperated psql
- configuration that can later move to the VM deployment


```text
browser ──> JupyterHub :8000 ──(OIDC)──> D2E Logto          role.jupyteruser required
                 │
                 ├── creates one notebook container per user  (internal network, no internet)
                 └── creates a short-lived PostgreSQL user   ──> jupyter-poc-postgres (no host port)
```

## First-time setup

Run everything from the repository root. You need Docker Desktop running and D2E
started with the `d2e` CLI (`d2e init` once, then `d2e start`).

**1. Load the Logto admin credentials** and define a short helper. Logto's management
API is only reachable inside the D2E network, so the helper runs in a throwaway container.

```sh
export LOGTO_API_M2M_CLIENT_ID="$(docker exec d2e-logto-1 printenv LOGTO_API_M2M_CLIENT_ID)"
export LOGTO_API_M2M_CLIENT_SECRET="$(docker exec d2e-logto-1 printenv LOGTO_API_M2M_CLIENT_SECRET)"
logto_role() {
  docker run --rm --network d2e_alp -v "$PWD/services/jupyterhub:/s:ro" \
    -e LOGTO_API_M2M_CLIENT_ID -e LOGTO_API_M2M_CLIENT_SECRET \
    python:3.12-alpine python /s/logto-role.py "$@"
}
```

**2. Register JupyterHub in Logto and save its values.** `setup` creates the
`role.jupyteruser` scope, the role and a JupyterHub app, skipping any that already
exist. It prints the app's client ID and secret.

```sh
umask 077
logto_role setup | grep -E '^(LOGTO__|JUPYTERHUB__)' > .env.jupyterhub-local
echo "JUPYTER_DB_BROKER_PASSWORD=$(openssl rand -hex 32)" >> .env.jupyterhub-local
```

`.env.jupyterhub-local` is gitignored. If the PoC database already exists on this
machine, keep its old `JUPYTER_DB_BROKER_PASSWORD` instead of generating a new one.

**3. Create the hub tuning file** with a crypt key. Without the key, notebooks get no
database login.

```sh
cp services/jupyterhub/jupyterhub.env.example services/jupyterhub/.env
sed -i '' "s/^JUPYTERHUB_CRYPT_KEY=.*/JUPYTERHUB_CRYPT_KEY=$(openssl rand -hex 32)/" \
  services/jupyterhub/.env
```

**4. Build the notebook image and start the hub and database.**

```sh
docker build -t d2e-jupyter-notebook:local services/jupyterhub/notebook
sh services/jupyterhub/local-compose.sh up -d --build --no-deps \
  jupyter-poc-postgres jupyterhub
```

**5. Give your user the role.**

```sh
logto_role grant admin
logto_role list
```

**6. Check and log in.**

```sh
sh services/jupyterhub/verify-local-isolation.sh
```

Open `https://localhost/d2e/portal` once and accept the local certificate warning. Then
open `http://localhost:8000`, click **Sign in with Data2Evidence** and log in. JupyterLab
opens with your own notebook server.

After a code change, rebuild with the same `up -d --build --no-deps jupyterhub` command.

## Known limitations

- The DB password expires one hour
- The hub has full Docker access through the mounted socket. Notebooks do not.
- Users cannot `pip install` inside notebooks.
