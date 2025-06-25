from jwt import decode
from datetime import timedelta

from prefect import task
from prefect.cache_policies import TASK_SOURCE

from _shared_flow_utils.types import AuthToken, AppTokenPayload, User

# Token serialized as pickle and stored temporarily in .prefect/storage
@task(log_prints=True, cache_policy=TASK_SOURCE, cache_expiration=timedelta(seconds=300))
def get_auth_token_from_input() -> AuthToken:
    iter = AuthToken.receive(key_prefix="authtoken", timeout=300, poll_interval=3)
    return iter.next()

def get_token_value(auth_token: AuthToken) -> str:
    return auth_token.token.get_secret_value().replace("Bearer ", "")

def get_third_party_token_value(auth_token: AuthToken) -> str:
    return auth_token.thirdpartytoken.get_secret_value()

def build_user_from_token(token: str) -> User:
    if token:
        # decode token
        decoded_token = decode(token, options={"verify_signature": False})
        user = {
            "user_id": decoded_token.get("oid", decoded_token.get("sub", "")),
            "name": decoded_token.get("name", ""),
            "email": decoded_token.get("email", "")
        }
    else:
        user = {
            "user_id": "",
            "name": "",
            "email": "",
        }
    return User(**user)