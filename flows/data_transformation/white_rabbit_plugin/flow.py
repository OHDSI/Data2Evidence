from xvfbwrapper import Xvfb

from prefect import flow
from prefect.logging import get_run_logger

from .tasks import *
from .data_mapping_tasks import *
from .types import WhiteRabbitRequestType, WhiteRabbitRunType


@flow(log_prints=True)
def white_rabbit_plugin(options: WhiteRabbitRequestType):
    logger = get_run_logger()
    x11_display_number = 1
    logger.info(f"Starting X11 virtual display server (Xvfb) on display :{x11_display_number} for Java AWT operations...")
    with Xvfb(display=x11_display_number):
        '''
        Starts a virtual X11 display server (Xvfb) to enable WhiteRabbit to run headless.
        This is needed for WhiteRabbit to run headless since it uses Java AWT components.
        '''
        match options.run_type:
            case WhiteRabbitRunType.SCAN_REPORT_DB | WhiteRabbitRunType.SCAN_REPORT_FILES:
                scan_report_flow(options)
            case WhiteRabbitRunType.GENERATE_ETL_REPORT:
                generate_etl_report_flow(options)


def scan_report_flow(options: WhiteRabbitRequestType):
    scan_type = options.run_type

    config_ini_path, scan_report_path = create_white_rabbit_settings(scan_type, options.data)

    # Todo: Update to read csv from supabase storage
    if scan_type == WhiteRabbitRunType.SCAN_REPORT_FILES:
        # Todo: To remove, hardcoded for testing
        node_id = "eb56c955-440d-4d6f-a2f4-143470ec0d9b"
        file_name = "dm.csv"
        file_downloaded = download_file_from_supabase_storage(node_id, file_name)

    if (scan_type == WhiteRabbitRunType.SCAN_REPORT_FILES and file_downloaded) \
        or scan_type == WhiteRabbitRunType.SCAN_REPORT_DB:
        scan_report_path = create_scan_report(config_ini_path, scan_report_path)

    # Todo: Upload to supabase storage under node id
    # save_response = save_scan_report_conversion(options.username, scan_report_path)

    # Todo: Refactor 
    # process_scan_report(save_response, scan_report_path, options.username)
    
    

def generate_etl_report_flow(options: WhiteRabbitRequestType):
    data_mapping_file_name = "datamapping.json"

    data_mapping_file_path = generate_data_json(options.data, data_mapping_file_name)
    
    generate_etl_word_document(data_mapping_file_path)
