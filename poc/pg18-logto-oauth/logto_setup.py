"""Configure Logto for the pg18 OAuth PoC through the Management API. Idempotent.

Creates:
  - API resource https://pg.poc, set as Logto's default API, so a token request
    without `resource` (what psql's device flow sends) still gets a JWT for it
  - scopes and user roles on it:
      role jupyterhub-user  -> scope jupyter:hub         (may log in to JupyterHub)
      role jupyter-test     -> scope db:jupyter_test     (PG role jupyter_test, schema allowed)
      role jupyter-test-b   -> scope db:jupyter_test_b   (PG role jupyter_test_b, schema schema_b)
  - users: alice (hub + jupyter-test), carol (hub + jupyter-test-b), bob (no roles)
  - Native app `psql` with device flow, for interactive psql logins
  - Traditional app `jupyterhub` for the hub's login (callback on localhost:8000)
  - Traditional app `poc-tester` allowed to do token exchange, plus a personal
    access token per user, so tests can get user tokens without a browser

Prints KEY=value lines for .env.poc. Runs inside pg18's network namespace:
  docker run --rm --network container:pgoauth-pg18-1 -v "$PWD:/w:ro" \
    -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET python:3.12-alpine python /w/logto_setup.py
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

LOGTO = os.getenv("LOGTO_URL", "http://localhost:3001")
HUB = os.getenv("HUB_URL", "http://localhost:8000")
RESOURCE = "https://pg.poc"
ROLES = {  # role -> scope
    "jupyterhub-user": "jupyter:hub",
    "jupyter-test": "db:jupyter_test",
    "jupyter-test-b": "db:jupyter_test_b",
}
USERS = {  # username -> roles
    "alice": ["jupyterhub-user", "jupyter-test"],
    "carol": ["jupyterhub-user", "jupyter-test-b"],
    "bob": [],
}
PASSWORD = os.getenv("POC_USER_PASSWORD", "PocPassword-2026")


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
        return r.status, json.loads(raw) if raw.strip() else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def must(result, what):
    st, body = result
    if st >= 400:
        sys.exit(f"{what} failed: {st} {body}")
    return body


def management_headers():
    basic = base64.b64encode(
        f"{os.environ['LOGTO_M2M_ID']}:{os.environ['LOGTO_M2M_SECRET']}".encode()
    ).decode()
    token = must(call("/token", {"grant_type": "client_credentials",
                                 "resource": "https://default.logto.app/api", "scope": "all"},
                      method="POST", headers={"authorization": f"Basic {basic}"},
                      form=True, base=f"{LOGTO}/oidc"), "management token")
    return {"authorization": f"Bearer {token['access_token']}"}


def log(msg):
    print(msg, file=sys.stderr)


def find(items, **match):
    return next((i for i in items if all(i.get(k) == v for k, v in match.items())), None)


def app_secret(auth, app):
    # Logto 1.4x keeps app secrets behind their own endpoint
    secrets = must(call(f"/applications/{app['id']}/secrets", headers=auth), "list app secrets")
    found = find(secrets, name="poc")
    if found:
        return found["value"]
    return must(call(f"/applications/{app['id']}/secrets", {"name": "poc"},
                     method="POST", headers=auth), "create app secret")["value"]


def ensure_app(auth, apps, name, body):
    app = find(apps, name=name)
    if app is None:
        app = must(call("/applications", {"name": name, **body}, method="POST", headers=auth),
                   f"create app {name}")
        log(f"created app {name}")
    return app


def main():
    auth = management_headers()

    # 1. API resource, default API
    res = find(must(call("/resources", headers=auth), "list resources"), indicator=RESOURCE)
    if res is None:
        res = must(call("/resources", {"name": "PostgreSQL PoC", "indicator": RESOURCE,
                                       "accessTokenTtl": 3600}, method="POST", headers=auth),
                   "create resource")
        log(f"created resource {RESOURCE}")
    if not res.get("isDefault"):
        must(call(f"/resources/{res['id']}/is-default", {"isDefault": True},
                  method="PATCH", headers=auth), "set default resource")
        log(f"{RESOURCE} is now the default API")

    # 2. one scope per role, and the role carrying it
    scopes = must(call(f"/resources/{res['id']}/scopes", headers=auth), "list scopes")
    roles = must(call("/roles", headers=auth), "list roles")
    role_ids = {}
    for role_name, scope_name in ROLES.items():
        scope = find(scopes, name=scope_name)
        if scope is None:
            scope = must(call(f"/resources/{res['id']}/scopes", {"name": scope_name},
                              method="POST", headers=auth), f"create scope {scope_name}")
            log(f"created scope {scope_name}")
        role = find(roles, name=role_name)
        if role is None:
            role = must(call("/roles", {"name": role_name, "description": f"PoC: {scope_name}",
                                        "type": "User", "scopeIds": [scope["id"]]},
                             method="POST", headers=auth), f"create role {role_name}")
            log(f"created role {role_name}")
        role_ids[role_name] = role["id"]

    # 3. users and their roles
    out = {}
    for username, user_roles in USERS.items():
        user = find(must(call(f"/users?search={username}", headers=auth), "search users"),
                    username=username)
        if user is None:
            user = must(call("/users", {"username": username, "password": PASSWORD},
                             method="POST", headers=auth), f"create {username}")
            log(f"created user {username}")
        if user_roles:
            call(f"/users/{user['id']}/roles", {"roleIds": [role_ids[r] for r in user_roles]},
                 method="POST", headers=auth)
        out[f"POC_{username.upper()}_ID"] = user["id"]

    # 4. apps
    apps = must(call("/applications", headers=auth), "list applications")
    device = ensure_app(auth, apps, "psql", {
        "type": "Native",
        "oidcClientMetadata": {"redirectUris": [], "postLogoutRedirectUris": []},
        "customClientMetadata": {"isDeviceFlow": True},
    })
    hub = ensure_app(auth, apps, "jupyterhub", {
        "type": "Traditional",
        "oidcClientMetadata": {"redirectUris": [f"{HUB}/hub/oauth_callback"],
                               "postLogoutRedirectUris": [f"{HUB}/hub/login"]},
        "customClientMetadata": {"alwaysIssueRefreshToken": True, "rotateRefreshToken": True},
    })
    tester = ensure_app(auth, apps, "poc-tester", {
        "type": "Traditional",
        "oidcClientMetadata": {"redirectUris": ["http://localhost/unused"], "postLogoutRedirectUris": []},
        "customClientMetadata": {"allowTokenExchange": True},
    })
    out["POC_DEVICE_CLIENT_ID"] = device["id"]
    out["POC_HUB_CLIENT_ID"] = hub["id"]
    out["POC_HUB_CLIENT_SECRET"] = app_secret(auth, hub)
    out["POC_TESTER_ID"] = tester["id"]
    out["POC_TESTER_SECRET"] = app_secret(auth, tester)

    # 5. one personal access token per user, for browserless tests
    for username in USERS:
        uid = out[f"POC_{username.upper()}_ID"]
        pat = find(must(call(f"/users/{uid}/personal-access-tokens", headers=auth), "list PATs"),
                   name="poc-test")
        if pat is None:
            pat = must(call(f"/users/{uid}/personal-access-tokens", {"name": "poc-test"},
                            method="POST", headers=auth), f"create PAT for {username}")
        out[f"POC_{username.upper()}_PAT"] = pat["value"]

    for k, v in out.items():
        print(f"{k}={v}")


if __name__ == "__main__":
    main()
