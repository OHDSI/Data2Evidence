import pytest
from importlib import import_module

import dataflow_ui_plugin.nodes as nodes
from dataflow_ui_plugin.flow import setup_plugin
import dataflow_ui_plugin.flowutils as flowutils


@pytest.fixture
def setup(monkeypatch):
    setup_plugin()
    dbutils = import_module("types.DBUtils")
    monkeypatch.setattr(dbutils, 'create_database_engine', mock_GetDBConnection)


def mock_GetDBConnection(db_name, user_type):
    return "_dummy_db_conn"


@pytest.mark.parametrize(('node_type, node_name, expected_data'), [
    ("csv_node", "person_csv_node", nodes.CsvNode),
    ("sql_node", "person_sql_node", nodes.SqlNode),
    ("python_node", "py_node", nodes.PythonNode),
    ("r_node", "my_r_node", nodes.RNode),
    ("db_writer_node", "writer_node", nodes.DbWriter),
    ("sql_query_node", "sqlquery", nodes.SqlQueryNode),
    ("data_mapping_node", "my_data_mapping", nodes.DataMappingNode),
])
def test_generate_node_task(setup, node_type, node_name, expected_data, mock_dataflow):
    node = mock_dataflow["json_graph"]["nodes"][node_name]
    generated_node = nodes.generate_node_task.fn("_dummy", node, node_type)
    assert isinstance(generated_node, expected_data)


def test_generate_node_task_unknown_node(caplog):
    node = {
        "type": "non_existent_node",
    }
    generated_node = nodes.generate_node_task.fn(
        "_dummy", node, "undefined_node")

    assert generated_node == None
    assert "ERR: Unknown Node "+node["type"] in caplog.text


def test_generate_nodes_flow(setup, mock_dataflow):
    node_objects = [
        ("person_csv_node", nodes.CsvNode),
        ("person_sql_node", nodes.SqlNode),
        ("py_node", nodes.PythonNode),
        ("my_r_node", nodes.RNode),
        ("writer_node", nodes.DbWriter),
        ("sqlquery", nodes.SqlQueryNode),
        ("my_data_mapping", nodes.DataMappingNode)
    ]
    sorted_nodes = flowutils.get_node_list(mock_dataflow["json_graph"])
    graph = mock_dataflow["json_graph"]
    nodes_flows = nodes.generate_nodes_flow(graph, sorted_nodes)
    for node_name, node_type in node_objects:
        assert isinstance(nodes_flows["nodes"]
                          [node_name]["nodeobj"], node_type)
