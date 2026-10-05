# [FLOW-1] hub: Logto login, gate on the hub scope, refresh the token at spawn and put it in the notebook env
# JupyterHub for the PG18 OAuth PoC: log in with Logto, hand the notebook the Logto token.
# Copied into the hub image (hub/Dockerfile), not mounted: rebuild after editing.
#
# runtime flow for one user
#   [flow 1] browser -> logto login page
#   [flow 2] logto -> hub callback, hub gets tokens
#   [flow 3] hub checks the hub-access scope (LOGTO_ALLOWED_ROLE)
#   [flow 4] hub stores tokens (auth_state, encrypted with JUPYTERHUB_CRYPT_KEY)
#   [flow 5] user clicks start -> hook runs, refreshes the token
#   [flow 6] notebook container starts with LOGTO_ACCESS_TOKEN; pg_oauth.py logs in to PG18
#   [flow 7] logout
import base64
import json
import os
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


# get all env(.env)
def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


# map logto's granted scopes into jupyterhub groups
def granted_scopes(auth_state: dict) -> list[str]:
    # [flow 3] called on every login
    token_response = auth_state.get("token_response") or {}
    scopes = token_response.get("scope") or auth_state.get("scope") or []
    if isinstance(scopes, str):
        scopes = scopes.split()
    return [scope for scope in scopes if isinstance(scope, str)]


# swap the stored refresh token for a fresh access token (and the rotated refresh token)
def refreshed_token_state(auth_state: dict) -> dict:
    refresh_token = auth_state.get("refresh_token")
    if not refresh_token:
        return auth_state
    basic = base64.b64encode(
        f"{quote(required_env('LOGTO_JUPYTERHUB_CLIENT_ID'))}:"
        f"{quote(required_env('LOGTO_JUPYTERHUB_CLIENT_SECRET'))}".encode()
    ).decode()
    body = urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "resource": required_env("LOGTO_RESOURCE"),
    }).encode()
    request = Request(required_env("LOGTO_TOKEN_URL"), body, {
        "authorization": f"Basic {basic}",
        "content-type": "application/x-www-form-urlencoded",
    })
    with urlopen(request, timeout=15) as response:
        tokens = json.loads(response.read())
    return {
        **auth_state,
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", refresh_token),
    }


# [flow 5] called by jupyterhub right before the notebook container is created
async def pass_access_token(spawner, auth_state):
    # only the fresh access token and where to connect go to the notebook,
    # never the refresh token or the client secret
    if not auth_state:
        return
    auth_state = refreshed_token_state(auth_state)
    await spawner.user.save_auth_state(auth_state)  # keep the rotated refresh token
    spawner.environment["LOGTO_ACCESS_TOKEN"] = auth_state["access_token"]
    for name in ("PGHOST", "PGPORT", "PGDATABASE", "PG_OAUTH_ISSUER", "PG_OAUTH_CLIENT_ID"):
        value = os.getenv(f"NOTEBOOK_{name}")
        if value:
            spawner.environment[name] = value


c = get_config()  # noqa: F821 - provided by JupyterHub at runtime

c.JupyterHub.bind_url = "http://0.0.0.0:8000"  # public
c.JupyterHub.hub_bind_url = "http://0.0.0.0:8081"  # hub api <- notebook
c.JupyterHub.hub_connect_url = required_env("JUPYTERHUB_HUB_CONNECT_URL")
c.JupyterHub.cookie_secret_file = "/srv/jupyterhub/data/jupyterhub_cookie_secret"
c.JupyterHub.db_url = "sqlite:////srv/jupyterhub/data/jupyterhub.sqlite"

# [flow 4] keep the tokens; without a crypt key nothing is stored and no token reaches the notebook
c.Authenticator.enable_auth_state = bool(os.getenv("JUPYTERHUB_CRYPT_KEY"))
# periodic re-validation re-decodes the expired id token and fails; role is re-read at each login
c.Authenticator.auth_refresh_age = 0

c.JupyterHub.authenticator_class = "generic-oauth"
c.GenericOAuthenticator.client_id = required_env("LOGTO_JUPYTERHUB_CLIENT_ID")
c.GenericOAuthenticator.client_secret = required_env("LOGTO_JUPYTERHUB_CLIENT_SECRET")
# [flow 2] logto sends the browser back here; must equal the redirect uri registered in logto
c.GenericOAuthenticator.oauth_callback_url = required_env("JUPYTERHUB_OAUTH_CALLBACK_URL")
# [flow 1] browser is sent here to log in
c.GenericOAuthenticator.authorize_url = required_env("LOGTO_AUTHORIZE_URL")
# [flow 2] hub swaps the code for tokens here, server to server
c.GenericOAuthenticator.token_url = required_env("LOGTO_TOKEN_URL")
c.GenericOAuthenticator.userdata_from_id_token = True
c.GenericOAuthenticator.username_claim = os.getenv("LOGTO_USERNAME_CLAIM", "username")
c.GenericOAuthenticator.login_service = "Data2Evidence"  # "Sign in with Data2Evidence"

# [flow 1] scopes asked for; logto grants only the ones the user's roles hold
c.GenericOAuthenticator.scope = [
    "openid",
    "profile",
    "email",
    "offline_access",
    required_env("LOGTO_ALLOWED_ROLE"),
] + [s for s in os.getenv("LOGTO_EXTRA_SCOPES", "").split() if s]
# the access token is a JWT for this API resource; PG18 checks its scopes
c.GenericOAuthenticator.extra_authorize_params = {"resource": required_env("LOGTO_RESOURCE")}
c.GenericOAuthenticator.token_params = {"resource": required_env("LOGTO_RESOURCE")}
# [flow 3] the gate: groups = granted scopes, must include LOGTO_ALLOWED_ROLE
c.GenericOAuthenticator.manage_groups = True
c.GenericOAuthenticator.auth_state_groups_key = granted_scopes
c.GenericOAuthenticator.allowed_groups = {required_env("LOGTO_ALLOWED_ROLE")}
c.GenericOAuthenticator.allow_all = False
c.GenericOAuthenticator.allow_existing_users = False
c.GenericOAuthenticator.custom_403_message = (
    "Your account is valid, but it does not have the JupyterHub access role."
)

# [flow 7] stop the user's notebook container on logout
c.JupyterHub.shutdown_on_logout = True

# [flow 5] register the hook above
c.Spawner.auth_state_hook = pass_access_token

# [flow 6] one docker container per user, on the internal notebook network only
c.JupyterHub.spawner_class = "dockerspawner.DockerSpawner"
c.DockerSpawner.image = required_env("JUPYTERHUB_NOTEBOOK_IMAGE")
c.DockerSpawner.network_name = required_env("DOCKER_NETWORK_NAME")
c.DockerSpawner.use_internal_ip = True
c.DockerSpawner.remove = True
c.DockerSpawner.notebook_dir = "/home/jovyan/work"
c.DockerSpawner.volumes = {"jupyterhub-user-{username}": "/home/jovyan/work"}
c.DockerSpawner.mem_limit = "1G"
c.DockerSpawner.cpu_limit = 1.0
c.Spawner.default_url = "/lab"
c.Spawner.start_timeout = 120

c.JupyterHub.log_level = os.getenv("JUPYTERHUB_LOG_LEVEL", "INFO")
