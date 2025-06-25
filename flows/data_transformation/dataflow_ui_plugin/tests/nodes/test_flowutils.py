import pytest
from nodes.flowutils import serialize_to_json, get_node_list, get_incoming_edges, get_scheduler_address
import pandas as pd


def test_get_node_list(mock_dataflow):
    node_list = get_node_list(mock_dataflow["json_graph"])
    assert node_list == [
        'person_csv_node', 'death_csv_node', 'dbread', 'person_sql_node', 'death_sql_node',
        'mysql_node', 'my_data_mapping', 'my_r_node', 'py_node', 'productsubflow', 'writer_node', 'sqlquery', 'multiplybyten', 'multiplyagain'
    ]


@pytest.mark.parametrize("node_name, expected_data", [
    ('death_sql_node', {'death_csv_node': {"id": "3", 'file': './tests/data/death.csv', 'type': 'csv_node', 'columns': [
     'person_id', 'death_date', 'death_datetime', 'death_type_concept_id', 'cause_concept_id', 'cause_source_value', 'cause_source_concept_id'], 'hasheader': True, 'name': 'death_csv', 'datatypes': {}, 'delimiter': ','}}),
    ("sqlquery", {'py_node': {"id":"7" , 'type': 'python_node',
     'python_code': 'import sqlalchemy as asql\nimport pandas as pd\ndef exec(myinput):\n myinput["dbrjson"] = myinput["dbread"].data.compute().to_json(orient="records")\n myinput["Hello"] = "hello world!"\n return myinput\ndef test_exec(myinput):\n return exec(myinput)'}}), ("multiplybyten", {})
])
def test_get_incoming_edges(node_name, expected_data, mock_dataflow):
    incoming_edges = get_incoming_edges(
        mock_dataflow["json_graph"], mock_dataflow["json_graph"]["nodes"], node_name)
    assert incoming_edges == expected_data


mock_json = [{"col1": "str1", "col2": 1}, {
    "col1": "str2", "col2": 2}]


@pytest.mark.parametrize("data, expected_data", [
    (mock_json, [{"col1": "str1", "col2": 1}, {"col1": "str2", "col2": 2}]),
    (pd.DataFrame.from_dict(mock_json),
     '[{"col1":"str1","col2":1},{"col1":"str2","col2":2}]'),
    ('[{"col1":"str1","col2":1},{"col1":"str2","col2":2}]'),
    ({"pd_df": pd.DataFrame.from_dict(mock_json)},
     {'pd_df': '[{"col1":"str1","col2":1},{"col1":"str2","col2":2}]',
      'dd_df': '[{"col1":"str1","col2":1},{"col1":"str2","col2":2}]'}
     )
])
def test_serialize_to_json(data, expected_data):
    seralized_json = serialize_to_json(data)
    assert seralized_json == expected_data


def test_get_scheduler_address(mock_dataflow):
    scheduler_address = get_scheduler_address(
        mock_dataflow["json_graph"]["nodes"]["productsubflow"])
    assert scheduler_address == 'https://testhost:1234'
