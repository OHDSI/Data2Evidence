import pytest
import nodes.nodes as nodes
import pandas as pd


def test_csv_node_task(helpers, mock_dataflow, mock_task_run_context):
    csv_node_object = mock_dataflow["json_graph"]["nodes"]["person_csv_node"]
    csv_node = nodes.CsvNode(csv_node_object)
    result = csv_node.task(mock_task_run_context)

    assert result.error == False
    assert isinstance(result.data, pd.DataFrame)
    assert len(result.data.compute().index) == 5
    helpers.assert_result_metadata(result, mock_task_run_context)


def test_csv_node_task_error_with_file_not_found(helpers, mock_dataflow, mock_task_run_context):
    csv_node_object = mock_dataflow["json_graph"]["nodes"]["person_csv_node"]
    # Change file key to non-existent file to throw error
    csv_node_object["file"] = "nonexistent_csv_file.csv"
    csv_node = nodes.CsvNode(csv_node_object)
    result = csv_node.task(mock_task_run_context)

    assert result.error == True
    assert isinstance(result.data, str)
    helpers.assert_result_metadata(result, mock_task_run_context)
