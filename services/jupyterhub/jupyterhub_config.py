# runtime flow for one user
#   [flow 1] browser -> logto login page     
#   [flow 2] logto -> hub callback, hub gets tokens
#   [flow 3] hub checks role.jupyteruser       
#   [flow 4] hub stores tokens (auth_state)
#   [flow 5] user clicks start -> hook runs  
#   [flow 6] hub creates temp pgsql user
#   [flow 7] notebook container starts    
#   [flow 8] logout
import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import psycopg
from psycopg import sql

# get all env(.env)
def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value

# map logto's granted scopes into jupyerhub groups
def granted_scopes(auth_state: dict) -> list[str]:
    # [flow 3] called on every login
    token_response = auth_state.get("token_response") or {}
    scopes = token_response.get("scope") or auth_state.get("scope") or []
    if isinstance(scopes, str):
        scopes = scopes.split()
    return [scope for scope in scopes if isinstance(scope, str)]


def jwt_payload(token: str) -> dict:
    if not token:
        return {}
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        value = json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
        return value if isinstance(value, dict) else {}
    except (IndexError, ValueError, json.JSONDecodeError):
        return {}

# get JUPYTER_DB_ROLE_MAP and mappin into logto role <> pgsql role
def db_role_map() -> dict[str, str]:
    raw = os.getenv(
        "JUPYTER_DB_ROLE_MAP",
        '{"role.jupyteruser":"jupyter_poc_reader"}',
    )
    value = json.loads(raw)
    if not isinstance(value, dict) or not all(
        isinstance(k, str) and isinstance(v, str) for k, v in value.items()
    ):
        raise RuntimeError("JUPYTER_DB_ROLE_MAP must be a JSON string-to-string object")
    return value

# this creates temp user in pgsql by jupyter user. currently for 1hr
def issue_database_credential(auth_state: dict) -> dict[str, str]:
    # [flow 6] runs every time the user's server starts
    # 6-1. find who the user is: `sub` from the access token, else from the id token
    token = auth_state.get("access_token") or ""
    claims = jwt_payload(token)
    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        id_claims = jwt_payload((auth_state.get("token_response") or {}).get("id_token", ""))
        subject = id_claims.get("sub") # logto id by unique user
    if not isinstance(subject, str) or not subject:
        raise RuntimeError("Logto token does not contain a stable sub claim")

    # 6-2. collect what the user holds: granted scopes + `roles` claim from d2e's custom jwt
    granted = set(granted_scopes(auth_state))
    token_roles = claims.get("roles") or []
    if isinstance(token_roles, str):
        token_roles = token_roles.split()
    granted.update(role for role in token_roles if isinstance(role, str))

    # 6-3. keep only roles in the map and turn them into pgsql roles; none -> no db user
    mapping = db_role_map()
    pg_roles = sorted({mapping[role] for role in granted if role in mapping})
    if not pg_roles:
        return {}

    # 6-4. db user name from sub(usernames can change, sub can't), fresh random password
    role_name = f"jh_{hashlib.sha256(subject.encode()).hexdigest()[:24]}"
    password = secrets.token_urlsafe(32)
    valid_until = datetime.now(timezone.utc) + timedelta(
        seconds=int(os.getenv("JUPYTER_DB_LEASE_SECONDS", "3600"))
    )

    admin_dsn = required_env("JUPYTER_DB_ADMIN_DSN")

    # 6-5. hub connects to pgsql as jupyter_broker (created by postgres/init/10-jupyter-poc.sh)
    with psycopg.connect(admin_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            # create the db user only the first time this person logs in
            cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role_name,))
            if cur.fetchone() is None:
                cur.execute(sql.SQL("CREATE ROLE {} LOGIN").format(sql.Identifier(role_name)))

            cur.execute(
                sql.SQL("ALTER ROLE {} LOGIN PASSWORD {} VALID UNTIL {}").format(
                    sql.Identifier(role_name),
                    sql.Literal(password),
                    sql.Literal(valid_until.isoformat()),
                )
            )
            for allowed_role in sorted(set(mapping.values())):
                cur.execute(
                    sql.SQL("REVOKE {} FROM {}").format(
                        sql.Identifier(allowed_role), sql.Identifier(role_name)
                    )
                )
            for allowed_role in pg_roles:
                cur.execute(
                    sql.SQL("GRANT {} TO {}").format(
                        sql.Identifier(allowed_role), sql.Identifier(role_name)
                    )
                )

    # 6-6. `psycopg.connect()` in the notebook needs no argument, all args in here
    return {
        "PGHOST": os.getenv("JUPYTER_DB_HOST", "jupyter-poc-postgres"),
        "PGPORT": os.getenv("JUPYTER_DB_PORT", "5432"),
        "PGDATABASE": os.getenv("JUPYTER_DB_NAME", "jupyter_poc"),
        "PGUSER": role_name,
        "PGPASSWORD": password,
        "PGSSLMODE": os.getenv("JUPYTER_DB_SSLMODE", "disable"),
        "JUPYTER_DB_GRANTED_ROLES": ",".join(pg_roles),
    }


c = get_config() 

c.JupyterHub.bind_url = "http://0.0.0.0:8000" # public
c.JupyterHub.hub_bind_url = "http://0.0.0.0:8081" # hub api <- notebook
c.JupyterHub.hub_connect_url = os.getenv(
    "JUPYTERHUB_HUB_CONNECT_URL", "http://d2e-jupyterhub:8081"
)
c.JupyterHub.cookie_secret_file = "/srv/jupyterhub/data/jupyterhub_cookie_secret"
c.JupyterHub.db_url = "sqlite:////srv/jupyterhub/data/jupyterhub.sqlite"


if os.getenv("JUPYTERHUB_CRYPT_KEY"):
    c.Authenticator.enable_auth_state = True

c.Authenticator.auth_refresh_age = 0

c.JupyterHub.authenticator_class = "generic-oauth"
c.GenericOAuthenticator.client_id = required_env("LOGTO_JUPYTERHUB_CLIENT_ID")
c.GenericOAuthenticator.client_secret = required_env(
    "LOGTO_JUPYTERHUB_CLIENT_SECRET"
)
# [flow 2] logto sends the browser back here; must be same as the redirect uri registered in logto
c.GenericOAuthenticator.oauth_callback_url = required_env(
    "JUPYTERHUB_OAUTH_CALLBACK_URL"
)
# [flow 1] browser is sent here to log in (https://localhost/oidc/auth)
c.GenericOAuthenticator.authorize_url = required_env("LOGTO_AUTHORIZE_URL")
# [flow 2] hub swaps the code for tokens here, server to server via caddy's internal http
c.GenericOAuthenticator.token_url = required_env("LOGTO_TOKEN_URL")
c.GenericOAuthenticator.userdata_from_id_token = True
c.GenericOAuthenticator.username_claim = os.getenv(
    "LOGTO_USERNAME_CLAIM", "username"
)
# login button text: now "Sign in with Data2Evidence"
c.GenericOAuthenticator.login_service = "Data2Evidence"

# [flow 1] scopes asked for; role.jupyteruser comes back only if the user holds it
c.GenericOAuthenticator.scope = [
    "openid",
    "profile",
    "email",
    "offline_access",
    required_env("LOGTO_ALLOWED_ROLE"),
] + [s for s in os.getenv("LOGTO_EXTRA_SCOPES", "").split() if s]
c.GenericOAuthenticator.extra_authorize_params = {
    "resource": os.getenv("LOGTO_RESOURCE", "https://alp-default")
}
c.GenericOAuthenticator.token_params = {
    "resource": os.getenv("LOGTO_RESOURCE", "https://alp-default")
}
# [flow 3] the gate: groups = granted scopes (granted_scopes above), must include role.jupyteruser
c.GenericOAuthenticator.manage_groups = True
c.GenericOAuthenticator.auth_state_groups_key = granted_scopes
c.GenericOAuthenticator.allowed_groups = {required_env("LOGTO_ALLOWED_ROLE")}
c.GenericOAuthenticator.allow_all = False
c.GenericOAuthenticator.allow_existing_users = False


# [flow 8] optional: after hub logout also pass through logto's end-session page, then back to /hub/login
_end_session = os.getenv("LOGTO_END_SESSION_URL")
if _end_session:
    _post_logout = os.getenv(
        "JUPYTERHUB_POST_LOGOUT_REDIRECT_URL",
        required_env("JUPYTERHUB_OAUTH_CALLBACK_URL").replace(
            "/hub/oauth_callback", "/hub/login"
        ),
    )
    c.GenericOAuthenticator.logout_redirect_url = (
        f"{_end_session}"
        f"?client_id={quote(required_env('LOGTO_JUPYTERHUB_CLIENT_ID'))}"
        f"&post_logout_redirect_uri={quote(_post_logout, safe='')}"
    )

# [flow 8] Stop the user's notebook container on logout instead of leaving it running.
c.JupyterHub.shutdown_on_logout = (
    os.getenv("JUPYTERHUB_SHUTDOWN_ON_LOGOUT", "true").lower() == "true"
)

# [flow 3] shown with the 403 when the user lacks role.jupyteruser
c.GenericOAuthenticator.custom_403_message = (
    "Your D2E account is valid, but it does not have the JupyterHub access role."
)

# [flow 5] called by jupyterhub right before the notebook container is created
def pass_user_credentials(spawner, auth_state):
    """Give a notebook only its short-lived, least-privilege DB credential."""
    if not auth_state:
        return
    if os.getenv("JUPYTER_DB_ENABLED", "false").lower() == "true":
        # PG* values become env vars of the notebook container; tokens are not passed
        spawner.environment.update(issue_database_credential(auth_state))


# [flow 5] register the hook above
c.Spawner.auth_state_hook = pass_user_credentials

# [flow 7] one docker container per user, created through the socket proxy (DOCKER_HOST)
c.JupyterHub.spawner_class = "dockerspawner.DockerSpawner"
c.DockerSpawner.image = os.getenv(
    "JUPYTERHUB_NOTEBOOK_IMAGE", "d2e-jupyter-notebook:local"
)
c.DockerSpawner.network_name = os.getenv(
    "DOCKER_NETWORK_NAME", "jupyterhub-notebooks-isolated"
)
c.DockerSpawner.use_internal_ip = True
c.DockerSpawner.remove = True
c.DockerSpawner.notebook_dir = "/home/jovyan/work"
c.DockerSpawner.volumes = {
    "jupyterhub-user-{username}": "/home/jovyan/work"
}
c.DockerSpawner.mem_limit = os.getenv("JUPYTERHUB_USER_MEM_LIMIT", "1G")
c.DockerSpawner.cpu_limit = float(os.getenv("JUPYTERHUB_USER_CPU_LIMIT", "1"))
c.Spawner.default_url = "/lab"
c.Spawner.start_timeout = 120

c.JupyterHub.log_level = os.getenv("JUPYTERHUB_LOG_LEVEL", "INFO")
