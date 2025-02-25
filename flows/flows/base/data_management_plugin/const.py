from os import getcwd
from re import compile

from shared_utils.dao.DBDao import DBDao
from shared_utils.types import InternalPluginType

OMOP_DATA_MODELS = ["omop", "omop5-4", "custom-omop-ms", "custom-omop-ms-phi"]

DATAMODEL_CDM_VERSION = {
    "omop": "5.3",
    "omop5-4": "5.4",
    "custom-omop-ms": "5.3",
    "custom-omop-ms-phi": "5.3"
}


def hana_to_postgres(table_name: str) -> str:
    return table_name.lower().replace(".", "_")


def get_db_dialect(options):
    if options.flow_name in InternalPluginType.values():
        return DBDao(use_cache_db=False, database_code=options.database_code).dialect
    else:
        return options.dialect


def check_table_case(dao_obj: DBDao) -> bool:
    # works only for omop, omop5-4 data models
    table_names = dao_obj.get_table_names()
    if 'person' in table_names:
        return True
    elif 'PERSON' in table_names:
        return False
    
    
def convert_case(entity, is_lower_case):
    if is_lower_case:
        return entity.lower()
    else:
        return entity.upper()


CHANGESET_AVAILABLE_REGEX = compile(r"db/migrations/\S+")
LB_ERROR_MESSAGE_REGEX = compile(r"Unexpected error running Liquibase:")
PASSWORD_REGEX = compile(r"password=\S+")
SSL_TRUST_STORE_REGEX = compile(
    r"&sslTrustStore=-----BEGIN CERTIFICATE-----[a-zA-Z0-9\+\/]+-----END CERTIFICATE-----")
