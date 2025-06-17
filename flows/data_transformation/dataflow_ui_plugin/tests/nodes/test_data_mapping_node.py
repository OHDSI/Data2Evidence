import pytest
import nodes.nodes as nodes
from sqlalchemy.exc import NoSuchTableError
import pandas as pd


def test_data_mapping_node_task(helpers, mock_ddf_person, mock_ddf_death, mock_dataflow, mock_task_run_context):
    data_mapping_node = nodes.DataMappingNode(
        mock_dataflow["json_graph"]["nodes"]["my_data_mapping"])

    _input = {
        'person_sql_node': nodes.Result(
            None, mock_ddf_person, data_mapping_node, mock_task_run_context),
        'death_sql_node': nodes.Result(
            None, mock_ddf_death, data_mapping_node, mock_task_run_context)
    }
    result = data_mapping_node.task(_input, mock_task_run_context)

    assert result.error == False
    assert isinstance(result.data, pd.DataFrame)
    assert len(result.data.index) == 2
    helpers.assert_result_metadata(result, mock_task_run_context)


def test_data_mapping_node_task_error_with_wrong_input(helpers, mock_ddf_person, mock_ddf_death, mock_dataflow, mock_task_run_context):
    data_mapping_node = nodes.DataMappingNode(
        mock_dataflow["json_graph"]["nodes"]["my_data_mapping"])

    _input = {
        'incorrect_input_node': nodes.Result(
            None, mock_ddf_person, data_mapping_node, mock_task_run_context),
        'death_sql_node': nodes.Result(
            None, mock_ddf_death, data_mapping_node, mock_task_run_context)
    }
    result = data_mapping_node.task(_input, mock_task_run_context)

    assert result.error == True
    assert isinstance(result.data, str)
    helpers.assert_result_metadata(result, mock_task_run_context)
