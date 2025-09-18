from prefect.variables import Variable
from prefect.blocks.system import Secret

from _shared_flow_utils.api.PrefectAPI import GetAuthTokens

class BaseAPI:
    def __init__(self):
        self.python_verify_ssl = Variable.get("python_verify_ssl")
        self.tls_internal_ca_cert = Secret.load("tls-internal-ca-cert")
        is_dev_env = Variable.get("is_dev_env")
        self.is_dev_env = is_dev_env if is_dev_env else True # change to True for local development
        
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
        bearer_token = None
        if not self.is_dev_env:
            bearer_token = GetAuthTokens().get_auth_token().get_secret_value()

        return {
            "Content-Type": "application/json",
            "Authorization": bearer_token if bearer_token else "Bearer eyJhbGciOiJFUzM4NCIsInR5cCI6ImF0K2p3dCIsImtpZCI6Il95TFBCM0lHZ1h4RWVMWmthajNsajE1c2g4WEhpWERUVUlsNTVUWlVrVDgifQ.eyJqdGkiOiIwUHJQZDBZdHMwVEw0a0Q3eFB0MjEiLCJzdWIiOiI0OHhmNWhhdHcwanIiLCJpYXQiOjE3NTgwODI3MDcsImV4cCI6MTc1ODA4NjMwNywic2NvcGUiOiIiLCJjbGllbnRfaWQiOiJQbUJWV1M2cXJxS3p0TWkwUGZFeG0iLCJpc3MiOiJodHRwczovL2xvY2FsaG9zdDo0MTEwMC9vaWRjIiwiYXVkIjoiaHR0cHM6Ly9hbHAtZGVmYXVsdCJ9.6fYtchKE74JYHi7BeW_Vcr6B9ALvGZteeDtiWkb7ySt1u39ioXfugEj-XJ83ndOStNWPPgzgWEouvtR4ZDEDumqFRkZzYOBJeVnaLu-DfeU0EHOLS72VWQLvpg4jLvJw"
        }