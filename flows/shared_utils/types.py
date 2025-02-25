from enum import Enum
from typing import Optional, Literal
from pydantic import BaseModel, SecretStr

from prefect.input import RunInput


class AuthMode(str, Enum):
    JWT = "jwt"
    PASSWORD = "password"


class DBCredentialsType(BaseModel):
    readUser: Optional[str] = None
    readPassword: Optional[SecretStr] = None
    adminUser: Optional[str] = None
    adminPassword: Optional[SecretStr] = None
    user: Optional[str] = None
    password: Optional[SecretStr] = None
    dialect: str
    databaseName: str
    host: str
    port: int
    encrypt: Optional[bool] = False
    validateCertificate: Optional[bool] = False
    sslTrustStore: Optional[SecretStr] = ""
    hostnameInCertificate: Optional[str] = ""
    enableAuditPolicies: bool = False
    readRole: Optional[str] = ""

    # Todo: align with DATABASE_CREDENTIALS
    # authMode: Literal[AuthMode.PASSWORD, AuthMode.JWT]
    @property # Todo: Temporary until authMode is implemented in DATABASE_CREDENTIALS
    def authMode(self) -> AuthMode:
        if self.dialect == SupportedDatabaseDialects.HANA and \
            all(pw is None for pw in [self.password, self.adminPassword, self.readPassword]):
                return AuthMode.JWT
        else:
            return AuthMode.PASSWORD


class CacheDBCredentialsType(DBCredentialsType):
    readUser: SecretStr
    adminUser: SecretStr
    user: SecretStr


class UserType(str, Enum):
    ADMIN_USER = "admin_user"
    READ_USER = "read_user"


class SupportedDatabaseDialects(str, Enum):
    HANA = "hana"
    POSTGRES = "postgres"
    DUCKDB = "duckdb"


class RequestType(str, Enum):
    GET = "get"
    POST = "post"
    PUT = "put"
    DELETE = "delete"
    
    
class LiquibaseAction(str, Enum):
    UPDATE = "update"  # Create and update schema
    UPDATECOUNT = "updateCount"  # Create schema with count
    STATUS = "status"  # Get Version Info
    ROLLBACK_COUNT = "rollbackCount"  # Rollback on n changesets
    ROLLBACK_TAG = "rollback"  # Rollback on tag
    CHANGELOG_SYNC = "changelog-sync" # mark all changesets in databasechangelog table as executed


class InternalPluginType(str, Enum):
    DATA_MANAGEMENT = "data_management_plugin"
    DATA_CHARACTERIZATION = "data_characterization_plugin"
    DATA_QUALITY = "dqd_plugin"
    COHORT_GENERATOR = "cohort_generator_plugin"
    I2B2 = "i2b2_plugin"
    DUCK_DB = "create_cachedb_file_plugin"
    DATAFLOW_UI = "dataflow_ui_plugin"
    R_CDM = "r_cdm_plugin"
    DATA_LOAD = "data_load_plugin"

    @staticmethod
    def values():
        return InternalPluginType._value2member_map_


class EntityCountDistributionType(BaseModel):
    OBSERVATION_PERIOD_COUNT: str
    DEATH_COUNT: str
    VISIT_OCCURRENCE_COUNT: str
    VISIT_DETAIL_COUNT: str
    CONDITION_OCCURRENCE_COUNT: str
    DRUG_EXPOSURE_COUNT: str
    PROCEDURE_OCCURRENCE_COUNT: str
    DEVICE_EXPOSURE_COUNT: str
    MEASUREMENT_COUNT: str
    OBSERVATION_COUNT: str
    NOTE_COUNT: str
    EPISODE_COUNT: str
    SPECIMEN_COUNT: str

class AuthToken(RunInput):
    token: SecretStr