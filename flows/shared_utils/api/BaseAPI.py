from prefect.variables import Variable
from prefect.blocks.system import Secret

from shared_utils.types import AuthToken
from shared_utils.api.PrefectAPI import get_auth_token_from_input

class BaseAPI:
    def __init__(self):
        self.python_verify_ssl = Variable.get("python_verify_ssl")
        self.tls_internal_ca_cert = Secret.load("tls-internal-ca-cert")
        
        if self.python_verify_ssl == 'true' and self.tls_internal_ca_cert is None:
            raise ValueError("'tls-internal-ca-cert' prefect secret is undefined")
        

    def get_service_route(self, service_name: str) -> str:
        if Variable.get("service_routes") is None:
            raise ValueError(f"'service_routes' prefect variable is undefined")
        else:
            service_route_url = Variable.get("service_routes").get(service_name) + "/"
            
        return service_route_url
        

    def get_verify_value(self) -> bool:
        return False if self.python_verify_ssl == 'false' else self.tls_internal_ca_cert.get()


    def get_options(self) -> dict[str, str]:
        # Prefect task to get token from flow input
        auth_token: AuthToken = get_auth_token_from_input()
        return {
            "Content-Type": "application/json",
            "Authorization": auth_token.token.get_secret_value()
        }