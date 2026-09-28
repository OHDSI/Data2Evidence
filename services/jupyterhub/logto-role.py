# test file for grant / list, revokre for role.jupyteruser
# only for manual test
# `setup` registers the scope, role and jupyterhub app in logto on a fresh stack

import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

TOKEN_URL = os.getenv("LOGTO_OIDC_TOKEN_URL", "http://d2e-logto-1:3001/oidc/token")
ADMIN = os.getenv("LOGTO_ADMIN_URL", "http://d2e-logto-1:3002")
ROLE = os.getenv("LOGTO_ALLOWED_ROLE", "role.jupyteruser")


def decode(raw):
    if not raw.strip():
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def call(url, data=None, method=None, headers=None, form=False):
    h = dict(headers or {})
    body = None
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
            h["content-type"] = "application/x-www-form-urlencoded"
        else:
            body = json.dumps(data).encode()
            h["content-type"] = "application/json"
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(url, body, h, method=method), timeout=30
        )
        return r.status, decode(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# get logto api token
def management_token():
    cid = os.environ["LOGTO_API_M2M_CLIENT_ID"]
    secret = os.environ["LOGTO_API_M2M_CLIENT_SECRET"]
    basic = base64.b64encode(
        f"{urllib.parse.quote(cid)}:{urllib.parse.quote(secret)}".encode()
    ).decode()
    st, body = call(
        TOKEN_URL,
        {
            "grant_type": "client_credentials",
            "resource": "https://default.logto.app/api",
            "scope": "all",
        },
        method="POST",
        headers={"authorization": f"Basic {basic}"},
        form=True,
    )
    if st != 200:
        sys.exit(f"could not get a management token: {st} {body}")
    return {"authorization": f"Bearer {body['access_token']}"}

# role name to internal id conversion
def find_role(auth):
    st, roles = call(f"{ADMIN}/api/roles", headers=auth)
    if st != 200:
        sys.exit(f"could not list roles: {st} {roles}")
    for r in roles:
        if r["name"] == ROLE:
            return r["id"]
    sys.exit(f"role {ROLE} does not exist in Logto")

# find user and convert to internal id
def find_user(auth, username):
    st, users = call(
        f"{ADMIN}/api/users?search={urllib.parse.quote(username)}", headers=auth
    )
    if st != 200:
        sys.exit(f"could not search users: {st} {users}")
    for u in users:
        if u.get("username") == username:
            return u["id"]
    sys.exit(f"no user named {username}")


# first-time setup: create the scope, role and jupyterhub app if missing; safe to run again
def setup(auth):
    resource = os.getenv("LOGTO_RESOURCE", "https://alp-default")
    public_url = os.getenv("JUPYTERHUB__PUBLIC_URL", "http://localhost:8000").rstrip("/")
    app_name = os.getenv("LOGTO_APP_NAME", "jupyterhub")

    # 1. role scopes live on the alp-default api resource
    st, resources = call(f"{ADMIN}/api/resources", headers=auth)
    if st != 200:
        sys.exit(f"could not list resources: {st} {resources}")
    res = next((r for r in resources if r["indicator"] == resource), None)
    if res is None:
        sys.exit(f"api resource {resource} does not exist in Logto")
    st, scopes = call(f"{ADMIN}/api/resources/{res['id']}/scopes", headers=auth)
    scope = next((s for s in scopes if s["name"] == ROLE), None)
    if scope is None:
        st, scope = call(f"{ADMIN}/api/resources/{res['id']}/scopes",
                         {"name": ROLE, "description": "JupyterHub user"}, method="POST", headers=auth)
        if st >= 400:
            sys.exit(f"could not create scope: {st} {scope}")
        print(f"created scope {ROLE} on {resource}")
    else:
        print(f"scope {ROLE} exists")

    # 2. user role that carries that scope
    st, roles = call(f"{ADMIN}/api/roles", headers=auth)
    role = next((r for r in roles if r["name"] == ROLE), None)
    if role is None:
        st, role = call(f"{ADMIN}/api/roles",
                        {"name": ROLE, "description": "JupyterHub user", "type": "User",
                         "scopeIds": [scope["id"]]}, method="POST", headers=auth)
        if st >= 400:
            sys.exit(f"could not create role: {st} {role}")
        print(f"created role {ROLE}")
    else:
        st, have = call(f"{ADMIN}/api/roles/{role['id']}/scopes", headers=auth)
        if not any(s["id"] == scope["id"] for s in have):
            call(f"{ADMIN}/api/roles/{role['id']}/scopes", {"scopeIds": [scope["id"]]},
                 method="POST", headers=auth)
            print(f"attached scope to role {ROLE}")
        else:
            print(f"role {ROLE} exists")

    # 3. traditional web app the hub logs in with; reuse one that already has our callback
    callback = f"{public_url}/hub/oauth_callback"
    st, apps = call(f"{ADMIN}/api/applications", headers=auth)
    app = next((a for a in apps
                if callback in (a.get("oidcClientMetadata") or {}).get("redirectUris", [])), None)
    if app is None:
        st, app = call(f"{ADMIN}/api/applications",
                       {"name": app_name, "type": "Traditional",
                        "oidcClientMetadata": {"redirectUris": [callback],
                                               "postLogoutRedirectUris": [f"{public_url}/hub/login"]}},
                       method="POST", headers=auth)
        if st >= 400:
            sys.exit(f"could not create application: {st} {app}")
        print(f"created application {app['id']}")
    else:
        print(f"application {app['id']} already has {callback}")

    # values for .env.jupyterhub-local; they must match this app
    print("\n# put these in .env.jupyterhub-local")
    print(f"LOGTO__JUPYTERHUB__CLIENT_ID={app['id']}")
    print(f"LOGTO__JUPYTERHUB__CLIENT_SECRET={app['secret']}")
    print(f"JUPYTERHUB__PUBLIC_URL={public_url}")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in {"setup", "list", "grant", "revoke"}:
        sys.exit(f"usage: {sys.argv[0]} setup | list | grant <username> | revoke <username>")
    action = sys.argv[1]
    auth = management_token()
    if action == "setup":
        setup(auth)
        return
    role_id = find_role(auth)

    if action == "list":
        st, users = call(f"{ADMIN}/api/roles/{role_id}/users", headers=auth)
        if st != 200:
            sys.exit(f"could not list role members: {st} {users}")
        print(f"users holding {ROLE}:")
        for u in users:
            print(f"  {u.get('username')}  ({u['id']})")
        if not users:
            print("  (none)")
        return

    username = sys.argv[2] if len(sys.argv) > 2 else sys.exit("username required")
    user_id = find_user(auth, username)

    if action == "grant":
        st, body = call(
            f"{ADMIN}/api/users/{user_id}/roles",
            {"roleIds": [role_id]},
            method="POST",
            headers=auth,
        )
        print(f"grant {ROLE} to {username}: {st} {body if st >= 400 else 'ok'}")
    else:
        st, body = call(
            f"{ADMIN}/api/users/{user_id}/roles/{role_id}", method="DELETE", headers=auth
        )
        print(f"revoke {ROLE} from {username}: {st} {body if st >= 400 else 'ok'}")


if __name__ == "__main__":
    main()
