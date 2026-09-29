"""Configure Logto for the pg18 OAuth PoC through the Management API. Idempotent.

Creates:
  - API resource https://pg.poc, set as Logto's default API, so a token request
    without `resource` (what psql's device flow sends) still gets a JWT for it
  - scope db:jupyter_test on it, and user role `jupyter-test` carrying that scope
  - users alice (has the role) and bob (does not)
  - Native app `psql` with device flow, for interactive psql logins
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
RESOURCE = "https://pg.poc"
SCOPE = "db:jupyter_test"
ROLE = "jupyter-test"
USERS = {"alice": True, "bob": False}  # username -> holds ROLE
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


def main():
    auth = management_headers()

    # 1. API resource, default API
    res = next((r for r in must(call("/resources", headers=auth), "list resources")
                if r["indicator"] == RESOURCE), None)
    if res is None:
        res = must(call("/resources", {"name": "PostgreSQL PoC", "indicator": RESOURCE,
                                       "accessTokenTtl": 3600}, method="POST", headers=auth),
                   "create resource")
        log(f"created resource {RESOURCE}")
    if not res.get("isDefault"):
        must(call(f"/resources/{res['id']}/is-default", {"isDefault": True},
                  method="PATCH", headers=auth), "set default resource")
        log(f"{RESOURCE} is now the default API")

    # 2. scope and role
    scope = next((s for s in must(call(f"/resources/{res['id']}/scopes", headers=auth), "list scopes")
                  if s["name"] == SCOPE), None)
    if scope is None:
        scope = must(call(f"/resources/{res['id']}/scopes",
                          {"name": SCOPE, "description": "log in to the PoC database as jupyter_test"},
                          method="POST", headers=auth), "create scope")
        log(f"created scope {SCOPE}")
    role = next((r for r in must(call("/roles", headers=auth), "list roles") if r["name"] == ROLE), None)
    if role is None:
        role = must(call("/roles", {"name": ROLE, "description": "PoC database access",
                                    "type": "User", "scopeIds": [scope["id"]]},
                         method="POST", headers=auth), "create role")
        log(f"created role {ROLE}")

    # 3. users
    out = {}
    for username, holds_role in USERS.items():
        found = must(call(f"/users?search={username}", headers=auth), "search users")
        user = next((u for u in found if u.get("username") == username), None)
        if user is None:
            user = must(call("/users", {"username": username, "password": PASSWORD},
                             method="POST", headers=auth), f"create {username}")
            log(f"created user {username}")
        if holds_role:
            call(f"/users/{user['id']}/roles", {"roleIds": [role["id"]]}, method="POST", headers=auth)
        out[f"POC_{username.upper()}_ID"] = user["id"]

    # 4. apps
    apps = must(call("/applications", headers=auth), "list applications")
    device = next((a for a in apps if a["name"] == "psql"), None)
    if device is None:
        device = must(call("/applications", {
            "name": "psql", "type": "Native",
            "oidcClientMetadata": {"redirectUris": [], "postLogoutRedirectUris": []},
            "customClientMetadata": {"isDeviceFlow": True},
        }, method="POST", headers=auth), "create device-flow app")
        log("created device-flow app psql")
    tester = next((a for a in apps if a["name"] == "poc-tester"), None)
    if tester is None:
        tester = must(call("/applications", {
            "name": "poc-tester", "type": "Traditional",
            "oidcClientMetadata": {"redirectUris": ["http://localhost/unused"], "postLogoutRedirectUris": []},
            "customClientMetadata": {"allowTokenExchange": True},
        }, method="POST", headers=auth), "create tester app")
        log("created token-exchange app poc-tester")
    # Logto 1.4x keeps app secrets behind their own endpoint
    secrets = must(call(f"/applications/{tester['id']}/secrets", headers=auth), "list app secrets")
    secret = next((s["value"] for s in secrets if s["name"] == "poc"), None)
    if secret is None:
        secret = must(call(f"/applications/{tester['id']}/secrets", {"name": "poc"},
                           method="POST", headers=auth), "create app secret")["value"]
    out["POC_DEVICE_CLIENT_ID"] = device["id"]
    out["POC_TESTER_ID"] = tester["id"]
    out["POC_TESTER_SECRET"] = secret

    # 5. one personal access token per user, for browserless tests
    for username in USERS:
        uid = out[f"POC_{username.upper()}_ID"]
        pats = must(call(f"/users/{uid}/personal-access-tokens", headers=auth), "list PATs")
        pat = next((p for p in pats if p["name"] == "poc-test"), None)
        if pat is None:
            pat = must(call(f"/users/{uid}/personal-access-tokens", {"name": "poc-test"},
                            method="POST", headers=auth), f"create PAT for {username}")
        out[f"POC_{username.upper()}_PAT"] = pat["value"]

    for k, v in out.items():
        print(f"{k}={v}")


if __name__ == "__main__":
    main()
