const _env = Deno.env.toObject();

// Value error, Variable name must only contain lowercase letters, numbers, and underscores
export const env = {
  TEST_VALUE: _env.TEST_VALUE,

  VARIABLES: {
    // Prefect Variables
    service_routes: JSON.parse(_env.SERVICE_ROUTES) || {},
    r_libs_user: _env.R_LIBS_USER,
    duckdb_data_folder: _env.DUCKDB__DATA_FOLDER,
    cdw_config_duckdb_data_folder: _env.CDW_CONFIG_DUCKDB__DATA_FOLDER,
    fhir_schema_file: _env.FHIR_SCHEMA_JSON_PATH,
    flows_results_s3_dir_path: _env.DATAFLOW_MGMT__FLOWS__RESULTS__S3_DIR_PATH,
    flows_results_sb_name: _env.DATAFLOW_MGMT__FLOWS__RESULTS_SB_NAME,
    minio_port: _env.MINIO__PORT,
    minio_endpoint: _env.MINIO__ENDPOINT,
    minio_access_key: _env.MINIO__ACCESS_KEY,
    minio_region: _env.MINIO__REGION,
    minio_ssl: _env.MINIO__SSL,
    python_verify_ssl: _env.PYTHON_VERIFY_SSL,
    lb_log_level: _env.LB__LOG_LEVEL,
    idp_scope: _env.IDP__SCOPE,
    alp_system_id: _env.ALP__SYSTEM_ID,
    achilles_thread_count: _env.ACHILLES_THREAD_COUNT,
    cohort_generator_module_settings_url:
      _env.OHDSI__R_COHORT_GENERATOR_MODULE_SETTINGS_URL,
    cohort_diagnostics_module_settings_url:
      _env.OHDSI__R_COHORT_DIAGNOSTICS_MODULE_SETTINGS_URL,
    cachedb_host: _env.CACHEDB__HOST,
    cachedb_port: _env.CACHEDB__PORT,

    // For integration tests which are currently disabled
    liquibase_path: _env.LIQUIBASE_PATH,
    hana_driver_class_path: _env.HANA__DRIVER_CLASS_PATH,
    postgres_driver_class_path: _env.POSTGRES__DRIVER_CLASS_PATH,
  },
  SECRETS: {
    // Prefect Secrets
    "tls-internal-ca-cert": _env.TLS__INTERNAL__CA_CRT,
    "idp-alp-data-client-id": _env.IDP__ALP_DATA_CLIENT_ID,
    "idp-alp-data-client-secret": _env.IDP__ALP_DATA__CLIENT_SECRET,
    "minio-secret-key": _env.MINIO__SECRET_KEY,
    "strategus-keyring-password": _env.STRATEGUS__KEYRING_PASSWORD,
  },
  D2E_MEMORY_LIMIT: _env.D2E_MEMORY_LIMIT,
  D2E_SWAP_LIMIT: _env.D2E_SWAP_LIMIT,
  WORKPOOL_NAME: _env.WORKPOOL_NAME,
};

export const D2E_MEMORY_LIMIT = env.D2E_MEMORY_LIMIT;
export const D2E_SWAP_LIMIT = env.D2E_SWAP_LIMIT;
