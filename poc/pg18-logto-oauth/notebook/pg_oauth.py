"""Connect to PostgreSQL 18 with the Logto access token JupyterHub gave this notebook.

No released Python driver speaks PostgreSQL 18's OAuth yet, so this installs libpq's
own OAuth hook (PQsetAuthDataHook) with ctypes. psycopg must use the same system
libpq 18, which is why the image sets PSYCOPG_IMPL=python and has no psycopg[binary].

    import pg_oauth
    pg_oauth.scopes()                  # {'db:jupyter_test'}
    conn = pg_oauth.connect()          # logs in as the role named in the token scope
    conn.execute("select * from allowed.demo").fetchall()

The token comes from LOGTO_ACCESS_TOKEN, set by the hub when the server starts.
It expires after about an hour; restart the server (Hub Control Panel) for a new one.
"""
import base64
import ctypes
import ctypes.util
import json
import os
import time

import psycopg

_PQAUTHDATA_OAUTH_BEARER_TOKEN = 1  # PGauthData in libpq-fe.h (18)
_SCOPE_PREFIX = "db:"               # scope db:<role> lets you log in as <role>


class _BearerRequest(ctypes.Structure):
    # PGoauthBearerRequest from libpq-fe.h (18)
    _fields_ = [
        ("openid_configuration", ctypes.c_char_p),
        ("scope", ctypes.c_char_p),
        ("async_", ctypes.c_void_p),
        ("cleanup", ctypes.c_void_p),
        ("token", ctypes.c_void_p),
        ("user", ctypes.c_void_p),
    ]


_libpq = ctypes.CDLL(ctypes.util.find_library("pq") or "libpq.so.5")
_libc = ctypes.CDLL(None)
_libc.strdup.restype = ctypes.c_void_p
_libc.strdup.argtypes = [ctypes.c_char_p]

if _libpq.PQlibVersion() < 180000:
    raise ImportError(f"libpq {_libpq.PQlibVersion()} found; PostgreSQL 18 libpq is required")

_HOOK = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p)
_libpq.PQdefaultAuthDataHook.restype = ctypes.c_int
_libpq.PQdefaultAuthDataHook.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p]
_current_token = None


def _hook(kind, conn, data):
    # libpq asks for a token: hand it the one we hold; anything else goes to libpq's default
    if kind == _PQAUTHDATA_OAUTH_BEARER_TOKEN and _current_token:
        request = ctypes.cast(data, ctypes.POINTER(_BearerRequest)).contents
        request.token = _libc.strdup(_current_token.encode())  # small leak per connection
        return 1
    return _libpq.PQdefaultAuthDataHook(kind, conn, data)


_hook_ref = _HOOK(_hook)  # keep a reference, or the callback gets garbage collected
_libpq.PQsetAuthDataHook(_hook_ref)


def token():
    """The access token from the hub, checked for expiry."""
    value = os.environ.get("LOGTO_ACCESS_TOKEN")
    if not value:
        raise RuntimeError("LOGTO_ACCESS_TOKEN is not set; the hub did not pass a token")
    if claims(value).get("exp", 0) < time.time():
        raise RuntimeError("the access token has expired; restart your server from the Hub Control Panel")
    return value


def claims(value=None):
    """Decoded claims of the token, for inspection only (no signature check)."""
    part = (value or os.environ.get("LOGTO_ACCESS_TOKEN", "")).split(".")
    if len(part) != 3:
        raise RuntimeError("the access token is not a JWT")
    return json.loads(base64.urlsafe_b64decode(part[1] + "=" * (-len(part[1]) % 4)))


def scopes():
    return set(claims(token()).get("scope", "").split())


def connect(role=None, **kwargs):
    """psycopg connection as `role`, or as the only role the token's db:* scopes allow."""
    global _current_token
    allowed = sorted(s[len(_SCOPE_PREFIX):] for s in scopes() if s.startswith(_SCOPE_PREFIX))
    if role is None:
        if len(allowed) != 1:
            raise RuntimeError(f"choose a role with connect(role=...); the token allows {allowed}")
        role = allowed[0]
    _current_token = token()
    issuer = os.environ["PG_OAUTH_ISSUER"]
    if issuer.startswith("http://"):
        # libpq rejects a plain-HTTP issuer even when the token comes from this hook.
        # Local PoC only; a real deployment uses an HTTPS issuer and never sets this.
        os.environ.setdefault("PGOAUTHDEBUG", "UNSAFE")
    return psycopg.connect(
        host=os.environ.get("PGHOST", "pg18"),
        port=os.environ.get("PGPORT", "5432"),
        dbname=os.environ.get("PGDATABASE", "poc"),
        user=role,
        oauth_issuer=os.environ["PG_OAUTH_ISSUER"],
        oauth_client_id=os.environ["PG_OAUTH_CLIENT_ID"],
        autocommit=True,
        **kwargs,
    )
