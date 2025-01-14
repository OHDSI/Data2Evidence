import os
import json

from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.filesystems import RemoteFileSystem as RFS


def create_flow_results_dir():
    s3_access_key = os.getenv('MINIO__ACCESS_KEY')
    s3_secret_key = os.getenv('MINIO__SECRET_KEY')
    s3_port = os.getenv('MINIO__PORT')
    s3_hostname = os.getenv('MINIO__ENDPOINT')
    url = f'http://{s3_hostname}:{s3_port}'
    block = RFS(
        basepath=os.getenv('DATAFLOW_MGMT__FLOWS__RESULTS__S3_DIR_PATH'),
        settings={
            "key": s3_access_key,
            "secret": s3_secret_key,
            "client_kwargs": {"endpoint_url": url},
        },
    )
    block.save(os.getenv('DATAFLOW_MGMT__FLOWS__RESULTS_SB_NAME'), overwrite=True)


def create_secrets():
    # From envConverter
    Secret(value=json.loads(os.getenv('DATABASE_CREDENTIALS'))).save(
        name="database-credentials", overwrite=True)

    Secret(value=os.getenv('TLS__INTERNAL__CA_CRT')).save(
        name="tls-internal-ca-cert", overwrite=True)
    Secret(value=os.getenv('IDP__ALP_DATA__CLIENT_ID')).save(
        name="idp-alp-data-client-id", overwrite=True)
    Secret(value=os.getenv('IDP__ALP_DATA__CLIENT_SECRET')).save(
        name="idp-alp-data-client-secret", overwrite=True)
    Secret(value=os.getenv('MINIO__SECRET_KEY')).save(
        name="minio-secret-key", overwrite=True)
    Secret(value=os.getenv('STRATEGUS__KEYRING_PASSWORD')).save(
        name="strategus-keyring-password", overwrite=True)


def create_prefect_variables():
    Variable.set("r_libs_user", os.getenv("R_LIBS_USER"), overwrite=True)

    Variable.set("duckdb_data_folder", os.getenv(
        "DUCKDB__DATA_FOLDER"), overwrite=True)
    Variable.set("cdw_config_duckdb_data_folder", os.getenv(
        "CDW_CONFIG_DUCKDB__DATA_FOLDER"), overwrite=True)
    Variable.set("fhir_schema_file", os.getenv(
        "FHIR_SCHEMA_JSON_PATH"), overwrite=True)

    Variable.set("flows_results_sb_name", os.getenv(
        "DATAFLOW_MGMT__FLOWS__RESULTS_SB_NAME"), overwrite=True)
    Variable.set("flows_results_s3_dir_path", os.getenv(
        "DATAFLOW_MGMT__FLOWS__RESULTS__S3_DIR_PATH"), overwrite=True)

    Variable.set("minio_endpoint", os.getenv(
        "MINIO__ENDPOINT"), overwrite=True)
    Variable.set("minio_port", os.getenv("MINIO__PORT"), overwrite=True)
    Variable.set("minio_access_key", os.getenv(
        "MINIO__ACCESS_KEY"), overwrite=True)
    Variable.set("minio_region", os.getenv("MINIO__REGION"), overwrite=True)
    Variable.set("minio_ssl", os.getenv("MINIO__SSL"), overwrite=True)

    Variable.set("python_verify_ssl", os.getenv(
        "PYTHON_VERIFY_SSL"), overwrite=True)
    Variable.set("lb_log_level", os.getenv("LB__LOG_LEVEL"), overwrite=True)
    Variable.set("idp_scope", os.getenv("IDP__SCOPE"), overwrite=True)
    Variable.set("alp_system_id", os.getenv("ALP__SYSTEM_ID"), overwrite=True)

    # For achilles
    Variable.set("achilles_thread_count", os.getenv(
        "ACHILLES_THREAD_COUNT"), overwrite=True)

    # For strategus
    Variable.set("cohort_generator_module_settings_url", os.getenv(
        "OHDSI__R_COHORT_GENERATOR_MODULE_SETTINGS_URL"), overwrite=True)
    Variable.set("cohort_diagnostics_module_settings_url", os.getenv(
        "OHDSI__R_COHORT_DIAGNOSTICS_MODULE_SETTINGS_URL"), overwrite=True)

    # For cache db
    Variable.set("cachedb_host", os.getenv("CACHEDB__HOST"), overwrite=True)
    Variable.set("cachedb_port", os.getenv("CACHEDB__PORT"), overwrite=True)

    # For ga tests
    if os.getenv("LIQUIBASE_PATH"):
        Variable.set("liquibase_path", os.getenv(
            "LIQUIBASE_PATH"), overwrite=True)

    if os.getenv("HANA__DRIVER_CLASS_PATH"):
        Variable.set("hana_driver_class_path", os.getenv(
            "HANA__DRIVER_CLASS_PATH"), overwrite=True)

    if os.getenv("POSTGRES__DRIVER_CLASS_PATH"):
        Variable.set("postgres_driver_class_path", os.getenv(
            "POSTGRES__DRIVER_CLASS_PATH"), overwrite=True)

    # Set Routes
    # Prefect variable max 255 chars
    service_routes = json.loads(os.getenv("SERVICE_ROUTES"))
    Variable.set(f"service_routes", service_routes, overwrite=True)


if __name__ == "__main__":
    create_flow_results_dir()
    create_secrets()
    create_prefect_variables()
