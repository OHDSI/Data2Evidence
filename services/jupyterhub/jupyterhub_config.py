import os
from urllib.parse import quote


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


def granted_scopes(auth_state: dict) -> list[str]:
    """Map Logto's granted scopes > JupyterHub groups.
    """
    token_response = auth_state.get("token_response") or {}
    scopes = token_response.get("scope") or auth_state.get("scope") or []
    if isinstance(scopes, str):
        scopes = scopes.split()
    return [scope for scope in scopes if isinstance(scope, str)]


c = get_config()  # noqa: F821 - provided by JupyterHub at runtime

c.JupyterHub.bind_url = "http://0.0.0.0:8000"
c.JupyterHub.hub_bind_url = "http://0.0.0.0:8081"
c.JupyterHub.hub_connect_url = os.getenv(
    "JUPYTERHUB_HUB_CONNECT_URL", "http://d2e-jupyterhub:8081"
)
c.JupyterHub.cookie_secret_file = "/srv/jupyterhub/data/jupyterhub_cookie_secret"
c.JupyterHub.db_url = "sqlite:////srv/jupyterhub/data/jupyterhub.sqlite"


# Persisting auth_state keeps the Logto tokens, which is what a notebook would
# need in order to call D2E APIs as the logged-in user. Requires
# JUPYTERHUB_CRYPT_KEY (32 bytes of hex).
if os.getenv("JUPYTERHUB_CRYPT_KEY"):
    c.Authenticator.enable_auth_state = True

# Periodic re-validation is disabled because it is broken in this combination.
# OAuthenticator.refresh_user re-runs _token_to_auth_model over the *stored*
# token response, and with userdata_from_id_token that decodes the stored id
# token with exp validation on. Once the id token expires, roughly an hour after
# login, it raises tornado.web.HTTPError, which the surrounding handler only
# catches for HTTPClientError, so it escapes as a 500 and every authenticated
# request is rejected with "Missing or invalid credentials" - the refresh token
# is never tried. Authorization does not rely on this: allow_existing_users is
# False below, so the Logto role is re-read on every login.
c.Authenticator.auth_refresh_age = 0

c.JupyterHub.authenticator_class = "generic-oauth"
c.GenericOAuthenticator.client_id = required_env("LOGTO_JUPYTERHUB_CLIENT_ID")
c.GenericOAuthenticator.client_secret = required_env(
    "LOGTO_JUPYTERHUB_CLIENT_SECRET"
)
c.GenericOAuthenticator.oauth_callback_url = required_env(
    "JUPYTERHUB_OAUTH_CALLBACK_URL"
)
c.GenericOAuthenticator.authorize_url = required_env("LOGTO_AUTHORIZE_URL")
c.GenericOAuthenticator.token_url = required_env("LOGTO_TOKEN_URL")
c.GenericOAuthenticator.userdata_from_id_token = True
c.GenericOAuthenticator.username_claim = os.getenv(
    "LOGTO_USERNAME_CLAIM", "username"
)
c.GenericOAuthenticator.login_service = "D2E Logto"
c.GenericOAuthenticator.scope = [
    "openid",
    "profile",
    "email",
    "offline_access",
    required_env("LOGTO_ALLOWED_ROLE"),
]
c.GenericOAuthenticator.extra_authorize_params = {
    "resource": os.getenv("LOGTO_RESOURCE", "https://alp-default")
}
c.GenericOAuthenticator.token_params = {
    "resource": os.getenv("LOGTO_RESOURCE", "https://alp-default")
}
c.GenericOAuthenticator.manage_groups = True
c.GenericOAuthenticator.auth_state_groups_key = granted_scopes
c.GenericOAuthenticator.allowed_groups = {required_env("LOGTO_ALLOWED_ROLE")}
c.GenericOAuthenticator.allow_all = False
c.GenericOAuthenticator.allow_existing_users = False


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

# Stop the user's notebook container on logout instead of leaving it running.
c.JupyterHub.shutdown_on_logout = (
    os.getenv("JUPYTERHUB_SHUTDOWN_ON_LOGOUT", "true").lower() == "true"
)

c.GenericOAuthenticator.custom_403_message = (
    "Your D2E account is valid, but it does not have the JupyterHub access role."
)

c.JupyterHub.spawner_class = "dockerspawner.DockerSpawner"
c.DockerSpawner.image = os.getenv(
    "JUPYTERHUB_NOTEBOOK_IMAGE", "quay.io/jupyterhub/singleuser:5.4.2"
)
# Notebooks are isolated from the D2E network on purpose. Pointing this at the
# D2E network would give every notebook, which is arbitrary user code, a route
# to Postgres, Redis and Logto's management API.
c.DockerSpawner.network_name = os.getenv(
    "DOCKER_NETWORK_NAME", "jupyterhub-notebooks"
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
