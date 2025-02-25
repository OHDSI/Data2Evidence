import jwt
import requests

from prefect.variables import Variable
from prefect.blocks.system import Secret

from shared_utils.api.BaseAPI import BaseAPI


class OpenIdAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("idIssuerUrl")
        self.client_id = Secret.load("idp-alp-data-client-id")
        self.client_secret = Secret.load("idp-alp-data-client-secret")
        self.scope = Variable.get("idp_scope")
        
    def getOptions(self):
        return {
            "Content-Type": "application/json",
        }

    def getSigningKey(self, token):
        jwks_client = jwt.PyJWKClient(f"{self.url}/jwks")
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return signing_key.key

    def getClientCredentialToken(self) -> str:
        params = {
            'grant_type': "client_credentials",
            'client_id': self.client_id.get(),
            'client_secret': self.client_secret.get(),
        }

        result = requests.post(
            f"{self.url}token",
            headers=self.getOptions(),
            verify=self.get_verify_value(),
            json=params
        )

        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"OpenIdAPI Failed to get client credential token, {result.content}")
        else:
            return result.json()['access_token']

    def isTokenExpiredOrEmpty(self, token: str | None):
        if (not token):
            return True

        signing_key = self.getSigningKey(token)
        try:
            jwt.decode(token, signing_key, audience=self.scope,
                       algorithms=["ES384"])
            # Token can be successfully decoded and is still valid.
            return False
        except jwt.ExpiredSignatureError:
            # Token has expired
            return True
