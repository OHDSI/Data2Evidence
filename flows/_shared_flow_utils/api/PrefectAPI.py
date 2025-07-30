import os
import httpx
from jwt import decode
from time import time

from prefect import task
from prefect.blocks.system import Secret

from _shared_flow_utils.types import AuthToken, AppTokenPayload, User

def get_auth_token_from_input() -> AuthToken:
    iter = AuthToken.receive(key_prefix="authtoken", timeout=300, poll_interval=3)
    return iter.next()

def get_token_value(auth_token: AuthToken) -> str:
    return auth_token.token.get_secret_value().replace("Bearer ", "")

def get_third_party_token_value(auth_token: AuthToken) -> str:
    third_party_token = auth_token.thirdpartytoken.get_secret_value()
    decoded_exp = decode(third_party_token, options={"verify_signature": False}).get(
        "exp"
    )

    if decoded_exp and time() <= decoded_exp:
        return third_party_token

    # Use refresh token to get a new token
    refresh_token_endpoint = Secret.load("refresh-token-endpoint")
    refresh_token_client_id = Secret.load("refresh-token-client-id")
    refresh_token_client_secret = Secret.load("refresh-token-client-secret")

    if not (refresh_token_endpoint and refresh_token_client_id and refresh_token_client_secret):
        raise ValueError("Missing required secrets for token refresh")

    third_party_refresh_token = get_third_party_refresh_token_value(auth_token)

    payload = {
        "grant_type": "refresh_token",
        "refresh_token": third_party_refresh_token,
        "client_id": refresh_token_client_id.get_secret_value(),
        "client_secret": refresh_token_client_secret.get_secret_value(),
    }

    response = httpx.post(
        refresh_token_endpoint.get_secret_value(),
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    response.raise_for_status()
    return response.json().get("id_token")

def get_third_party_refresh_token_value(auth_token: AuthToken) -> str:
    return auth_token.thirdpartyrefreshtoken.get_secret_value()

def build_user_from_token(token: str) -> User:
    if token:
        # decode token
        decoded_token = decode(token, options={"verify_signature": False})
        user = {
            "user_id": decoded_token.get("oid", decoded_token.get("sub", "")),
            "name": decoded_token.get("name", ""),
            "email": decoded_token.get("email", ""),
        }
    else:
        user = {
            "user_id": "",
            "name": "",
            "email": "",
        }
    return User(**user)
