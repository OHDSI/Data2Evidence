import ibis
import json
import duckdb
import logging
from typing import Any
import traceback as tb
from rpy2 import robjects
from functools import partial
from jsonpath_ng import parse
from pydantic import ValidationError

import pandas as pd
from pandas.api.types import is_scalar, is_list_like, is_dict_like

from genson import SchemaBuilder
from genson.schema.node import SchemaGenerationError

from prefect import task, flow

from .hooks import *
from .flowutils import *
from .types import (NodeType, 
                    TableSourceType, 
                    DataMappingType, 
                    ConceptMappingType)

from .nodeutils.querygenerator import *
from .nodeutils.csvutils import convert_csv_to_dataframe

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.SupabaseStorageAPI import SupabaseStorageAPI


class Node:
    def __init__(self, name, node):
        self.id = node["id"]
        self.name = name
        self.type = node["type"]


class Flow(Node):
    def __init__(self, _node):
        self.graph = _node["graph"]
        self.executor_type = _node["executor_options"]["executor_type"]
        self.executor_host = _node["executor_options"]["executor_address"]["host"]
        self.executor_port = _node["executor_options"]["executor_address"]["port"]
        self.ssl = _node["executor_options"]["executor_address"]["ssl"]
        self.sorted_nodes = get_node_list(self.graph)


class Result:
    def __init__(self, error: bool, data, node: Node, task_run_context):
        self.error = error
        self.node = node
        self.result = data # preserves the actual data of the node result
        self.task_run_id = str(task_run_context.get("id"))
        self.task_run_name = str(task_run_context.get("name"))
        self.flow_run_id = str(task_run_context.get("flow_run_id"))


    def serialize_result(self):
        base_result = {
            "error": self.error,
            "errorMessage": self.result if self.error else None,
            "nodeName": self.node.name
        }

        if self.error: return base_result
        base_result.update(self.__create_result_schema(self.result))
        return base_result
    

    def __is_strictly_list_like(self, obj):
        return is_list_like(obj) and not is_dict_like(obj)
    

    def __create_result_schema(self, result_value: Any):
        result_schema = {
            "length": len(result_value) if hasattr(result_value, "__len__") else None,
            "type": str(type(result_value))
        }

        if isinstance(result_value, pd.DataFrame):
            result_schema["schema"] = result_value.dtypes.apply(lambda x: x.name).to_dict()
            return result_schema

        try:
            builder = SchemaBuilder()
            if self.__is_strictly_list_like(result_value):
                builder.add_object(list(result_value))
            elif is_dict_like(result_value):
                builder.add_object(result_value)
            else:
                return result_schema

            schema = builder.to_schema()
            schema.pop("$schema", None)
            schema.pop("required", None)
            result_schema["schema"] = schema


        except SchemaGenerationError:
            if self.__is_strictly_list_like(result_value):
                result_schema["schema"] = [self.__create_result_schema(v) for v in result_value]
            elif is_dict_like(result_value):
                result_schema["schema"] = {k: self.__create_result_schema(v) for k, v in result_value.items()}
            
        return result_schema


class Py2TableNode(Node):
    """
    Retrieves a table using a specified path in a python object and return as table.
    
    Attributes:
        path: str
        source: str
    """
    def __init__(self, name, _node):
        super().__init__(name, _node)
        self.map = _node.get("map")
        self.ui_map = _node.get("uiMap")


    def _get_matches(self, json_to_parse: dict, json_path: str):
        expression = parse(json_path)

        matched: list = expression.find(json_to_parse)

        # Assume only one match so return index 0
        return matched[0].value
    
    def __create_dataframe(self, data: dict|list) -> pd.DataFrame:
        if isinstance(data, dict):
            if all(not isinstance(v, list) for v in data.values()):
                # If values are all scalar, need to pass in index
                index = [0]
                return pd.DataFrame(data, index=index)
            else:
                return pd.DataFrame.from_dict(data)
        else:
            # Data is list
            return pd.DataFrame(data)

    def _exec(self, _input: dict[str, Result]) -> pd.DataFrame:
        source_node = self.ui_map.get("source").split(".")[0]
        path = self.ui_map.get("path")
        result_obj = _input.get(source_node).result

        if isinstance(result_obj, pd.DataFrame):
            return result_obj
        elif isinstance(result_obj, dict):
            # If result from input node is already a json/dict object, use jsonpath to access data
            data = self._get_matches(result_obj, path)
        else:
            # Assume result from input node is an instance of a class
            # Remove first element and use it to access the attribute that stores the data
            path_list: list = path.split(".")
            data_attribute = path_list.pop(0)
            json_to_parse = getattr(result_obj, data_attribute)
            data = self._get_matches(json_to_parse, ".".join(path_list))

        df = self.__create_dataframe(data)
        return df
    
    def test(self, _input: dict[str, Result], task_run_context):
        try:
            table_df = self._exec(_input)
            return Result(False,  table_df, self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)
    

    def task(self, _input: dict[str, Result], task_run_context):
        try:
            table_df = self._exec(_input)
            return Result(False,  table_df, self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)


class SqlNode(Node):
    """
    Execute queries on pandas dataframes using duckdb as backend.
    
    Attributes:
        tables: A dictionary mapping of a user input table name to a dataframe from an incoming node. 
        sql: The sql query to execute.
    """
    def __init__(self, name, _node):
        super().__init__(name, _node)
        self.sql = _node["sql"]
        
    def __exec_query(self, _input: dict[str, Result]) -> pd.DataFrame:
        con = None
        try:
            # create temporary in-memory table and register input dfs as tables
            con = duckdb.connect()
            # If _input is empty i.e. no linked nodes assume dummy query and execute
            if _input == {}:
                result_df = con.execute(self.sql).fetch_df()
            else:
                for nodename, input_node_result in _input.items():
                    data = input_node_result.result

                    # Register incoming dfs as tables using nodename
                    if isinstance(data, str):
                        temp_df = pd.DataFrame(json.loads(data))
                        con.register(nodename, temp_df)
                    else:
                        
                        con.register(nodename, data)
                result_df = con.execute(self.sql).fetch_df()
            return result_df
        except Exception as e:
            raise e
        finally:
            if con:
                con.close()
        
            
    def task(self, _input: dict[str, Result], task_run_context)  -> pd.DataFrame:
        try:
            result_df = self.__exec_query(_input)
            return Result(False,  result_df, self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)

    def test(self, _input: dict[str, Result], task_run_context):
        return self.task(_input, task_run_context)


class PythonNode(Node):
    def __init__(self, name, _node):
        super().__init__(name, _node)
        self.source_code = _node["python_code"] + '\noutput = exec(myinput)'
        self.test_source_code = _node["python_code"]+'\noutput = test_exec(myinput)'
        
    def test(self, _input: dict[str, Result], 
             shared_variables: dict[str, str], 
             importlibs: list[str], 
             task_run_context):
        params = {"myinput": _input, "output": {}}
        testcode = compile(self.test_source_code, '<string>', 'exec')
        e = exec(testcode, params)
        return params["output"]

    def task(self, _input: dict[str, Result], 
             shared_variables: dict[str, str], 
             importlibs: list[str], 
             task_run_context):
        params = {"myinput": _input, "output": {}}
        try:
            if shared_variables:
                params.update(shared_variables)
            if importlibs:
                exec("\n".join(importlibs), params)
            code = compile(self.source_code, '<string>', 'exec')

            data = exec(code, params)
            return Result(False,  params["output"], self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)


class RNode(Node):
    def __init__(self, name, _node):
        super().__init__(name, _node)
        self.r_code = ''''''+_node["r_code"]+''''''

    def test(self, _input: dict[str, Result], task_run_context):
        
        with robjects.conversion.localconverter(robjects.default_converter):
            r_inst = robjects.r(self.r_code)
            r_test_exec = robjects.globalenv['test_exec']
            global_params = {"r_test_exec": r_test_exec, "convert_R_to_py": convert_R_to_py,
                             "myinput": convert_py_to_R(_input), "output": {}}
            e = exec(
                f'output = convert_R_to_py(r_test_exec(myinput))', global_params)
        output = global_params["output"]
        return output

    def task(self, _input: dict[str, Result], task_run_context):
        try:
            with robjects.conversion.localconverter(robjects.default_converter):
                r_inst = robjects.r(self.r_code)
                r_exec = robjects.globalenv['exec']
                global_params = {"r_exec": r_exec, "convert_R_to_py": convert_R_to_py,
                                 "myinput": convert_py_to_R(_input), "output": {}}
                e = exec(f'output = convert_R_to_py(r_exec(myinput))',
                         global_params)
            output = global_params["output"]
            return Result(False,  output, self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)


class CsvNode(Node):
    def __init__(self, name, _node):
        super().__init__(name, _node)
        self.file = _node["file"]
        self.delimiter = _node["delimiter"]

        self.names = _node["columns"] # Todo: Not inside payload from backend
        self.hasheader = _node["hasheader"] # Todo: Not inside payload from backend
        self.encoding = _node.get("encoding", "utf8") # Todo: Not inside payload from backend


    def _load_csv_into_dataframe(self) -> pd.DataFrame:
        csv_response = SupabaseStorageAPI().get_csv_file(self.id, self.file)

        return convert_csv_to_dataframe(
            csv_response, 
            hasheader=self.hasheader, 
            delimiter=self.delimiter, 
            names=self.names, 
            encoding=self.encoding
        )

    def test(self, task_run_context):
        df = self._load_csv_into_dataframe()
        return df

    def task(self, task_run_context) -> Result:
        try:
            df = self._load_csv_into_dataframe()
            return Result(False,  df, self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)


class DbWriter(Node):
    def __init__(self, name, _node):
        super().__init__(name, _node)
        self.schema_name = _node["schemaname"]
        self.table_name = _node["dbtablename"]
        self.database = _node["database"] 
        self.dataframe = _node["dataframe"]
        self.use_cache_db = False

    def test(self, _input: dict[str, Result], task_run_context):
        return False

    def task(self, _input: dict[str, Result], task_run_context):        
        dbutils = DBDao(use_cache_db=self.use_cache_db, database_code=self.database)
        dbconn = dbutils.engine

        try:
            df_to_write = _input[self.dataframe].result
            result = df_to_write.to_sql(self.table_name, 
                                        dbconn, 
                                        schema=self.schema_name, 
                                        if_exists='append',
                                        index=False)
            
            return Result(False,  result, self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)

class DBReader(Node):
    def __init__(self, name, _node):
        super().__init__(name, _node)
        self.sqlquery = _node["sqlquery"]
        self.schemaname = "cdmdefault" # Use as the default schema for all dialects
        self.database = _node["database"]
        self.testdata = _node["testdata"]

    def test(self, task_run_context):
        return Result(False,  pd.read_json(json.dumps(self.testdata), orient="split"), self, task_run_context)

    def task(self, task_run_context) -> Result:
        dbutils = DBDao(use_cache_db=False, database_code=self.database) 
        dbconn = dbutils.engine

        try:
            df = pd.read_sql_query(
                self.sqlquery, dbconn)
            return Result(False,  df, self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)


class ConceptMappingNode(Node):
    def __init__(self, name, _node):
        super().__init__(name, _node)

        self.concept_mapping_data = _node["data"]["csvData"]["data"]
        
    def test(self, task_run_context) -> Result:
        return self.task(task_run_context)
    
    def task(self, task_run_context) -> Result:
        try:
            checked_concepts = (
                {
                    "domain_id": cm.domainId,
                    "concept_id": cm.conceptId,
                    "concept_name": cm.conceptName,
                    "source_code": cm.source_code,
                    "validity": cm.validity if cm.validity else None
                } for item in self.concept_mapping_data
                if (cm := ConceptMappingType(**item)).status == "checked"
            )
            concept_mapping_df = pd.DataFrame(checked_concepts)
            return Result(False,  concept_mapping_df, self, task_run_context)
        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)


class DataMappingNode(Node):
    def __init__(self, name, _node):
        super().__init__(name, _node)


        # Fail node generation if scan report data validation fails
        self.etl_mapping = DataMappingType(**_node["data"])

    def create_target_table_df(self, target_table_name: str) -> pd.DataFrame:
        """
        Creates and returns a pandas DataFrame for the specified target table.
        Args:
            target_table_name (str): The name of the target table.
        Returns:
            pd.DataFrame: A DataFrame containing the data from the target table.
        Raises:
            Exception: Propagates any exceptions encountered during database connection or querying.
        """
       
        # Todo: Remove hard code after scan report json is updated
        table_source = "csv"
        database_code = "demodb"

        db_con = None
        try:
            if table_source == TableSourceType.CSV:
                # Use duckdb as ibis backend for csv files
                db_con = ibis.duckdb.connect()
                target_df = self.generate_query(db_con, target_table_name, table_source)

            if table_source  == TableSourceType.DB:
                # Use db as ibis backend depending on database_code
                db_con = DBDao(use_cache_db=False, database_code=database_code).ibis_connect()
                with db_con as con:
                    target_df = self.generate_query(con, target_table_name, table_source)

        except Exception as e:
            raise
        finally:
            if db_con and table_source == TableSourceType.CSV:
                db_con.disconnect()

        return target_df
    
    def generate_query(self, con, target_table_name: str, table_source: TableSourceType, ) -> pd.DataFrame:
        table_mappings = self.etl_mapping.table.edges
        column_mappings = self.etl_mapping.field.edges

        # Todo: Remove hard code after scan report json is updated
        schema_name = "synthea"
        hasheader = True
        delimiter = ","
        encoding = "utf8"
        
        source_table_queries = {}
        for mapping in table_mappings:
            if mapping.targetHandle == target_table_name:
                source_table_name = mapping.sourceHandle
                field_map_key = mapping.id

            if mapping.targetHandle == target_table_name:
                if table_source == TableSourceType.CSV:
                    # Register source table from CSV
                    csv_file_name = source_table_name + ".csv"
                    csv_response = SupabaseStorageAPI().get_csv_file(self.id, csv_file_name)
                    source_df = convert_csv_to_dataframe(
                        csv_response,
                        hasheader=hasheader,
                        delimiter=delimiter,
                        names=None,
                        encoding=encoding
                        )
                    temp_table_obj = con.create_table(source_table_name, source_df)
                elif table_source == TableSourceType.DB:
                    temp_table_obj = con.table(source_table_name, database=schema_name)
                
                source_table_obj = temp_table_obj.mutate({
                        name: temp_table_obj[name].cast("int64") if dtype.is_integer() else temp_table_obj[name]
                        for name, dtype in temp_table_obj.schema().items()
                    })

                selected_columns = []
                mapped_target_columns = set()

                target_column_properties = self.etl_mapping.fieldMap[field_map_key].targetHandles
                
                for column_mapping in column_mappings:
                    if column_mapping.sourceHandle.startswith(source_table_name) \
                        and column_mapping.targetHandle.startswith(target_table_name):

                        source_column_name = column_mapping.sourceHandle.split("-")[-1]
                        target_column_name = column_mapping.targetHandle.split("-")[-1]

                        mapped_target_columns.add(target_column_name)

                        # Todo: Update to apply function to column if specified in mapping
                        selected_columns.append(
                            apply_ibis_func(
                                expr=source_table_obj[source_column_name],
                                table_columns=target_column_properties,
                                target_column=target_column_name
                            ) \
                            .cast(convert_column_type(target_column_name, target_column_properties)) \
                            .name(target_column_name)
                        )
                        
                # Select target columns with a constant value
                for col in target_column_properties:
                    if col.data.constantValue:
                        selected_columns.append(
                            ibis.literal(
                                convert_value( # Convert to dtype of target column
                                    col.data.constantValue, col.data.columnType
                                )
                            ).name(col.data.label)
                        )

                        mapped_target_columns.add(col.data.label)

                # For unmapped target columns, cast null value as appropriate type columns
                target_column_names = [col.data.label for col in target_column_properties]

                unmapped_target_columns: set[str] = set(target_column_names) - mapped_target_columns
                selected_columns.extend(
                    ibis.null() \
                        .cast(convert_column_type(col_name, target_column_properties)) \
                        .name(col_name) for col_name in unmapped_target_columns
                )

                query = source_table_obj.select(selected_columns)
                # Todo: Add where clause for lookup columns
                # sql = query.compile() # Uncomment to see individual table compiled query
                source_table_queries[source_table_name] = query

        # Use UNION ALL on source tables for the same target table as there is no join information
        if len(source_table_queries) > 1:
            union_all_query = union_all_tables(source_table_queries)
            
        else:
            union_all_query = list(source_table_queries.values())[0]

        union_all_sql = union_all_query.compile(pretty=True)

        print(f"SQL Query for {target_table_name}:")
        print(union_all_sql)

        if table_source == TableSourceType.DB:
            target_df = con.execute(union_all_query)
        else:
            target_df = con.execute(union_all_query)
        return target_df
    

        
    def test(self, task_run_context) -> Result:
        return self.task(self, task_run_context)


    def task(self, task_run_context) -> Result:
        try:
            table_mapping = self.etl_mapping.table.edges
            target_table_list = set(t.targetHandle for t in table_mapping)

            # store output dataframes for each target table
            target_table_dfs = {}
            for target_table in target_table_list:
                target_table_dfs[target_table] = self.create_target_table_df(target_table)

        except Exception as e:
            return Result(True, tb.format_exc(), self, task_run_context)
        else:
            return Result(False, target_table_dfs, self, task_run_context)


@flow(name="generate-nodes",
      flow_run_name="generate-nodes-flowrun",
      log_prints=True)
def generate_nodes_flow(graph, sorted_nodes):
    for nodename in sorted_nodes:
        node = graph["nodes"][nodename]
        nodetype = node["type"]

        # check if node is a subflow
        if nodetype == NodeType.SUBFLOW:
            subflow_obj = Flow(node)
            graph["nodes"][nodename]["nodeobj"] = subflow_obj
            for subflow_nodename in subflow_obj.sorted_nodes:
                subflow_nodegraph = subflow_obj.graph["nodes"][subflow_nodename]
                subflow_nodetype = subflow_nodegraph["type"]
                # create task run to generate node obj for each subflow node
                subflow_node_obj = generate_node_task(
                    subflow_nodename, subflow_nodegraph, subflow_nodetype)
                graph["nodes"][nodename]["graph"]["nodes"][subflow_nodename]["nodeobj"] = subflow_node_obj
        else:
            node_task_generation_wo = generate_node_task.with_options(
                on_completion=[partial(
                    node_task_generation_hook, **dict(nodename=nodename, nodetype=nodetype))],
                on_failure=[partial(node_task_generation_hook,
                                    **dict(nodename=nodename, nodetype=nodetype))]
            )

            nodeobj = node_task_generation_wo(nodename, node, nodetype)

            graph["nodes"][nodename]["nodeobj"] = nodeobj
    return graph


@task(task_run_name="generate-node-taskrun-{nodename}",
      log_prints=True
      )
def generate_node_task(nodename, node, nodetype):
    nodeobj = None
    match nodetype:
        case NodeType.CSV:
            nodeobj = CsvNode(nodename, node)
        case NodeType.SQL:
            nodeobj = SqlNode(nodename, node)
        case NodeType.PYTHON:
            nodeobj = PythonNode(nodename, node)
        case NodeType.PY2TABLE:
            nodeobj = Py2TableNode(nodename, node)
        case NodeType.RNODE:
            nodeobj = RNode(nodename, node)
        case NodeType.DBREADER:
            nodeobj = DBReader(nodename, node)
        case NodeType.DBWRITER:
            nodeobj = DbWriter(nodename, node)
        case NodeType.DATAMAPPING:
            nodeobj = DataMappingNode(nodename, node)
        case NodeType.CONCEPTMAPPING:
            nodeobj = ConceptMappingNode(nodename, node)
        case _:
            logging.error("ERR: Unknown Node "+node["type"])
            logging.error(tb.StackSummary())
    return nodeobj