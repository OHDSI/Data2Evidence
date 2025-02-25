import os
from re import sub
from typing import List
from subprocess import PIPE, STDOUT, run, CalledProcessError

from prefect.variables import Variable

from flows.data_management_plugin.const import *
from flows.data_characterization_plugin.types import CHARACTERIZATION_DATA_MODEL

from shared_utils.dao.daobase import DaoBase
from shared_utils.api.PrefectAPI import get_auth_token_from_input, get_token_value
from shared_utils.types import (AuthMode, AuthToken, LiquibaseAction,
                                DBCredentialsType, SupportedDatabaseDialects)


class Liquibase:
    def __init__(self,
                 action: str,
                 dialect: str,
                 data_model: str,
                 changelog_file: str,
                 schema_name: str,
                 vocab_schema: str,
                 tenant_configs: DBCredentialsType,
                 plugin_classpath: str,
                 count: int = 0,
                 rollback_count: int = 0,
                 rollback_tag: str = ""
                 ):
        self.changelog_file = changelog_file
        self.dialect = dialect
        self.action = action
        self.vocab_schema = vocab_schema
        self.count = count
        self.schema_name = schema_name
        self.data_model = data_model
        self.tenant_configs = tenant_configs
        self.plugin_classpath = plugin_classpath
        self.rollback_count = rollback_count
        self.rollback_tag = rollback_tag

    def create_params(self) -> List:
        changeLogFile = f"db/migrations/{self.dialect}/{self.changelog_file}"

        host = self.tenant_configs.host
        port = self.tenant_configs.port
        database_name = self.tenant_configs.databaseName
        ssl_trust_store = self.tenant_configs.sslTrustStore
        host_name_in_cert = self.tenant_configs.hostnameInCertificate

        if self.dialect == SupportedDatabaseDialects.HANA and self.tenant_configs.authMode == AuthMode.JWT:
            # jwt authentication
            auth_token: AuthToken = get_auth_token_from_input()
            admin_password = get_token_value(auth_token)
        else:
            # password authentication
            admin_user = self.tenant_configs.adminUser
            admin_password = self.tenant_configs.adminPassword.get_secret_value()

        # path to liquibase executable
        liquibase_path = Variable.get("liquibase_path") if Variable.get("liquibase_path") else "/app/liquibase/liquibase"
        liquibase_dir = os.path.dirname(liquibase_path)
        liquibase_properties = os.path.join(liquibase_dir, 'liquibase.properties')
        
        hana_driver_class_path = Variable.get("hana_driver_class_path") if Variable.get("hana_driver_class_path") else "/app/liquibase/lib/ngdbc-latest.jar"
        postgres_driver_class_path = Variable.get("postgres_driver_class_path") if Variable.get("postgres_driver_class_path") else "/app/inst/drivers/postgresql-42.3.1.jar"
        match self.dialect:
            case SupportedDatabaseDialects.HANA:
                classpath = f"{hana_driver_class_path}:{self.plugin_classpath}"
                driver = "com.sap.db.jdbc.Driver"
                connection_base_url = f'jdbc:sap://{host}:{port}?'
                connection_properties = f'databaseName={database_name}&validateCertificate=false&encrypt=true&sslTrustStore={ssl_trust_store}&hostNameInCertificate={host_name_in_cert}&currentSchema={self.schema_name.upper()}'
            case SupportedDatabaseDialects.POSTGRES:
                classpath = f"{postgres_driver_class_path}:{self.plugin_classpath}"
                driver = "org.postgresql.Driver"
                connection_base_url = f'jdbc:postgresql://{host}:{port}/{database_name}?'
                connection_properties = f'user={admin_user}&password={admin_password}&currentSchema="{self.schema_name.lower()}"'

        params = [
            liquibase_path,
            self.action,
            f"--changeLogFile={changeLogFile}",
            f"--classpath={classpath}",
            f"--driver={driver}",
            f"--logLevel={Variable.get('lb_log_level') if Variable.get('lb_log_level') else 'INFO'}",
            f"--defaultSchemaName={self.schema_name}",
            f"--liquibaseSchemaName={self.schema_name}",
            f"--defaults-file={liquibase_properties}"
        ]

        if self.tenant_configs.authMode != AuthMode.JWT:
            params.append(f"--username={admin_user}")

        # Temporarily create liquibase.properties for sensitive values
        # Won't be logged in traceback
        with open(liquibase_properties, 'w') as file:
            file.write(f'''
                url: {connection_base_url}{connection_properties}
                password: {admin_password}
                ''')
            
        match self.action:
            case LiquibaseAction.STATUS:
                params.append("--verbose")
            case LiquibaseAction.UPDATECOUNT:
                params.append(f"--count={self.count}")
            case LiquibaseAction.ROLLBACK_COUNT:
                params.append(f"--count={self.rollback_count}")
            case LiquibaseAction.ROLLBACK_TAG:
                params.append(f"--tag={self.rollback_tag}")

        if self.data_model in OMOP_DATA_MODELS:
            params.append(f"-DVOCAB_SCHEMA={self.vocab_schema}")
            
        if self.data_model == CHARACTERIZATION_DATA_MODEL:
            params.append(f"-DVOCAB_SCHEMA={self.vocab_schema}")
            params.append(f"-DDATA_CHARACTERIZATION_SCHEMA={self.schema_name}")

        return params

    def update_schema(self):
        try:
            params = self.create_params()
            result = run(params, check=True, stderr=STDOUT,
                         stdout=PIPE, text=True)
            masked_output = "\n".join([self._mask_secrets(line, "***") for line in result.stdout.splitlines()])
            print(masked_output)
        except CalledProcessError as cpe:  # catches non-0 return code exception
            # print(f"Command ran: '{cpe.cmd}'")  # for debugging
            masked_output = "\n".join([self._mask_secrets(line, "***") for line in cpe.output.splitlines()])
            print(masked_output)
            liquibase_msg_list = cpe.output.split("\n")
            liquibase_error_message = self._mask_secrets(self._find_error_message(
                liquibase_msg_list), "***")
            raise RuntimeError(
                f"Liquibase failed to run with return code '{cpe.returncode}': {liquibase_error_message}")  # from cpe
        else:
            print(f"Successfully ran liquibase command '{params[1]}'")

    def get_latest_available_version(self) -> str:
        try:
            params = self.create_params()
            result = run(params, check=True, stderr=STDOUT,
                         stdout=PIPE, text=True)
            liquibase_msg_masked = self._mask_secrets(result.stdout, "***")
            masked_output = "\n".join([self._mask_secrets(line, "***") for line in result.stdout.splitlines()])
            print(masked_output)
        except CalledProcessError as cpe:
            masked_output = "\n".join([self._mask_secrets(line, "***") for line in cpe.output.splitlines()])
            print(masked_output)
            liquibase_msg_list = cpe.output.split("\n")
            liquibase_error_message = self._mask_secrets(self._find_error_message(
                liquibase_msg_list), "***")
            raise RuntimeError(
                f"Liquibase failed to run with return code '{cpe.returncode}': {liquibase_error_message}")
        else:
            print(f"Successfully ran liquibase command '{params[1]}'")
            liquibase_msg_list = liquibase_msg_masked.split("\n")
            latest_available_version_msg = self._find_latest_available_changeset(
                liquibase_msg_list)
            print(
                f"latest_available_version_msg is {latest_available_version_msg}")
            return latest_available_version_msg

    def _find_latest_available_changeset(self, liquibase_stdout: List) -> str:
        for output in reversed(liquibase_stdout):
            if CHANGESET_AVAILABLE_REGEX.search(output):
                return output

    def _find_error_message(self, liquibase_stdout: List) -> str:
        for output in liquibase_stdout:
            if LB_ERROR_MESSAGE_REGEX.search(output):
                return output

    def _mask_secrets(self, text, replacement):
        text = sub(PASSWORD_REGEX, replacement, text)  # mask password
        text = sub(SSL_TRUST_STORE_REGEX, replacement,
                   text)  # mask sslTrustStore
        return text
