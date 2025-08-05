import httpx
import traceback
from time import time
from jwt import decode
from pydantic import SecretStr

from prefect.blocks.system import Secret

from _shared_flow_utils.types import AuthToken, AppTokenPayload, User


def get_auth_token_from_input() -> AuthToken:
    iter = AuthToken.receive(key_prefix="authtoken", timeout=300, poll_interval=3)
    return iter.next()


class GetAuthToken:
    auth_token: SecretStr = None
    refresh_token: SecretStr = None
    third_party_token: SecretStr = None
    _initialized = False

    @classmethod
    def initialize_tokens(cls) -> None:
        if cls._initialized:
            return
        tokens: AuthToken = get_auth_token_from_input()
        cls.auth_token = getattr(tokens, "token", None)
        cls.refresh_token = getattr(tokens, "thirdpartyrefreshtoken", None)
        cls.third_party_token = getattr(tokens, "thirdpartytoken", None)
        cls._initialized = True


    @classmethod
    def get_auth_token(cls) -> SecretStr:
        if not cls._initialized:
            cls.initialize_tokens()
        if cls.auth_token is None:
            raise RuntimeError("No auth token available. Please ensure the flow run input is provided.")
        return cls.auth_token

    @classmethod
    def get_refresh_token(cls) -> SecretStr:
        if not cls._initialized:
            cls.initialize_tokens()
        if cls.refresh_token is None:
            raise RuntimeError("No refresh token available. Please ensure the flow run input is provided.")
        return cls.refresh_token

    @classmethod
    def get_third_party_token(cls) -> SecretStr:
        if not cls._initialized:
            cls.initialize_tokens()
        if cls.third_party_token is None:
            raise RuntimeError("No third party token available. Please ensure the flow run input is provided.")

        decoded_exp = decode(cls.third_party_token.get_secret_value(), options={"verify_signature": False}).get("exp")

        if decoded_exp and time() <= decoded_exp:
            # Third party token is still valid
            return cls.third_party_token
        else:
            try:
                # Refresh and return the new third party token
                cls.refresh_third_party_token()
                return cls.third_party_token
            except Exception as e:
                traceback.print_exc()
                raise RuntimeError("Unable to get a valid third-party token after refresh.") from e

    @classmethod
    def refresh_third_party_token(cls) -> None:
        cls.get_refresh_token()

        refresh_token_endpoint = Secret.load("refresh-token-endpoint")
        refresh_token_client_id = Secret.load("refresh-token-client-id")
        refresh_token_client_secret = Secret.load("refresh-token-client-secret")

        if not all([refresh_token_endpoint, refresh_token_client_id, refresh_token_client_secret]):
            raise RuntimeError("Missing required secrets for token refresh")

        payload = {
            "grant_type": "refresh_token",
            "refresh_token": cls.refresh_token.get_secret_value(),
            "client_id": refresh_token_client_id.get(),
            "client_secret": refresh_token_client_secret.get(),
        }

        response = httpx.post(
            refresh_token_endpoint.get(),
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        response.raise_for_status()
        id_token = response.json().get("id_token")
        if not id_token:
            raise RuntimeError("The response does not contain a valid 'id_token'.")
        cls.third_party_token = SecretStr(id_token)


def build_user_from_token(token: SecretStr) -> User:
    if token:
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
