from typing import List, Dict
from pathlib import Path
from prefect import task, runtime
from prefect.artifacts import create_markdown_artifact
from prefect.logging import get_run_logger
import pandas as pd
from pandasql import sqldf
import json
import os

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
def process_scan_report(file_id: int, file_name: str, username: str, scan_report_path: Path = "ScanReport.xlsx") -> List[Dict]:
    logger = get_run_logger()
    logger.info(f"Starting to process scan report: {scan_report_path}")

    if not os.path.exists(scan_report_path):
        raise FileNotFoundError("Scan report does not exist")

    try:
        logger.info("Opening scan report workbook...")
        overview = pd.read_excel(
            scan_report_path, dtype=str, na_filter=False, engine='calamine')

        logger.info("Processing tables from overview sheet...")
        tables_pd = sqldf(
            """select `table`, group_concat(field || ':' || type || ':' || "Max length", ';') as fields
             from overview group by `table`;""")

        tables_pd = tables_pd[tables_pd.Table != '']

        source_tables = []
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
                        column_type = column_type.replace(
                            '(P)', f'({max_length})')
                    elif column_type == 'TEXT':
                        column_type = column_type
                    else:
                        column_type = f'{column_type}({max_length})'

                column_list.append({
                    "column_name": column_name,
                    "column_type": column_type
                })

            source_tables.append({
                "table_name": table_name,
                "column_list": column_list
            })

        logger.info(f"Successfully processed {len(source_tables)} tables")

        result = {
            "etl_mapping": {
                "cdm_version": None,
                "id": file_id,
                "scan_report_id": file_id,
                "scan_report_name": file_name,
                "source_schema_name": f"scan-report-{file_id}",
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

        return artifact_key

    except Exception as e:
        logger.error(f"Error processing scan report: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise
