import pytest
import nodes.nodes as nodes
from prefect.testing.utilities import prefect_test_harness
import pandas as pd

@pytest.fixture(autouse=True, scope="session")
# Run prefect flows against a temp SQLite db
def prefect_test_fixture():
    with prefect_test_harness():
        yield


class Helpers:
    @staticmethod
    def assert_result_metadata(result: nodes.Result, mock_task_run_context):
        # Assert task_run_id, task_run_name, flow_run_id metadata from Result object
        assert result.task_run_id == mock_task_run_context["id"]
        assert result.task_run_name == mock_task_run_context["name"]
        assert result.flow_run_id == mock_task_run_context["flow_run_id"]


@pytest.fixture
def helpers():
    return Helpers


@pytest.fixture
def mock_task_run_context():
    return {"id": "test_id", "name": "test_run", "flow_run_id": "test_flow_run_id"}


@pytest.fixture
def mock_ddf_person():
    return pd.read_csv("./tests/data/person.csv")


@pytest.fixture
def mock_ddf_death():
    return pd.read_csv("./tests/data/death.csv")


@pytest.fixture
def mock_dataflow():
    return {
        "json_graph":
        {
            "nodes":
            {
                "my_data_mapping":
                {
                    "id": "1", 
                    "type": "data_mapping_node",
                    "tables":
                    {"death": "death_sql_node", "person": "person_sql_node"},
                    "table_joins":
                    [
                        {
                            "full": False,
                            "is_outer_join": False,
                            "left_table_name": "person",
                            "right_table_name": "death",
                            "left_table_join_on": "PERSON_ID",
                            "right_table_join_on": "PERSON_ID",
                        },
                    ],
                    "data_mapping":
                    [
                        {
                            "fields":
                            [
                                {
                                    "source_field": "PERSON_ID",
                                    "target_field": "PERSON_PERSON_ID",
                                },
                                {
                                    "source_field": "DAY_OF_BIRTH",
                                    "target_field": "PERSON_DAY_OF_BIRTH",
                                },
                                {
                                    "source_field": "MONTH_OF_BIRTH",
                                    "target_field": "PERSON_MONTH_OF_BIRTH",
                                },
                                {
                                    "source_field": "YEAR_OF_BIRTH",
                                    "target_field": "PERSON_YEAR_OF_BIRTH",
                                },
                            ],
                            "input_table": "person",
                            "output_table": "custom_data_map_table",
                        },
                        {
                            "fields":
                            [
                                {
                                    "source_field": "PERSON_ID",
                                    "target_field": "DEATH_PERSON_ID",
                                },
                                {
                                    "source_field": "DEATH_DATE",
                                    "target_field": "DEATH_DEATH_DATE",
                                },
                            ],
                            "input_table": "death",
                            "output_table": "custom_data_map_table",
                        },
                    ],
                    "parent_table": "person",
                },
                "person_csv_node":
                {
                    "id": "2", 
                    "type": "csv_node",
                    "file": "./tests/data/person.csv",
                    "delimiter": ",",
                    "columns":
                    [
                        "person_id",
                        "gender_concept_id",
                        "year_of_birth",
                        "month_of_birth",
                        "day_of_birth",
                        "birth_datetime",
                        "race_concept_id",
                        "ethnicity_concept_id",
                        "location_id",
                        "provider_id",
                        "care_site_id",
                        "person_source_value",
                        "gender_source_value",
                        "gender_source_concept_id",
                        "race_source_value",
                        "race_source_concept_id",
                        "ethnicity_source_value",
                        "ethnicity_source_concept_id",
                    ],
                    "hasheader": True,
                    "name": "person_csv",
                    "datatypes": {},
                },
                "death_csv_node":
                {
                    "file": "./tests/data/death.csv",
                    "id": "3", 
                    "type": "csv_node",
                    "columns":
                    [
                        "person_id",
                        "death_date",
                        "death_datetime",
                        "death_type_concept_id",
                        "cause_concept_id",
                        "cause_source_value",
                        "cause_source_concept_id",
                    ],
                    "hasheader": True,
                    "name": "death_csv",
                    "datatypes": {},
                    "delimiter": ",",
                },
                "person_sql_node":
                {
                    "id": "4", 
                    "type": "sql_node",
                    "tables": {"person": ["person_csv_node"]},
                    "sql": "SELECT * FROM PERSON",
                },
                "death_sql_node":
                {
                    "id": "5", 
                    "type": "sql_node",
                    "tables": {"death": ["death_csv_node"]},
                    "sql": "SELECT * FROM DEATH",
                },
                "mysql_node":
                {
                    "id": "6", 
                    "type": "sql_node",
                    "tables":
                    {"person": ["person_csv_node"],
                        "death": ["death_csv_node"]},
                    "sql": 'SELECT COUNT(*) FROM person join death on person."PERSON_ID" = death."PERSON_ID"',
                },
                "py_node":
                {
                    "id": "7", 
                    "type": "python_node",
                    "python_code": "import sqlalchemy as asql\nimport pandas as pd\ndef exec(myinput):\n myinput[\"dbrjson\"] = myinput[\"dbread\"].data.compute().to_json(orient=\"records\")\n myinput[\"Hello\"] = \"hello world!\"\n return myinput\ndef test_exec(myinput):\n return exec(myinput)",
                },
                "my_r_node":
                {
                    "id": "8", 
                    "type": "r_node",
                    "r_code": "exec <- function(myinput) \n\n{return(myinput)}",
                },
                "writer_node":
                {
                    "id": "9", 
                    "type": "db_writer_node",
                    "dataframe": ["py_node", "mysql_node"],
                    "dbtablename": "JoinedTable",
                    "database": "alp",
                },
                "sqlquery":
                {
                    "id": "11", 
                    "type": "sql_query_node",
                    "database": "alp",
                    "sqlquery": "insert into horses values (:myname,5)",
                    "params": {"myname": ["py_node", "Hello"]},
                    "is_select": False,
                    "testsqlquery": "select name, size FROM horses",
                },
                "productsubflow":
                {
                    "id": "12", 
                    "type": "subflow",
                    "graph":
                    {
                        "edges":
                        {
                            "e3": {"source": "givefive", "target": "tempproduct"},
                            "e4": {"source": "givethree", "target": "tempproduct"},
                        },
                        "nodes":
                        {
                            "givethree":
                            {
                                "id": "13", 
                    "type": "python_node",
                                "python_code": "def exec(myinput):\n    return 3",
                            },
                            "givefive":
                            {
                                "id": "14", 
                    "type": "python_node",
                                "python_code": "def exec(myinput):\n    return 5",
                            },
                            "tempproduct":
                            {
                                "id": "15", 
                    "type": "python_node",
                                "python_code": "def exec(myinput):\n    givethree = myinput[\"givethree\"].data\n    givefive = myinput[\"givefive\"].data\n    return givefive * givethree",
                            },
                        },
                    },
                    "executor_options":
                    {
                        "executor_type": "default",
                        "executor_address": {"host": "testhost", "port": "1234", "ssl": True},
                    },
                },
                "multiplybyten":
                {
                    "id": "16", 
                    "type": "python_node",
                    "python_code": "def exec(myinput):\n    val = myinput*10\n    return val",
                },
                "multiplyagain":
                {
                    "id": "17", 
                    "type": "python_node",
                    "python_code": "def exec(myinput):\n    multiplybyten = myinput[\"multiplybyten\"].data\n    productsubflow = myinput[\"productsubflow\"].data\n    return multiplybyten * productsubflow",
                },
            },
            "edges":
            {
                "e1": {"source": "person_csv_node", "target": "mysql_node"},
                "e2": {"source": "death_csv_node", "target": "mysql_node"},
                "e3": {"source": "mysql_node", "target": "py_node"},
                "e4": {"source": "py_node", "target": "writer_node"},
                "e5": {"source": "dbread", "target": "py_node"},
                "e6": {"source": "py_node", "target": "sqlquery"},
                "e7": {"source": "person_csv_node", "target": "my_r_node"},
                "e8": {"source": "person_csv_node", "target": "person_sql_node"},
                "e9": {"source": "death_csv_node", "target": "death_sql_node"},
                "e10": {"source": "person_sql_node", "target": "my_data_mapping"},
                "e11": {"source": "death_sql_node", "target": "my_data_mapping"},
                "e13": {"source": "productsubflow", "target": "multiplyagain"},
                "e14": {"source": "multiplybyten", "target": "multiplyagain"},
            },
        },
        "options":
        {
            "trace_config": {"trace_mode": True, "trace_db": "alp"},
            "test_mode": False,
        },
    }
