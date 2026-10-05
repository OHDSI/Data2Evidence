# [SETUP] creates roles/scopes/users/hub app in D2E Logto, or removes them; prints .env.poc values
"""Add the PoC roles, users and hub app to D2E's Logto, or remove them. Idempotent.

On D2E's API resource https://alp-default:
  role role.jupyteruser -> scope role.jupyteruser   (may log in to JupyterHub)
  role jupyter-test     -> scope db:jupyter_test    (PG role jupyter_test, schema allowed)
  role jupyter-test-b   -> scope db:jupyter_test_b  (PG role jupyter_test_b, schema schema_b)
users: alice (jupyteruser + jupyter-test), carol (jupyteruser + jupyter-test-b), bob (none)
app:   jupyterhub-pg18-poc (Traditional, callback http://localhost:8000/hub/oauth_callback)

run.sh calls it in a throwaway container on d2e_alp:
  docker run --rm --network d2e_alp -v "$PWD:/w:ro" -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET \
    python:3.12-alpine python /w/logto_setup.py [--remove]
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

LOGTO = "http://d2e-logto-1:3001"   # D2E Logto inside d2e_alp: /oidc for tokens, /api for management
RESOURCE = "https://alp-default"     # D2E's API resource; the token's aud
HUB = "http://localhost:8000"
APP = "jupyterhub-pg18-poc"
PASSWORD = os.getenv("POC_USER_PASSWORD", "PocPassword-2026")
ROLES = {  # logto role -> scope it carries
    "role.jupyteruser": "role.jupyteruser",
    "jupyter-test": "db:jupyter_test",
    "jupyter-test-b": "db:jupyter_test_b",
}
USERS = {  # username -> logto roles
    "alice": ["role.jupyteruser", "jupyter-test"],
    "carol": ["role.jupyteruser", "jupyter-test-b"],
    "bob": [],
}


# one HTTP call to Logto; returns (status, parsed body)
def call(path, data=None, method=None, headers=None, form=False, base=None):
    h = dict(headers or {})
    body = None
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
            h["content-type"] = "application/x-www-form-urlencoded"
        else:
            body = json.dumps(data).encode()
            h["content-type"] = "application/json"
    req = urllib.request.Request((base or f"{LOGTO}/api") + path, body, h, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=30)
        raw = r.read().decode()
        if not raw.strip():
            return r.status, None
        try:
            return r.status, json.loads(raw)
        except json.JSONDecodeError:
            # Logto 1.23 (D2E) answers some writes with plain text, e.g. "Created"
            return r.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


# stop with a message on an HTTP error
def must(result, what):
    st, body = result
    if st >= 400:
        sys.exit(f"{what} failed: {st} {body}")
    return body


# every item of a list endpoint; /roles and /users return only 20 per page by default
def list_all(path, headers):
    items, page = [], 1
    sep = "&" if "?" in path else "?"
    while True:
        batch = must(call(f"{path}{sep}page={page}&page_size=100", headers=headers), f"list {path}")
        items += batch
        if len(batch) < 100:
            return items
        page += 1


def find(items, **match):
    return next((i for i in items if all(i.get(k) == v for k, v in match.items())), None)


def log(msg):
    print(msg, file=sys.stderr)


# management API token from D2E's M2M app (credentials passed in by run.sh)
def management_headers():
    basic = base64.b64encode(
        f"{os.environ['LOGTO_M2M_ID']}:{os.environ['LOGTO_M2M_SECRET']}".encode()
    ).decode()
    token = must(call("/token", {"grant_type": "client_credentials",
                                 "resource": "https://default.logto.app/api", "scope": "all"},
                      method="POST", headers={"authorization": f"Basic {basic}"},
                      form=True, base=f"{LOGTO}/oidc"), "management token")
    return {"authorization": f"Bearer {token['access_token']}"}


def resource(auth):
    res = find(must(call("/resources", headers=auth), "list resources"), indicator=RESOURCE)
    if res is None:
        sys.exit(f"{RESOURCE} not found in D2E Logto")
    return res


def setup(auth):
    # 1. one scope per role on alp-default, and the role carrying it
    res = resource(auth)
    scopes = list_all(f"/resources/{res['id']}/scopes", auth)
    roles = list_all("/roles", auth)
    role_ids = {}
    for role_name, scope_name in ROLES.items():
        scope = find(scopes, name=scope_name)
        if scope is None:
            scope = must(call(f"/resources/{res['id']}/scopes", {"name": scope_name},
                              method="POST", headers=auth), f"create scope {scope_name}")
            log(f"created scope {scope_name}")
        role = find(roles, name=role_name)
        if role is None:
            role = must(call("/roles", {"name": role_name, "description": f"PG18 PoC: {scope_name}",
                                        "type": "User", "scopeIds": [scope["id"]]},
                             method="POST", headers=auth), f"create role {role_name}")
            log(f"created role {role_name}")
        role_ids[role_name] = role["id"]

    # 2. users and their roles
    for username, user_roles in USERS.items():
        user = find(list_all(f"/users?search={username}", auth), username=username)
        if user is None:
            user = must(call("/users", {"username": username, "password": PASSWORD},
                             method="POST", headers=auth), f"create {username}")
            log(f"created user {username}")
        if user_roles:
            call(f"/users/{user['id']}/roles", {"roleIds": [role_ids[r] for r in user_roles]},
                 method="POST", headers=auth)

    # 3. the hub's app
    hub = find(must(call("/applications", headers=auth), "list applications"), name=APP)
    if hub is None:
        st, body = call("/applications", {
            "name": APP, "type": "Traditional",
            "oidcClientMetadata": {"redirectUris": [f"{HUB}/hub/oauth_callback"],
                                   "postLogoutRedirectUris": [f"{HUB}/hub/login"]},
            "customClientMetadata": {"alwaysIssueRefreshToken": True, "rotateRefreshToken": True},
        }, method="POST", headers=auth)
        # D2E Logto 1.23 answers 500 here: the app row is saved, storing the extra secret row
        # fails (logto.check_application_type misses the schema). Use the saved app.
        hub = find(must(call("/applications", headers=auth), "list applications"), name=APP)
        if hub is None:
            sys.exit(f"create app {APP} failed: {st} {body}")
        log(f"created app {APP}" + ("" if st < 400 else f" (Logto answered {st}; app was saved)"))
    if not hub.get("secret"):
        sys.exit(f"app {APP} has no secret")
    print(f"POC_HUB_CLIENT_ID={hub['id']}")
    print(f"POC_HUB_CLIENT_SECRET={hub['secret']}")


def remove(auth):
    for username in USERS:
        user = find(list_all(f"/users?search={username}", auth), username=username)
        if user:
            call(f"/users/{user['id']}", method="DELETE", headers=auth)
            log(f"deleted user {username}")
    for role in list_all("/roles", auth):
        if role["name"] in ROLES:
            call(f"/roles/{role['id']}", method="DELETE", headers=auth)
            log(f"deleted role {role['name']}")
    res = resource(auth)
    for scope in list_all(f"/resources/{res['id']}/scopes", auth):
        if scope["name"] in ROLES.values():
            call(f"/resources/{res['id']}/scopes/{scope['id']}", method="DELETE", headers=auth)
            log(f"deleted scope {scope['name']}")
    app = find(must(call("/applications", headers=auth), "list applications"), name=APP)
    if app:
        call(f"/applications/{app['id']}", method="DELETE", headers=auth)
        log(f"deleted app {APP}")


if __name__ == "__main__":
    auth = management_headers()
    remove(auth) if "--remove" in sys.argv else setup(auth)
