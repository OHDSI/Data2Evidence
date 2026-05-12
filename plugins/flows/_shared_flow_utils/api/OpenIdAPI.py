import jwt
import requests

from prefect.variables import Variable
from prefect.blocks.system import Secret


class OpenIdAPI:
    def __init__(self):
        self.python_verify_ssl = Variable.get("python_verify_ssl")
        self.tls_internal_ca_cert = Secret.load("tls-internal-ca-cert")

        if self.python_verify_ssl == 'true' and self.tls_internal_ca_cert is None:
            raise ValueError("'tls-internal-ca-cert' prefect secret is undefined")

        self.url = self.get_service_route("idIssuerUrl")
        self.client_id = Secret.load("idp-alp-data-client-id")
        self.client_secret = Secret.load("idp-alp-data-client-secret")
        self.scope = Variable.get("idp_scope")

    def get_service_route(self, service_name: str) -> str:
        if Variable.get("service_routes") is None:
            raise ValueError("'service_routes' prefect variable is undefined")
        return Variable.get("service_routes").get(service_name) + "/"

    def get_verify_value(self) -> bool:
        return False if self.python_verify_ssl == 'false' else self.tls_internal_ca_cert.get()
        
    def get_options(self):
        return {
            "Content-Type": "application/json",
        }

    def get_signing_key(self, token):
        jwks_client = jwt.PyJWKClient(f"{self.url}/jwks")
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return signing_key.key

    def get_client_credential_token(self) -> str:
        params = {
            'grant_type': "client_credentials",
            'client_id': self.client_id.get(),
            'client_secret': self.client_secret.get(),
            'scope': 'openid'
        }

        result = requests.post(
            f"{self.url}token",
            headers=self.get_options(),
            verify=self.get_verify_value(),
            json=params
        )

        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"OpenIdAPI Failed to get client credential token, {result.content}")
        else:
            return result.json()['access_token']

    def is_token_expired_or_empty(self, token: str | None) -> bool:
        if not token:
            return True

        try:
            signing_key = self.get_signing_key(token)
            jwt.decode(token, 
                       key=signing_key,
                       audience=self.scope,
                       algorithms=["ES384"])
            # Token can be successfully decoded and is still valid.
            return False
        except jwt.ExpiredSignatureError:
            # Token has expired
            return True
        except jwt.InvalidTokenError:
            # Handle other JWT validation errors
            return True
