from tempfile import TemporaryDirectory

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
        # The worker process is long-lived and shared across flow runs, so every
        # run-specific file (config.ini, CSVs, reports) goes into a private
        # directory that is removed when the run finishes, success or failure.
        with TemporaryDirectory(prefix="white-rabbit-", ignore_cleanup_errors=True) as work_dir:
            logger.debug(f"Using work directory {work_dir}")
            match options.run_type:
                case WhiteRabbitRunType.SCAN_REPORT_DB | WhiteRabbitRunType.SCAN_REPORT_FILES:
                    scan_report_flow(options, work_dir)
                case WhiteRabbitRunType.GENERATE_ETL_REPORT:
                    generate_etl_report_flow(options, work_dir)


def scan_report_flow(options: WhiteRabbitRequestType, work_dir: str):
    scan_type = options.run_type
    node_id = options.data.node_id

    supabase_api = SupabaseStorageAPI()

    config_ini_path, scan_report_path = create_white_rabbit_settings(scan_type, options.data, work_dir)

    if scan_type == WhiteRabbitRunType.SCAN_REPORT_FILES:
        files_downloaded = download_files_from_supabase_storage(node_id, supabase_api, work_dir)

    if (scan_type == WhiteRabbitRunType.SCAN_REPORT_FILES and files_downloaded) \
        or scan_type == WhiteRabbitRunType.SCAN_REPORT_DB:
        scan_report_path = create_scan_report(config_ini_path, scan_report_path, work_dir)

        
        upload_scan_report_to_supabase_storage(node_id, scan_report_path, supabase_api)

        # Todo: Remove if downloading scan report from supabase
        save_response = save_scan_report_conversion(options.username, scan_report_path)

        process_scan_report(save_response, scan_report_path, options.username)
    
    

def generate_etl_report_flow(options: WhiteRabbitRequestType, work_dir: str):
    data_mapping_file_name = "datamapping.json"

    data_mapping_file_path = generate_data_json(options.data.model_dump(), data_mapping_file_name, work_dir)

    generate_etl_word_document(data_mapping_file_path, work_dir)
