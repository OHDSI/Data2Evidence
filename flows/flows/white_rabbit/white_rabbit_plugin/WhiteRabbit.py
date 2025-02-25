import requests
import time
import json
from pydantic import ValidationError
from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.logging import get_run_logger
from prefect_shell import ShellOperation
from flows.white_rabbit_plugin.types import ServiceCredentials, WhiteRabbitRequestType
from shared_utils.api.OpenIdAPI import OpenIdAPI


class WhiteRabbit:
    def __init__(self):
        self.logger = get_run_logger()
        self.white_rabbit_endpoint = "http://localhost:8000/white-rabbit/api/"
        try:
            service_credentials = ServiceCredentials(
                PG__DB_NAME=Variable.get("pg_db_name"),
                PG__PORT=Variable.get("pg_db_port"),
                PG__HOST=Variable.get("pg_db_host"),
                PERSEUS__FILES_MANAGER_HOST=Variable.get("perseus_host"),
                PG_ADMIN_USER=Secret.load("pg-admin-user").get(),
                PG_ADMIN_PASSWORD=Secret.load("pg-admin-password").get())
        except ValidationError as e:
            self.logger.error(e)
            raise ValidationError(e)

        self.service_credentials = service_credentials

    def start(self):
        try:
            self.logger.info("Running command to start white rabbit...")
            process = ShellOperation(commands=['java -jar /app.jar'],
                                     env=self.service_credentials.model_dump(mode='json')).trigger()
        except Exception as e:
            self.logger.error(f"Failed to start service: {e}")
            raise Exception(e)
        else:
            self.logger.info(
                "Successfully run command to start white rabbit service")

        while not self.health_check():
            time.sleep(5)
        self.logger.info("white rabbit service is ready to accept requests")
        self.process = process

    def health_check(self):
        try:
            response = requests.get(f"{self.white_rabbit_endpoint}info")

            return response.status_code == 200
        except requests.RequestException as e:
            self.logger.error(f"WhiteRabbit service is not ready: {e}")
            return False

    def handle_request(self, options: WhiteRabbitRequestType):

        options.headers.update(
            {
                "Authorization": f"Bearer {OpenIdAPI().getClientCredentialToken()}"
            }
        )

        result = requests.post(
            url=f"{self.white_rabbit_endpoint}{options.url}",
            headers=options.headers,
            data=json.dumps(options.data))

        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"White Rabbbit failed to complete request, {result.content}")
        else:
            return result.json()
