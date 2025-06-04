import pytest
import nodes.nodes as nodes


def test_python_node_task(helpers, mock_dataflow, mock_task_run_context):
    python_node = nodes.PythonNode(
        mock_dataflow["json_graph"]["nodes"]["multiplybyten"])
    result = python_node.task(5, mock_task_run_context)

    assert result.error == False
    assert result.data == 50
    helpers.assert_result_metadata(result, mock_task_run_context)


def test_python_node_task_error_with_wrong_input(helpers, mock_dataflow, mock_task_run_context):
    python_node = nodes.PythonNode(
        mock_dataflow["json_graph"]["nodes"]["multiplybyten"])
    result = python_node.task(None, mock_task_run_context)

    assert result.error == True
    assert isinstance(result.data, str)
    helpers.assert_result_metadata(result, mock_task_run_context)


def test_python_node_task_error_with_invalid_python_code(helpers, mock_task_run_context):
    invalid_python_code = "x = 5\npnt(x)"
    python_node = nodes.PythonNode(
        {
            "id": "1",
            "type": "python_node",
            "python_code": invalid_python_code,
        },)
    result = python_node.task(None, mock_task_run_context)

    assert result.error == True
    assert isinstance(result.data, str)
    helpers.assert_result_metadata(result, mock_task_run_context)
