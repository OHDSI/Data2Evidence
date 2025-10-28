import json
from pathlib import Path
from csv import DictWriter
from base64 import b64encode
from configparser import ConfigParser

from prefect import task, runtime

from prefect_shell import ShellOperation
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .types import INISettings, FileSaveResponse, WhiteRabbitRunType
from .types import WHITERABBIT_BIN_PATH, WHITERABBIT_CSV_DIR, WHITERABBIT_DIR_PATH  

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
            # Todo: Generate from database credentials
            ini_content = INISettings(scan_type=WhiteRabbitRunType.SCAN_REPORT_DB, **scan_settings)
        case WhiteRabbitRunType.SCAN_REPORT_FILES:
            ini_content = INISettings(scan_type=WhiteRabbitRunType.SCAN_REPORT_FILES, **scan_settings.get('settings', {}))

    config["settings"] = ini_content.dump_settings_json()

    config_path = f"{WHITERABBIT_DIR_PATH}/config.ini"

    logger.debug(f"Writing file config.ini to {config_path}...")
    
    with open(config_path, "w") as configfile:
        config.write(configfile)

    # Check if config.ini was created successfully
    if not Path(config_path).exists():
        logger.error(f"Failed to create file config.ini")
        raise FileNotFoundError(f"File config.ini not found at {config_path}")

    logger.info(f"Successfully created file config.ini!")
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

        logger.info("Storing Base64-encoded Word file as artifact")
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

# Todo: Remove this task, not used
# @task(log_prints=True)
# def generate_csv_files_from_json(file_contents: list = None):
#     logger = get_run_logger()
#     logger.info("Generating CSV files from JSON...")
#     logger.info(f"Number of files to process: {len(file_contents)}")

#     for file_data in file_contents:
#         logger.info(file_data['fileName'])
#         if not file_data['fileContent']:
#             continue

#         # Clean escaped quotes from keys and values
#         cleaned_data = []
#         for row in file_data['fileContent']:
#             cleaned_row = {}
#             for key, value in row.items():
#                 # Remove escaped quotes from keys and values
#                 clean_key = key.strip('"') if isinstance(key, str) else key
#                 clean_value = value.strip('"') if isinstance(value, str) else value
#                 cleaned_row[clean_key] = clean_value
#             cleaned_data.append(cleaned_row)

#         headers = cleaned_data[0].keys()

#         # Create full path for the CSV file
#         csv_file_path = f"{WHITERABBIT_CSV_DIR}/{file_data['fileName']}"
        
#         with open(csv_file_path, 'w', newline='', encoding='utf-8') as csvfile:
#             writer = DictWriter(csvfile, fieldnames=headers)
#             writer.writeheader()
#             writer.writerows(cleaned_data)
#             logger.info(f"Successfully saved {csv_file_path}")

#     logger.info(f"Successfully generated {len(file_contents)} files in {WHITERABBIT_CSV_DIR}")

@task(log_prints=True)
def download_file_from_supabase_storage(node_id: str, filename: str) -> bool:
    '''
    Downloads a CSV file from Supabase Storage using the provided node ID and filename.
    Saves the file to the WHITERABBIT_CSV_DIR directory.
    '''
    logger = get_run_logger()
    logger.info(f"Downloading file {filename} from Supabase Storage for node ID: {node_id}...")

    try:
        supabase_api = SupabaseStorageAPI()
        csv_content = supabase_api.get_csv_file(node_id, filename)

        csv_file_path = f"{WHITERABBIT_CSV_DIR}/{filename}"
        with open(csv_file_path, 'w', encoding='utf-8') as csvfile:
            csvfile.write(csv_content)

        logger.info(f"Successfully downloaded and saved file to {csv_file_path}")
    except Exception as e:
        logger.error(f"Failed to download file from Supabase Storage: {str(e)}")
        raise e
    else:
        return True



# Todo: Change to upload to supabase storage and remove filesmanagerapi
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
