from xvfbwrapper import Xvfb

from prefect import flow
from prefect.logging import get_run_logger

from .tasks import *
from .data_mapping_tasks import *
from .types import WhiteRabbitRequestType, WhiteRabbitRunType

from _shared_flow_utils.api.SupabaseStorageAPI import SupabaseStorageAPI


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
    node_id = options.data.node_id

    supabase_api = SupabaseStorageAPI()

    config_ini_path, scan_report_path = create_white_rabbit_settings(scan_type, options.data)

    if scan_type == WhiteRabbitRunType.SCAN_REPORT_FILES:
        # files_to_scan = [x["fileName"] for x in options.data.get("files", [])]
        files_to_scan = options.data.files
    
        files_downloaded = download_files_from_supabase_storage(node_id, files_to_scan, supabase_api)

    if (scan_type == WhiteRabbitRunType.SCAN_REPORT_FILES and files_downloaded) \
        or scan_type == WhiteRabbitRunType.SCAN_REPORT_DB:
        scan_report_path = create_scan_report(config_ini_path, scan_report_path)

        
        upload_scan_report_to_supabase_storage(node_id, scan_report_path, supabase_api)

        # Todo: Remove if downloading scan report from supabase
        save_response = save_scan_report_conversion(options.username, scan_report_path)

        process_scan_report(save_response, scan_report_path, options.username)
    
    

def generate_etl_report_flow(options: WhiteRabbitRequestType):
    data_mapping_file_name = "datamapping.json"

    data_mapping_file_path = generate_data_json(options.data, data_mapping_file_name)
    
    generate_etl_word_document(data_mapping_file_path)
