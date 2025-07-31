import httpx
from time import time
from jwt import decode
from pydantic import SecretStr

from prefect.blocks.system import Secret

from _shared_flow_utils.types import AuthToken, AppTokenPayload, User


def get_auth_token_from_input() -> AuthToken:
    iter = AuthToken.receive(key_prefix="authtoken", timeout=300, poll_interval=3)
    return iter.next()


def get_auth_token_value() -> SecretStr:
    if not hasattr(get_auth_token_value, "token"):
        # Cache the auth token in a func attribute to avoid fetching it multiple times
        get_auth_token_value.auth_token = get_auth_token_from_input().token
        return get_auth_token_value.auth_token
    return get_auth_token_value.auth_token


def get_third_party_token() -> SecretStr:
    # Cache the third party token and refresh token in a func attribute to avoid fetching it multiple times
    if (not hasattr(get_third_party_token, "refresh_token") or 
        not hasattr(get_third_party_token, "third_party_token")):
        tokens: AuthToken = get_auth_token_from_input()
        get_third_party_token.refresh_token = tokens.thirdpartyrefreshtoken
        get_third_party_token.third_party_token = tokens.thirdpartytoken

    decoded_exp = decode(get_third_party_token.third_party_token.get_secret_value(),
                         options={"verify_signature": False}).get("exp")

    if decoded_exp and time() <= decoded_exp:
        return get_third_party_token.third_party_token
    
    # Use refresh token to get a new third party token
    refresh_token_endpoint = Secret.load("refresh-token-endpoint")
    refresh_token_client_id = Secret.load("refresh-token-client-id")
    refresh_token_client_secret = Secret.load("refresh-token-client-secret")

    if not (refresh_token_endpoint and refresh_token_client_id and refresh_token_client_secret):
        raise ValueError("Missing required secrets for token refresh")

    payload = {
        "grant_type": "refresh_token",
        "refresh_token": get_third_party_token.refresh_token.get_secret_value(),
        "client_id": refresh_token_client_id.get(),
        "client_secret": refresh_token_client_secret.get(),
    }

    response = httpx.post(
        refresh_token_endpoint.get(),
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    response.raise_for_status()
    get_third_party_token.third_party_token = SecretStr(response.json().get("id_token"))
    return get_third_party_token.third_party_token


def build_user_from_token(token: SecretStr) -> User:
    if token:
        # decode token
        decoded_token = decode(token.get_secret_value(), options={"verify_signature": False})
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
