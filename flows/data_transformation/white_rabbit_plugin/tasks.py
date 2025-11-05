import json
from pathlib import Path
from base64 import b64encode
from configparser import ConfigParser

from prefect import task, runtime

from prefect_shell import ShellOperation
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .types import INISettings, FileSaveResponse, WhiteRabbitRunType
from .types import WHITERABBIT_BIN_PATH, WHITERABBIT_CSV_DIR, WHITERABBIT_DIR_PATH  

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.WhiteRabbitAPI import WhiteRabbitAPI
from _shared_flow_utils.api.FilesManagerAPI import FilesManagerAPI
from _shared_flow_utils.api.SupabaseStorageAPI import SupabaseStorageAPI



@task(log_prints=True)
def create_white_rabbit_settings(scan_type: WhiteRabbitRunType, scan_settings: dict) -> tuple[str, str]:
    '''
    Create a config.ini file for White Rabbit based on the provided scan type and options.
    Returns a tuple of (config_path, scan_report_path).
    '''
    logger = get_run_logger()
    config = ConfigParser()

    logger.info(f"Creating file config.ini for scan type: {scan_type}...")

    match scan_type:
        case WhiteRabbitRunType.SCAN_REPORT_DB: 

            # Todo: Use database code
            # database_credentials = DBDao(use_cache_db=False,
            #                              database_code=scan_settings.database_code)
            
            # ini_content = INISettings(scan_type=WhiteRabbitRunType.SCAN_REPORT_DB,
            #                           server_location=f"{database_credentials.host}:{database_credentials.port}/{database_credentials.databaseName}",
            #                           user_name=database_credentials.readUser,
            #                           password=database_credentials.readPassword,
            #                           database_name=database_credentials.schema,
            #                           data_type=database_credentials.dialect,
            #                           tables_to_scan=scan_settings.tables_to_scan or "*"
            #                           )

            ini_content = INISettings(scan_type=WhiteRabbitRunType.SCAN_REPORT_DB, **scan_settings.model_dump())
        
        case WhiteRabbitRunType.SCAN_REPORT_FILES:
            table_names = scan_settings.files
            ini_content = INISettings(scan_type=WhiteRabbitRunType.SCAN_REPORT_FILES,
                                      delimiter=scan_settings.settings.delimiter,
                                      tables_to_scan=",".join(table_names),
                                      )

    config["settings"] = ini_content.dump_settings_json()

    config_path = f"{WHITERABBIT_DIR_PATH}/config.ini"

    logger.debug(f"Writing file config.ini to {config_path}...")
    
    with open(config_path, "w") as configfile:
        config.write(configfile)

    # Check if config.ini was created successfully
    if not Path(config_path).exists():
        logger.error(f"Failed to create file config.ini")
        raise FileNotFoundError(f"File config.ini not found at {config_path}")

    logger.info(f"Successfully created file config.ini")
    logger.debug(f"File config.ini can be found at {config_path}")

    scan_report_path = ini_content.working_folder + "/ScanReport.xlsx"
    
    return config_path, scan_report_path
        

@task(log_prints=True)
def create_scan_report(config_ini_path: str, scan_report_path: str) -> str:
    '''
    Runs White Rabbit to create a ScanReport.xlsx file based on the provided config.ini file.
    A ScanReport.xlsx file will be generated at the specified working folder in the config.ini file.
    '''
    logger = get_run_logger()

    ShellOperation(
        commands=[f"{WHITERABBIT_BIN_PATH}/whiteRabbit -ini {config_ini_path} 2>&1 | tee /tmp/java_log.txt"]).run()

    if not Path(scan_report_path).is_file():
        logger.error(f"File {scan_report_path} does not exist.")
        raise FileNotFoundError(f"File {scan_report_path} does not exist.")
    else:
        return scan_report_path


@task(log_prints=True)
def generate_data_json(data: dict, output_path: str) -> str:
    '''
    Create a json file for White Rabbit data mapping based on the provided data dictionary.
    '''
    data_mapping_file_path = f"{WHITERABBIT_DIR_PATH}/{output_path}"
    with open(data_mapping_file_path, 'w') as f:
        json.dump(data, f)
    return data_mapping_file_path


@task(log_prints=True)
def generate_etl_word_document(input_file: str = "data.json", output_file: str = "report.docx") -> None:
    '''
    Generates an ETL Word document from the provided data JSON file using White Rabbit's rabbitInAHat tool.
    '''
    logger = get_run_logger()

    input_path = Path(input_file).resolve()

    if not input_path.exists():
        raise FileNotFoundError(f"file {input_path} does not exist.")

    ShellOperation(commands=[
                   f"{WHITERABBIT_BIN_PATH}/rabbitInAHat --generateWordReport {str(input_path)} {output_file}"]).run()

    output_path = Path(output_file).resolve()

    if not output_path.exists():
        raise FileNotFoundError(f"file {output_path} does not exist.")

    try:
        with open(output_path, 'rb') as file:
            file_content = file.read()
            encoded_word_file = b64encode(file_content).decode("utf-8")

        create_markdown_artifact(
            key=f"{runtime.flow_run.id}-word-report",
            markdown=encoded_word_file,
            description="Base64 encoded Word report"
        )
        logger.info("Word document artifact stored successfully")

    except FileNotFoundError:
        raise FileNotFoundError("Generated word document does not exist")
    except Exception as e:
        raise Exception(f"Error processing word document: {str(e)}")


@task(log_prints=True)
def download_files_from_supabase_storage(node_id: str, filenames: list[str], supabase_api: SupabaseStorageAPI) -> bool:
    '''
    Downloads multiple CSV files from Supabase Storage using the provided node ID and filenames.
    Saves the files to the WHITERABBIT_CSV_DIR directory.
    '''
    logger = get_run_logger()
    logger.info(f"Downloading {len(filenames)} files from Supabase Storage for node ID: {node_id}")

    downloaded_files = []
    
    for filename in filenames:
        logger.debug(f"Downloading file: {filename}")
        csv_content = supabase_api.decode_csv_data(supabase_api.get_file(node_id, filename))
        csv_file_path = f"{WHITERABBIT_CSV_DIR}/{filename}"
        
        with open(csv_file_path, 'w', encoding='utf-8') as csvfile:
            csvfile.write(csv_content)

        downloaded_files.append(filename)
        logger.info(f"Successfully downloaded and saved file: {filename}")


    logger.info(f"Successfully downloaded {len(downloaded_files)} files")
    return True
        

@task(log_prints=True)
def upload_scan_report_to_supabase_storage(node_id: str, filepath: str, supabase_api: SupabaseStorageAPI) -> bool:
    '''
    Uploads the scan report file to Supabase Storage under the specified node ID.
    '''
    logger = get_run_logger()
    logger.info(f"Uploading scan report at '{filepath}' to Supabase Storage for node ID: {node_id}")

    filename = Path(filepath).name
    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    try:
        # Delete existing file so uploading a new one doesn't throw an error
        existing_files = supabase_api.list_files(node_id)
        file_exists = next(filter(lambda x: x["name"] == filename, existing_files), None)

        if file_exists:
            logger.info(f"Scan report '{file_exists['name']}' already exists in Supabase Storage. Deleting existing file...")
            supabase_api.delete_file(node_id, filename)
        
        supabase_api.upload_file(node_id, filepath, content_type)

        logger.info(f"Successfully uploaded scan report at '{filepath}' to Supabase Storage")
        return True
        
    except Exception as e:
        logger.error(f"Failed to upload scan report at '{filepath}' to Supabase Storage: {str(e)}")
        raise


# Todo: Remove if downloading scan report from supabase storage
@task(log_prints=True)
def save_scan_report_conversion(username: str, scan_report_path: str) -> FileSaveResponse:
    '''
    Saves the scan report file to the Files Manager and records the conversion in White Rabbit.
    Returns the FileSaveResponse containing details of the saved file.
    '''

    logger = get_run_logger()
    logger.info("Saving scan report conversion to files manager...")

    try:
        file_save_response = FilesManagerAPI().save_file(username=username, file_path=str(scan_report_path))
        logger.info("Successfully saved scan report file")
        save_conversion_response = WhiteRabbitAPI().save_conversion(
            runtime.flow_run.id, file_save_response['fileName'], file_save_response['id'])
        logger.info("Successfully saved scan conversion: ",
                    save_conversion_response['rows'][0])
    except Exception as e:
        logger.error(f"Failed to save scan conversion")
        raise e
    else:
        logger.info("Successfully saved scan report and conversion")
        return FileSaveResponse(**file_save_response)
