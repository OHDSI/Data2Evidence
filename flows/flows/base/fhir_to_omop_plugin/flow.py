from prefect_shell.commands import ShellOperation, shell_run_command
from prefect import flow, task, get_run_logger

from flows.fhir_to_omop_plugin.types import FHIRToOMOPOptionsType


@flow(log_prints=True)
def fhir_to_omop_plugin(options: FHIRToOMOPOptionsType):
    logger = get_run_logger()
    logger.info('Running FHIR to OMOP transformation')
    
    batch_chunksize = options.batchChunksize
    fhirGateway_jdbc_curl = options.fhirGatewayJdbcCurl
    fhirGateway_username = options.fhirGatewayUsername
    fhirGateway_password = options.fhirGatewayPassword
    fhirGateway_table = options.fhirGatewayTable
    omop_cdm_jdbc_curl = options.omopCDMJdbcCurl
    omop_cdm_username = options.omopCDMUsername
    omop_cdm_password = options.omopCDMPassword
    omop_cdm_schema = options.omopCDMSchema
    data_begin_date = options.dataBeginDate
    data_end_date = options.dataEndDate
    shell_run_command(
        command = "cd /app/fhirtoomop && java org.springframework.boot.loader.JarLauncher",
        env={"JAEGER_SERVICE_NAME": "fhir-to-omop",
            "OPENTRACING_JAEGER_ENABLED": "false",
            "BATCH_CHUNKSIZE": ""+batch_chunksize+"",
            "BATCH_THROTTLELIMIT": "4",
            "BATCH_PAGINGSIZE": "200000",
            "LOGGING_LEVEL_ORG_MIRACUM": "INFO",
            "DATA_FHIRGATEWAY_JDBCURL": ""+fhirGateway_jdbc_curl+"",
            "DATA_FHIRGATEWAY_USERNAME": ""+fhirGateway_username+"",
            "DATA_FHIRGATEWAY_PASSWORD": ""+fhirGateway_password+"",
            "DATA_FHIRGATEWAY_TABLENAME": ""+fhirGateway_table+"",
            "DATA_FHIRSERVER_CONNECTIONTIMEOUT": "3000",
            "DATA_FHIRSERVER_SOCKETTIMEOUT": "3000",
            "DATA_OMOPCDM_JDBCURL":  ""+omop_cdm_jdbc_curl+"",
            "DATA_OMOPCDM_USERNAME": ""+omop_cdm_username+"",
            "DATA_OMOPCDM_PASSWORD": ""+omop_cdm_password+"",
            "DATA_OMOPCDM_SCHEMA": ""+omop_cdm_schema+"",
            "DATA_BEGINDATE": ""+data_begin_date+"",
            "DATA_ENDDATE": ""+data_end_date+"",
            "MANAGEMENT_METRICS_EXPORT_PROMETHEUS_PUSHGATEWAY_ENABLED": "false",
            "MANAGEMENT_METRICS_EXPORT_PROMETHEUS_PUSHGATEWAY_BASE_URL": "http://localhost:9091",
            "FHIR_SYSTEMS_DEPARTMENT": "https://www.medizininformatik-initiative.de/fhir/core/modul-fall/CodeSystem/Fachabteilungsschluessel",
            "FHIR_SYSTEMS_INTERPRETATION": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            "APP_CARESITEIMPORT_ENABLED": "false",
            "APP_BULKLOAD_ENABLED": "false",
            "APP_DICTIONARYLOADINRAM_ENABLED": "true",
            "APP_WRITEMEDICATIONSTATEMENT_ENABLED": "false",
            "APP_STARTSINGLESTEP": "",
            "SPRING_CACHE_CAFFEINE_SPEC_MAXIMUMSIZE": "5000"
        })
    
