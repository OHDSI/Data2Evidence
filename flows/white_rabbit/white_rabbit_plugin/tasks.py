from prefect import task, runtime
from prefect_shell import ShellOperation
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact
import configparser
import base64
import json
import csv
import os
from _shared_flow_utils.api.FilesManagerAPI import FilesManagerAPI
from _shared_flow_utils.api.WhiteRabbitAPI import WhiteRabbitAPI
from .types import iniSettings, FileSaveResponse


WORKING_FOLDER_PATH = './'


@task(log_prints=True)
def create_white_rabbit_settings(settings) -> None:
    logger = get_run_logger()
    config = configparser.ConfigParser()

    logger.info("Creating config.ini")
    modelSettings = iniSettings(
        WORKING_FOLDER=WORKING_FOLDER_PATH,
        DATA_TYPE=settings.get("data_type", ""),
        SERVER_LOCATION=settings.get("server_location", ""),
        USER_NAME=settings.get("user_name", ""),
        PASSWORD=settings.get("password", ""),
        DATABASE_NAME=settings.get("database", ""),
        DELIMITER=settings.get("delimiter", ","),
        TABLES_TO_SCAN=settings.get("tables_to_scan", "*"),
        SCAN_FIELD_VALUES=settings.get("scan_field_values", "yes"),
        MIN_CELL_COUNT=settings.get("min_cell_count", "5"),
        MAX_DISTINCT_VALUES=settings.get("max_distinct_values", "1000"),
        ROWS_PER_TABLE=settings.get("rows_per_table", "100000"),
        CALCULATE_NUMERIC_STATS=settings.get("calculate_numeric_stats", "yes"),
        NUMERIC_STATS_SAMPLER_SIZE=settings.get(
            "numeric_stats_sampler_size", "500"),
    )

    config["settings"] = modelSettings.model_dump()
    with open("config.ini", "w") as configfile:
        config.write(configfile)

    logger.info("config.ini created")


@task(log_prints=True)
def start_awt_display():
    logger = get_run_logger()
    logger.info("start display")
    ShellOperation(
        commands=["Xvfb :1"]).trigger()


@task(log_prints=True)
def create_scan_report():
    ShellOperation(
        commands=["./dist/bin/whiteRabbit -ini config.ini 2>&1 | tee /tmp/java_log.txt"]).run()


@task(log_prints=True)
def generateDataJson(data, outputPath: str = "data.json"):
    with open(outputPath, 'w') as f:
        json.dump(data, f)


@task(log_prints=True)
def generateETLWordDocument(inputPath: str = "../../data.json", outputPath: str = "report.docx") -> None:
    logger = get_run_logger()

    if not os.path.exists(inputPath):
        raise FileNotFoundError(f"file {inputPath} does not exist.")

    ShellOperation(
        commands=["Xvfb :1"]).trigger()

    ShellOperation(commands=[
                   f"./dist/bin/rabbitInAHat --generateWordReport {inputPath} {outputPath}"]).run()

    # finally generate markdown
    try:
        with open(outputPath, 'rb') as file:
            file_content = file.read()
            encoded_word_file = base64.b64encode(file_content).decode("utf-8")

        # Store Base64-encoded Word file as an artifact
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


@task(log_prints=True)
def generate_csv_files_from_json(file_contents=[]):
    logger = get_run_logger("generating csv files from json")
    logger.info(f"Number of files to process: {len(file_contents)}")

    for file_data in file_contents:
        logger.info(file_data['fileName'])
        if not file_data['fileContent']:
            continue
        headers = file_data['fileContent'][0].keys()

        with open(file_data['fileName'], 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            writer.writerows(file_data['fileContent'])
            logger.info(f"Successfully saved {file_data['fileName']}")

    logger.info(f"Successfuly generated {len(file_contents)} files")


@task(log_prints=True)
def save_scan_report_conversion(username: str):
    logger = get_run_logger()
    logger.info("saving scan report conversion to files manager")

    if not os.path.exists("ScanReport.xlsx"):
        raise FileNotFoundError("Scan report does not exist")

    try:
        fileSaveResponse: FileSaveResponse = FilesManagerAPI().save_file(username=username)
        logger.info("Successfully saved scan report file")
        saveConversionResponse = WhiteRabbitAPI().save_conversion(
            runtime.flow_run.id, username, fileSaveResponse['fileName'], fileSaveResponse['id'])
        logger.info("Successfully saved scan conversion")
        logger.info(saveConversionResponse)
    except Exception as e:
        logger.error(f"Failed to save scan conversion")
        raise e
    else:
        logger.info("Successfully saved scan conversion")
        return saveConversionResponse['rows'][0]['id']
