import pytest
import nodes.nodes as nodes
import pandas as pd


def test_sql_node_task(helpers, mock_ddf_person, mock_dataflow, mock_task_run_context):
    sql_node = nodes.SqlNode(
        mock_dataflow["json_graph"]["nodes"]["person_sql_node"])

    _input = {'person_csv_node': nodes.Result(
        None, mock_ddf_person, sql_node, mock_task_run_context)}
    result = sql_node.task(_input, mock_task_run_context)

    assert result.error == False
    assert isinstance(result.data, pd.DataFrame)
    assert len(result.data.index) == 5
    helpers.assert_result_metadata(result, mock_task_run_context)


def test_sql_node_task_error_with_wrong_input(helpers, mock_ddf_person, mock_dataflow, mock_task_run_context):
    # Node is expecting "person_csv_node" as a key in the result.data
    sql_node = nodes.SqlNode(
        mock_dataflow["json_graph"]["nodes"]["person_sql_node"])
    _input = {'incorrect_input_node': nodes.Result(
        None, mock_ddf_person, sql_node, mock_task_run_context)}
    result = sql_node.task(_input, mock_task_run_context)

    assert result.error == True
    assert isinstance(result.data, str)
    helpers.assert_result_metadata(result, mock_task_run_context)
