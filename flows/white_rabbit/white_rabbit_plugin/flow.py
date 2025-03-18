from typing import List, Dict, Any, BinaryIO
from prefect import flow, task, runtime
from prefect.logging import get_run_logger
from dataclasses import dataclass
from white_rabbit_plugin.WhiteRabbit import WhiteRabbit
from white_rabbit_plugin.types import WhiteRabbitRequestType
from prefect.artifacts import create_link_artifact, create_markdown_artifact
import json
import csv
import base64
import io
import xmltodict
import requests
import time
from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI

@dataclass
class FileContent:
    fileName: str
    fileContent: List[Dict[str, Any]]

@task(log_prints=True)
def setup_plugin(white_rabbit: WhiteRabbit):
    white_rabbit.start()
    return white_rabbit

def scan_report_files(logger, options: WhiteRabbitRequestType):
    settings = options.data.get('settings', {})
    file_contents = options.data.get('files', [])
    logger.info(f"Number of files to process: {len(file_contents)}")
    # Convert JSON data back to CSV files
    files: List[tuple[str, tuple[str, BinaryIO, str]]] = []
    for file_data in file_contents:
        if not file_data['fileContent']:
            continue
        headers = file_data['fileContent'][0].keys()
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        writer.writerows(file_data['fileContent'])
        
        csv_bytes = io.BytesIO(output.getvalue().encode('utf-8'))
        csv_bytes.name = file_data['fileName']
        files.append(('files', (file_data['fileName'], csv_bytes, 'text/csv')))
        output.close()
    
    logger.info("Convert json to csv files completed")
    
    settings_str = json.dumps(settings, ensure_ascii=False)
    files.append(('settings', (None, settings_str, 'application/json')))
    
    # Make request to White Rabbit service
    options.headers.update(
        {
            "Authorization": f"Bearer {OpenIdAPI().getClientCredentialToken()}"
        }
    )
    if 'Content-Type' in options.headers:
        del options.headers['Content-Type']
    
    response = requests.post(
        url=f"http://localhost:8000/white-rabbit/api/scan-report/files",
        files=files,
        headers=options.headers
    )
    # enable logging when needed
    # with open("/tmp/java_log.txt", "r") as f:
    #     logger.info(f.read())
    
    logger.info(f"Response status: {response.status_code}")
    logger.info(f"Response content: {response.text}")
    
    if response.status_code != 200:
        raise Exception(f"Failed to process files: {response.text}")
    
    result_j = {}
    if 'xml' in response.headers.get("content-type").lower():
        data_dict = xmltodict.parse(response.content)
        parsed_dict = json.dumps(data_dict, indent=2)
        result_j =  parsed_dict
    if 'json' in response.headers.get("content-type").lower():
        result_j = response.json()
    
    if isinstance(result_j, str):
        result_j = json.loads(result_j)
    create_link_artifact(
        key=result_j["ScanDataConversion"]["id"],
        link=result_j["ScanDataConversion"]["id"]
    )
    logger.info("Successfully save the artifacts")
    return

def scan_report_db(white_rabbit: WhiteRabbit, logger, options: WhiteRabbitRequestType):
    response = white_rabbit.handle_request(options)
    if ((response.status_code >= 400) and (response.status_code < 600)):
        raise Exception(
            f"White Rabbbit failed to complete request, {response.content}")

    if 'xml' in response.headers.get("content-type").lower():
        data_dict = xmltodict.parse(response.content)
        parsed_dict = json.dumps(data_dict, indent=2)
        result =  parsed_dict
    if 'json' in response.headers.get("content-type").lower():
        result = response.json()
    result_j = json.loads(result) if isinstance(result, str) else result
    create_link_artifact(
        key=result_j["ScanDataConversion"]["id"],
        link=result_j["ScanDataConversion"]["id"]
    )
    logger.info("Successfully save the artifacts")
    return

def generate_etl_report(white_rabbit: WhiteRabbit, logger, options: WhiteRabbitRequestType):
    try:
        response = white_rabbit.handle_request(options)
        if response.status_code != 200:
            raise Exception(f"Failed to generate ETL report")
    except Exception as e:
        logger.error(f"Error when sending post request: {str(e)}")
        raise Exception(f"Error when sending post request: {str(e)}")
    
    try:
        encoded_word_file = base64.b64encode(response.content).decode("utf-8")
        # Store Base64-encoded Word file as an artifact
        logger.info("Storing Base64-encoded Word file as artifact")
        create_markdown_artifact(
            key=f"{runtime.flow_run.id}-word-report",
            markdown=encoded_word_file,
            description="Base64 encoded Word report"
        )
        logger.info("Artifacts stored successfully")
    except Exception as e:
        logger.error(f"Error printing response: {str(e)}")
    return

@flow(log_prints=True)
def white_rabbit_plugin(options: WhiteRabbitRequestType):
    logger = get_run_logger()
    logger.info("triggering white rabbit flow")
    white_rabbit = WhiteRabbit()
    white_rabbit = setup_plugin(white_rabbit)
    
    try:
        if "scan-report/files" in options.url:
            scan_report_files(logger, options)
            # Wait for a 20 seconds to save scan report
            wait_time = 20
            logger.info(f"Waiting {wait_time} seconds for processing to complete...")
            time.sleep(wait_time)
        elif "scan-report/db" in options.url:
            scan_report_db(white_rabbit, logger, options)
            # Wait for a 20 seconds to save scan report
            wait_time = 20
            logger.info(f"Waiting {wait_time} seconds for processing to complete...")
            time.sleep(wait_time)
        elif "report/word" in options.url:
            generate_etl_report(white_rabbit, logger, options)
        else:
            raise ValueError(f"Unsupported scan type URL: {options.url}")
    except Exception as e:
        logger.error(f"Error in white rabbit plugin: {str(e)}")
        return
    finally:
        return
