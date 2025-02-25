from datetime import timedelta

from prefect import task
from prefect.cache_policies import TASK_SOURCE

from shared_utils.types import AuthToken

# Token serialized as pickle and stored temporarily in .prefect/storage
@task(log_prints=True, cache_policy=TASK_SOURCE, cache_expiration=timedelta(seconds=300))
def get_auth_token_from_input() -> AuthToken:
    iter = AuthToken.receive(key_prefix="authtoken", timeout=300, poll_interval=3)
    return iter.next()


def get_token_value(auth_token: AuthToken) -> str:
    return auth_token.token.get_secret_value().replace("Bearer ", "")
