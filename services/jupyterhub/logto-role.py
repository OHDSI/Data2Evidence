#!/usr/bin/env python3
"""Grant, revoke or list the JupyterHub Logto role, for PoC testing.

Logto is only reachable from inside the D2E Docker network, so run this in a
throwaway container on that network with this directory mounted read-only. It
needs no image of its own and nothing is copied into a running container:

    docker run --rm --network d2e_alp -v "$PWD/services/jupyterhub:/s:ro" \
      -e LOGTO_API_M2M_CLIENT_ID -e LOGTO_API_M2M_CLIENT_SECRET \
      python:3.12-alpine python /s/logto-role.py list

    ... /s/logto-role.py grant <username>
    ... /s/logto-role.py revoke <username>

Export the two credentials first; on the local stack they come from the Logto
container itself:

    export LOGTO_API_M2M_CLIENT_ID=$(docker exec d2e-logto-1 printenv LOGTO_API_M2M_CLIENT_ID)
    export LOGTO_API_M2M_CLIENT_SECRET=$(docker exec d2e-logto-1 printenv LOGTO_API_M2M_CLIENT_SECRET)

Point LOGTO_OIDC_TOKEN_URL and LOGTO_ADMIN_URL elsewhere for another
deployment, and --network at that deployment's network.
"""
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
    """Logto answers some writes with 201/204 and a non-JSON or empty body."""
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


def find_role(auth):
    st, roles = call(f"{ADMIN}/api/roles", headers=auth)
    if st != 200:
        sys.exit(f"could not list roles: {st} {roles}")
    for r in roles:
        if r["name"] == ROLE:
            return r["id"]
    sys.exit(f"role {ROLE} does not exist in Logto")


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


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in {"list", "grant", "revoke"}:
        sys.exit(f"usage: {sys.argv[0]} list | grant <username> | revoke <username>")
    action = sys.argv[1]
    auth = management_token()
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
