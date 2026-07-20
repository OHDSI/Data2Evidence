from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from pydantic import SecretStr
from _shared_flow_utils.dao.daobase import DaoBase
from _shared_flow_utils.types import DBCredentialsType, AuthMode, SupportedDatabaseDialects


def _creds():
    pem = rsa.generate_private_key(public_exponent=65537, key_size=2048).private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    return DBCredentialsType(
        dialect="snowflake", databaseName="OMOP", databaseCode="sf", host="ORG-ACCT",
        port=0, authMode=AuthMode.JWT, adminUser=SecretStr("SVC"), warehouse="WH",
        snowflakeSchema="CDM", role="D2E_READER", privateKey=SecretStr(pem))


def test_snowflake_connection_url():
    c = _creds()
    url, connect_args = DaoBase.create_sqlalchemy_connection_url(
        dialect=SupportedDatabaseDialects.SNOWFLAKE, database_name=c.databaseName,
        auth_mode=c.authMode, user=c.adminUser.get_secret_value(), password=None,
        host=c.host, port=c.port, db_credentials=c, pa_cdm_config=None)
    assert url.startswith("snowflake://SVC@ORG-ACCT/OMOP/CDM")
    assert "warehouse=WH" in url and "role=D2E_READER" in url
    assert isinstance(connect_args["private_key"], (bytes, bytearray))
