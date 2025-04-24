from prefect import flow
from prefect.logging import get_run_logger
from .types import WhiteRabbitRequestType, WhiteRabbitRunType
from .tasks import *
from .data_mapping_tasks import *


@flow(log_prints=True)
def white_rabbit_plugin(options: WhiteRabbitRequestType):
    logger = get_run_logger()
    logger.info("triggering white rabbit flow")

    match options.run_type:
        case WhiteRabbitRunType.SCAN_REPORT_DB:
            logger.info("scan report db")
            scan_report_db_flow(options)
        case WhiteRabbitRunType.SCAN_REPORT_FILES:
            logger.info("scan report files")
            scan_report_file_flow(options)
        case WhiteRabbitRunType.GENERATE_ETL_REPORT:
            logger.info("generate etl report")
            generate_etl_report_flow(options)


def scan_report_db_flow(options: WhiteRabbitRequestType):
    start_awt_display()
    create_white_rabbit_settings(options.data)
    create_scan_report()
    save_response: FileSaveResponse = save_scan_report_conversion(
        options.username)
    process_scan_report(
        save_response['id'], save_response['fileName'], options.username)


def scan_report_file_flow(options: WhiteRabbitRequestType):
    start_awt_display()
    file_contents = options.data.get('files', [])
    generate_csv_files_from_json(file_contents)
    create_white_rabbit_settings({'data_type': "Delimited text files"})
    create_scan_report()
    save_response: FileSaveResponse = save_scan_report_conversion(
        options.username)
    process_scan_report(
        save_response['id'], save_response['fileName'], options.username)


def generate_etl_report_flow(options: WhiteRabbitRequestType):
    generateDataJson(options.data)
    generateETLWordDocument()
