from prefect.variables import Variable
from prefect.blocks.system import Secret

from _shared_flow_utils.api.PrefectAPI import GetAuthTokens

class BaseAPI:
    def __init__(self):
        self.python_verify_ssl = Variable.get("python_verify_ssl")
        self.tls_internal_ca_cert = Secret.load("tls-internal-ca-cert")
        is_dev_env = Variable.get("is_dev_env")
        self.is_dev_env = is_dev_env if is_dev_env else False # change to True for local development
        
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


    def get_options(self, flow_run_id = None) -> dict[str, str]:
        # Prefect task to get token from flow input
        bearer_token = None
        if not self.is_dev_env:
            bearer_token = GetAuthTokens().get_auth_token(flow_run_id).get_secret_value()
        return {
            "Content-Type": "application/json",
            "Authorization": bearer_token if bearer_token else ""
        }