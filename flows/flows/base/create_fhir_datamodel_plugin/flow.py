import json
import sqlalchemy as sql

from prefect import flow, task
from prefect.variables import Variable
from prefect.logging import get_run_logger
from prefect.states import Failed, Completed

from flows.create_fhir_datamodel_plugin.types import *
from flows.create_fhir_datamodel_plugin.fhir_utils import *

from shared_utils.dao.DBDao import DBDao


@flow(log_prints=True)
def create_fhir_datamodel_plugin(options: CreateFhirDataModelOptions):
    logger = get_run_logger()
    
    database_code = options.database_code
    schema_name = options.schema_name
    vocab_schema = options.vocab_schema
    
    schema_path = Variable.get("fhir_schema_file") + '/fhir.schema.json'
    with open(schema_path, "r") as file:

            # change data type in "decimal" definition to decimal
            data = json.load(file)
            data["definitions"]["decimal"]["type"] = "decimal"
            fhir_schema_json = FhirSchemaJsonType(**data)


    dbdao = DBDao(use_cache_db=True,
                  database_code=database_code, 
                  schema_name=schema_name,
                  vocab_schema_name=vocab_schema,
                  connect_to_duckdb=True)

    # get fhir data types
    fhir_data_types = get_fhir_data_types(fhir_schema_json)

    # map fhir data types to duckdb data types
    duckdb_data_types = convert_fhir_data_types_to_duckdb(fhir_data_types)
    
    created_tables = extract_definition_and_create_table(fhir_schema_json=fhir_schema_json,
                                                         duckdb_data_types=duckdb_data_types,
                                                         dbdao=dbdao,
                                                         schema_name=schema_name,
                                                         return_state=True)

    if created_tables.is_failed() is True:
        flow_error_msg = f"Failed to create fhir data model in '{database_code}.{schema_name}' cachedb file!"
        logger.error(created_tables.message)
        return Failed(msg=flow_error_msg)
    else:
        flow_success_msg = f"Successfully created fhir data model in '{database_code}.{schema_name}' cachedb file!"
        return Completed(msg=flow_success_msg)
            

@task(log_prints=True)
def drop_tables_hook(dbdao: DBDao, tables_to_drop: list[str]):
    logger = get_run_logger()

    if len(tables_to_drop) == 0:
        # No tables were created or fhir tables already exist in duckdb file
        logger.info("No tables to clean up")
    else:
        with dbdao.engine.connect() as connection:
            for table in tables_to_drop:
                drop_table_statement = sql.text(f"Drop table if exists {dbdao.schema_name}.{table}")
                connection.execute(drop_table_statement)
                connection.commit()
                logger.info(f"Dropped table '{table}' from '{dbdao.database_code} {dbdao.schema_name}'!")


@task(log_prints=True)
def extract_definition_and_create_table(fhir_schema_json: FhirSchemaJsonType,
                                        duckdb_data_types: dict[str, DuckDBDataTypes],
                                        dbdao,
                                        schema_name: str):
    
    logger = get_run_logger()
    created_tables = []

    for index, resource in enumerate(fhir_schema_json.discriminator.mapping):
        logger.info(f"Handling fhir resource '{resource}'..")
        try:
            # Get fhir definition and nested definitions from fhir.schema.json[definitions]
            parsed_fhir_definition = get_fhir_table_structure(fhir_schema_json, resource)
            logger.debug(parsed_fhir_definition)

            # Convert fhir definition into a columns
            duckdb_table_structure = get_duckdb_column_string(duckdb_data_types,
                                                                parsed_fhir_definition,
                                                                True)
            
            # Execute create table statement in duckdb file
            table_name = resource + "Fhir"
            create_fhir_table(duckdb_table_structure, dbdao, schema_name, table_name)

        except Exception as err:
            error_msg = f"Error occurred while creating table for fhir resource '{resource}'"
            logger.error(error_msg + f": {err}")
            drop_tables_hook(dbdao=dbdao, tables_to_drop=created_tables)
            return Failed(message=error_msg)

        else:
            created_tables.append(resource)

    return created_tables


@task(log_prints=True)
def get_fhir_data_types(fhir_schema_json: FhirSchemaJsonType) -> dict[str, str]:
    data_types = {}
    for key, value in fhir_schema_json.definitions.items():
        if value.type: # i.e. is a fhir data type
            data_types[key] = value.type
    return data_types


@task(log_prints=True)
def convert_fhir_data_types_to_duckdb(fhir_data_types: dict[str, str]) -> dict[str, str]:
    basic_data_types = set(fhir_data_types.values())
    duckdb_types = {x: FHIR_TO_DUCKDB[x] for x in basic_data_types}
    return duckdb_types


def get_fhir_table_structure(fhir_schema_json: FhirSchemaJsonType,
                             fhir_definition_name: str) -> dict:

    fhir_table_definition = fhir_schema_json.definitions.get(fhir_definition_name)
    fhir_table_definition.parsedProperties = dict() # Create a attribute to store property dtypes
    if is_resource(fhir_schema_json, fhir_definition_name):
        if fhir_table_definition.properties:
            for property, property_definition in fhir_table_definition.properties.items():
                if property[0] == "_":
                    continue
                else:
                    propery_path = get_property_path(property_definition)
                    if is_custom_type(propery_path):
                        fhir_table_definition.parsedProperties[property] = ['string']
                    elif propery_path in ["Meta", "Extension"]:
                        fhir_table_definition.parsedProperties[property] = 'json'
                    else:
                        fhir_table_definition.parsedProperties[property] = get_nested_property(fhir_schema_json, property, propery_path, fhir_table_definition.properties[property], propery_path)
            return fhir_table_definition.parsedProperties
        else:
            raise ValueError(f"The input FHIR resource {fhir_definition_name} has no properties defined")
    else:
        raise ValueError(f"The input resource {fhir_definition_name} is not a FHIR resource")


def create_fhir_table(fhir_table_definition: str, 
                      dbdao: DBDao, 
                      schema_name: str,
                      table_name: str):
    logger = get_run_logger()
    engine = dbdao.engine
    with engine.connect() as connection:
        try:
            create_fhir_datamodel_table = sql.text(f"create table {schema_name}.{table_name} ({fhir_table_definition})")
            logger.debug(create_fhir_datamodel_table)
            connection.execute(create_fhir_datamodel_table)
        except Exception as e:
            logger.error(f"Failed to create table: '{schema_name}.{table_name}': {e}")
            logger.info("The sql query to be execute was:\n", create_fhir_datamodel_table)
            raise e
        else:
            connection.commit()
            logger.info(f"Successfully created table: '{schema_name}.{table_name}'!")
        

def get_duckdb_column_string(duckdb_data_types: dict[str, DuckDBDataTypes],
                             data_structure: dict, 
                             concat_columns:bool) -> str:

    list_of_table_columns = []
    for property in data_structure:
        if property[0] != "_":
            list_of_table_columns.append(get_fhir_datamodel(duckdb_data_types, data_structure, property))
    #Add extra columns
    list_of_table_columns.append("isActive BOOLEAN")
    list_of_table_columns.append("createAt TIMESTAMP")
    list_of_table_columns.append("lastUpdateAt TIMESTAMP")
    return ', '.join(list_of_table_columns) if concat_columns else list_of_table_columns