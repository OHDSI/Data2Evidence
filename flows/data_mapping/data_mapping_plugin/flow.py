from typing import List, Dict
import pandas as pd
from pandasql import sqldf
from prefect import flow, task, runtime
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact
from prefect.variables import Variable
from pathlib import Path
import json
from .files_manager_client import FilesManagerClient

POSTGRES_TYPES_MAPPING = {
    'BINARY': 'BYTEA',
    'BIT': 'BOOLEAN',
    'VARCHAR(MAX)': 'TEXT',
    'STRING': 'TEXT',
    'VARBINARY': 'BYTEA',
    'NVARCHAR': 'VARCHAR',
    'NTEXT': 'TEXT',
    'FLOAT': 'DOUBLE PRECISION',
    'DATETIME': 'TIMESTAMP(3)',
    'DATETIME2': 'TIMESTAMP',
    'DATETIMEOFFSET': 'TIMESTAMP(P) WITH TIME ZONE',
    'SMALLDATETIME': 'TIMESTAMP(0)',
    'TINYINT': 'SMALLINT',
    'UNIQUEIDENTIFIER': 'CHAR(16)',
    'ROWVERSION': 'BYTEA',
    'SMALLMONEY': 'MONEY',
    'IMAGE': 'BYTEA',
    'EMPTY': 'TEXT'
}

TYPES_WITH_MAX_LENGTH = {
    'varchar',
    'char',
    'timestamp',
    'text'
}

@task(name="initialize_files_manager")
def initialize_files_manager() -> FilesManagerClient:
    logger = get_run_logger()
    try:
        perseus_host = Variable.get("perseus_host")
        logger.info(f"Initializing FilesManager with perseus_host: {perseus_host}")
        return FilesManagerClient(perseus_host=perseus_host)
    except Exception as e:
        logger.error(f"Failed to initialize FilesManager: {str(e)}")
        raise

@task(name="get_scan_report")
def get_scan_report(
    data_id: str,
    file_name: str,
    username: str,
    files_manager: FilesManagerClient
) -> Path:
    logger = get_run_logger()
    logger.info(f"Starting to get scan report. ID: {data_id}, File: {file_name}, User: {username}")
    
    try:
        logger.info("Fetching file content from files manager")
        content = files_manager.get_file(data_id)
        logger.info(f"Successfully retrieved file content, size: {len(content)} bytes")
        
        temp_dir = Path("/tmp/scan_reports", username)
        logger.info(f"Creating temp directory: {temp_dir}")
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = temp_dir / file_name
        logger.info(f"Writing content to temp file: {file_path}")
        with open(file_path, 'wb') as f:
            f.write(content)
        
        logger.info(f"Successfully saved scan report to: {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"Error in get_scan_report: {str(e)}")
        raise

def convert_column_type(column_type: str) -> str:
    logger = get_run_logger()
    
    if not column_type:
        logger.warning("Empty column type, defaulting to TEXT")
        return 'TEXT'
    
    normalized_type = column_type.upper()
    
    if normalized_type in POSTGRES_TYPES_MAPPING:
        postgres_type = POSTGRES_TYPES_MAPPING[normalized_type]
        logger.debug(f"Converting {column_type} to {postgres_type}")
        return postgres_type
    
    return column_type

@task(name="process_scan_report")
def process_scan_report(scan_report_path: Path) -> List[Dict]:
    logger = get_run_logger()
    logger.info(f"Starting to process scan report: {scan_report_path}")
    
    try:
        logger.info("Opening scan report workbook...")
        overview = pd.read_excel(scan_report_path, dtype=str, na_filter=False, engine='calamine')
        
        logger.info("Processing tables from overview sheet...")
        tables_pd = sqldf(
            """select `table`, group_concat(field || ':' || type || ':' || "Max length", ';') as fields
             from overview group by `table`;""")
        
        tables_pd = tables_pd[tables_pd.Table != '']
        
        schema = []
        for _, row in tables_pd.iterrows():
            table_name = row['Table']
            fields = row['fields'].split(';')
            logger.info(f"Processing table: {table_name}")
            
            column_list = []
            for field in fields:
                column_description = field.split(':')
                column_name = column_description[0]
                column_type = convert_column_type(column_description[1])
                max_length = column_description[2]
                
                if max_length != '0' and column_type.lower() in TYPES_WITH_MAX_LENGTH:
                    if column_type == 'TIMESTAMP(P) WITH TIME ZONE':
                        column_type = column_type.replace('(P)', f'({max_length})')
                    elif column_type == 'TEXT':
                        column_type = column_type
                    else:
                        column_type = f'{column_type}({max_length})'
                
                column_list.append({
                    "column_name": column_name,
                    "column_type": column_type
                })
            
            schema.append({
                "table_name": table_name,
                "column_list": column_list
            })
        
        logger.info(f"Successfully processed {len(schema)} tables")
        return schema
        
    except Exception as e:
        logger.error(f"Error processing scan report: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

@flow(log_prints=True)
def data_mapping_plugin(options: Dict) -> str:
    logger = get_run_logger()

    username = options["headers"]["username"]
    data_id = options["data"]["dataId"]
    file_name = options["data"]["fileName"]
    
    logger.info(f"Creating source schema for user {username}")
    
    files_manager = initialize_files_manager()
    
    # Get scan report from files manager
    scan_report_path = get_scan_report(
        data_id=data_id,
        file_name=file_name,
        username=username,
        files_manager=files_manager
    )
    
    source_tables = process_scan_report(
        scan_report_path=scan_report_path
    )
    
    result = {
        "etl_mapping": {
            "cdm_version": None,
            "id": data_id,  # Using dataId as etl_mapping_id
            "scan_report_id": data_id,
            "scan_report_name": file_name,
            "source_schema_name": f"scan-report-{data_id}",
            "username": username
        },
        "source_tables": source_tables
    }
    
    artifact_key = f"{runtime.flow_run.id}-source-schema"
    create_markdown_artifact(
        key=artifact_key,
        markdown=json.dumps(result),
        description="Source schema from scan report stored as JSON"
    )
    
    scan_report_path.unlink(missing_ok=True)
    
    return artifact_key
