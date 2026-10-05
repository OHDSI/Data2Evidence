# [SETUP d2e] creates roles/scopes/users/hub app in D2E Logto (uses logto_setup.py helpers); prints .env.d2e values
"""Add the PoC roles, users and hub app to D2E's Logto, or remove them. Idempotent.

On D2E's API resource https://alp-default:
  role role.jupyteruser -> scope role.jupyteruser   (may log in to JupyterHub)
  role jupyter-test     -> scope db:jupyter_test    (PG role jupyter_test, schema allowed)
  role jupyter-test-b   -> scope db:jupyter_test_b  (PG role jupyter_test_b, schema schema_b)
users: alice (jupyteruser + jupyter-test), carol (jupyteruser + jupyter-test-b), bob (none)
app:   jupyterhub-pg18-poc (Traditional, callback http://localhost:8000/hub/oauth_callback)

Runs in a throwaway container on d2e_alp with the PoC folder mounted at /w:
  docker run --rm --network d2e_alp -v "$PWD/..:/w:ro" -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET \
    python:3.12-alpine python /w/d2e/d2e_setup.py [--remove]
Prints KEY=value lines for .env.d2e.
"""
import sys

sys.path.insert(0, "/w")
import logto_setup as s  # noqa: E402  (shared Management API helpers)

s.LOGTO = "http://d2e-logto-1:3001"
RESOURCE = "https://alp-default"
HUB = "http://localhost:8000"
APP = "jupyterhub-pg18-poc"
ROLES = {
    "role.jupyteruser": "role.jupyteruser",
    "jupyter-test": "db:jupyter_test",
    "jupyter-test-b": "db:jupyter_test_b",
}
USERS = {
    "alice": ["role.jupyteruser", "jupyter-test"],
    "carol": ["role.jupyteruser", "jupyter-test-b"],
    "bob": [],
}


def resource(auth):
    res = s.find(s.must(s.call("/resources", headers=auth), "list resources"), indicator=RESOURCE)
    if res is None:
        sys.exit(f"{RESOURCE} not found in D2E Logto")
    return res


def setup(auth):
    res = resource(auth)
    scopes = s.list_all(f"/resources/{res['id']}/scopes", auth)
    roles = s.list_all("/roles", auth)
    role_ids = {}
    for role_name, scope_name in ROLES.items():
        scope = s.find(scopes, name=scope_name)
        if scope is None:
            scope = s.must(s.call(f"/resources/{res['id']}/scopes", {"name": scope_name},
                                  method="POST", headers=auth), f"create scope {scope_name}")
            s.log(f"created scope {scope_name}")
        role = s.find(roles, name=role_name)
        if role is None:
            role = s.must(s.call("/roles", {"name": role_name, "description": f"PG18 PoC: {scope_name}",
                                            "type": "User", "scopeIds": [scope["id"]]},
                                 method="POST", headers=auth), f"create role {role_name}")
            s.log(f"created role {role_name}")
        role_ids[role_name] = role["id"]

    for username, user_roles in USERS.items():
        user = s.find(s.list_all(f"/users?search={username}", auth),
                      username=username)
        if user is None:
            user = s.must(s.call("/users", {"username": username, "password": s.PASSWORD},
                                 method="POST", headers=auth), f"create {username}")
            s.log(f"created user {username}")
        if user_roles:
            s.call(f"/users/{user['id']}/roles", {"roleIds": [role_ids[r] for r in user_roles]},
                   method="POST", headers=auth)

    apps = s.must(s.call("/applications", headers=auth), "list applications")
    hub = s.find(apps, name=APP)
    if hub is None:
        st, body = s.call("/applications", {
            "name": APP, "type": "Traditional",
            "oidcClientMetadata": {"redirectUris": [f"{HUB}/hub/oauth_callback"],
                                   "postLogoutRedirectUris": [f"{HUB}/hub/login"]},
            "customClientMetadata": {"alwaysIssueRefreshToken": True, "rotateRefreshToken": True},
        }, method="POST", headers=auth)
        # D2E Logto 1.23 answers 500 here: the app row is saved, storing the extra secret row
        # fails (logto.check_application_type misses the schema). Use the saved app.
        hub = s.find(s.must(s.call("/applications", headers=auth), "list applications"), name=APP)
        if hub is None:
            sys.exit(f"create app {APP} failed: {st} {body}")
        s.log(f"created app {APP}" + ("" if st < 400 else f" (Logto answered {st}; app was saved)"))
    # Logto 1.23 returns the secret on the app; newer versions keep it behind /secrets
    secret = hub.get("secret") or s.app_secret(auth, hub)
    print(f"POC_HUB_CLIENT_ID={hub['id']}")
    print(f"POC_HUB_CLIENT_SECRET={secret}")


def remove(auth):
    for username in USERS:
        user = s.find(s.list_all(f"/users?search={username}", auth),
                      username=username)
        if user:
            s.call(f"/users/{user['id']}", method="DELETE", headers=auth)
            s.log(f"deleted user {username}")
    for role in s.list_all("/roles", auth):
        if role["name"] in ROLES:
            s.call(f"/roles/{role['id']}", method="DELETE", headers=auth)
            s.log(f"deleted role {role['name']}")
    res = resource(auth)
    for scope in s.list_all(f"/resources/{res['id']}/scopes", auth):
        if scope["name"] in ROLES.values():
            s.call(f"/resources/{res['id']}/scopes/{scope['id']}", method="DELETE", headers=auth)
            s.log(f"deleted scope {scope['name']}")
    app = s.find(s.must(s.call("/applications", headers=auth), "list applications"), name=APP)
    if app:
        s.call(f"/applications/{app['id']}", method="DELETE", headers=auth)
        s.log(f"deleted app {APP}")


if __name__ == "__main__":
    auth = s.management_headers()
    remove(auth) if "--remove" in sys.argv else setup(auth)
