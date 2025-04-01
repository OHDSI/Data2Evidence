import jwt
import logging

from config import Env

logger = logging.getLogger(__name__)


class OpenIdAPI:
    def __init__(self):

        if Env.PYTHON_VERIFY_SSL == 'true' and Env.TLS__INTERNAL__CA_CRT is None:
            raise ValueError(
                "PYTHON_VERIFY_SSL is true but, TLS__INTERNAL__CA_CRT is undefined")

        # Parse SERVICE_ROUTES and get idIssuerUrl
        self.url = Env.SERVICE_ROUTES["idIssuerUrl"]
        self.scope = Env.IDP__SCOPE
        self.subject_prop = Env.IDP_SUBJECT_PROP
        self.verifySsl = False if Env.PYTHON_VERIFY_SSL == 'false' else Env.TLS__INTERNAL__CA_CRT

    def get_signing_key(self, token):
        jwks_client = jwt.PyJWKClient(f"{self.url}/jwks")
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return signing_key.key

    def get_user_id_from_token(self, token: str) -> str:
        # Remove "Bearer" prefix from token
        token = token.removeprefix("Bearer ")
        try:
            signing_key = self.get_signing_key(token)
            decoded_token = jwt.decode(
                token, signing_key, audience=self.scope, algorithms=["ES384"])
            # Token can be successfully decoded and is still valid.
            return decoded_token[self.subject_prop]
        except Exception as err:
            logger.error(str(err))
            raise err
        
    def get_third_party_token(self, token: str) -> str:
        # Remove "Bearer" prefix from token
        token = token.removeprefix("Bearer ")
        try:
            signing_key = self.get_signing_key(token)
            decoded_token = jwt.decode(
                token, signing_key, audience=self.scope, algorithms=["ES384"])
            # Token can be successfully decoded and is still valid.
            if "thirdPartyToken" not in decoded_token:
                raise ValueError("Intermediary IDP token doesnt exist for JWT Authentication!")
            return decoded_token["thirdPartyToken"]
        except Exception as err:
            logger.error(str(err))
            raise err
