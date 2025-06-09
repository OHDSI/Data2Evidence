import pytest
import nodes.nodes as nodes
from rpy2.rinterface_lib.embedded import RRuntimeError


@pytest.fixture
def mock_r_node_json():
    # R node multiplies input by 2 and returns result
    return {
        "id": "1",
        "type": "r_node",
        "r_code": "exec <- function(myinput) \n\n{\n\nval <- strtoi(myinput)*2 \n\nreturn(val)}",
    }


def test_r_node_task(helpers, mock_r_node_json, mock_task_run_context):
    r_node = nodes.RNode(mock_r_node_json)
    result = r_node.task(5, mock_task_run_context)

    assert result.error == False
    assert result.data == 10
    helpers.assert_result_metadata(result, mock_task_run_context)


def test_r_node_task_fails_with_invalid_r_code(helpers, mock_task_run_context):

    invalid_r_code = "exec <- functio(myinput) \n\n{\n\nval <- strtoi(myinput)*2 \n\nreturn(val)}"
    r_node = nodes.RNode({
        "id": "1",
        "type": "r_node",
        "r_code": invalid_r_code,
    })
    result = r_node.task('_dummy_input', mock_task_run_context)

    assert result.error == True
    assert isinstance(result.data, str)
    helpers.assert_result_metadata(result, mock_task_run_context)
