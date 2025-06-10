import json
import numpy as np
import pandas as pd
from rpy2 import robjects

def get_node_list(graph):
    nodes = {}
    sorted_nodes = []
    for node in graph["nodes"].keys():
        nodes[node] = set()
    for edge in graph["edges"].values():
        if edge["target"] in nodes.keys():
            nodes[edge["target"]].add(edge["source"])
    while nodes:
        for node in nodes.keys():
            if not nodes[node]:
                sorted_nodes.append(node)
                nodes.pop(node)
                break
            else:
                for source_node in nodes[node].copy():
                    if source_node not in nodes:
                        nodes[node].remove(source_node)               
    return sorted_nodes

def get_incoming_edges(graph, nodes, nodename):
    connected_nodes = {}
    for edge in graph["edges"].values():
        if edge["target"] == nodename:
            connected_nodes[edge["source"]] = nodes[edge["source"]]
    return connected_nodes

def convert_py_to_R(python_obj):
    # Convert python object into rpy2 robject
    if python_obj is None:
        return robjects.r("NULL")
    elif isinstance(python_obj, pd.DataFrame):
        with (robjects.default_converter + robjects.pandas2ri.converter).context():
            r_df = robjects.conversion.get_conversion().py2rpy(python_obj)
        return r_df
    elif isinstance(python_obj, np.ndarray):
        return robjects.FloatVector(python_obj)
    elif isinstance(python_obj, (list, tuple, set, pd.Index)):
        if len(python_obj) == 0:
            return robjects.r("list()")
        if isinstance(python_obj[0], float):
            return robjects.FloatVector(python_obj)
        if isinstance(python_obj[0], int):
            return robjects.IntVector(python_obj)
        return robjects.StrVector(python_obj)
    elif isinstance(python_obj, (pd.Series)):
        return convert_py_to_R(dict(python_obj))
    elif isinstance(python_obj, dict):
        temp = {k: convert_py_to_R(v.data) for k, v in python_obj.items()
                if v.data is not None}
        temp = {k: v for k, v in temp.items() if v is not None}
        return robjects.ListVector(temp)
    else:
        return python_obj

def convert_R_to_py(r_obj, name=""):
    
    result = r_obj
    remove_list = True
    if r_obj == robjects.vectors.NULL:
        return None
    elif isinstance(r_obj, robjects.vectors.DataFrame):
        with (robjects.default_converter + robjects.pandas2ri.converter).context():
            pd_df = robjects.conversion.get_conversion().rpy2py(r_obj)
            return pd_df
    elif isinstance(r_obj, (robjects.vectors.StrVector,
                           robjects.vectors.FloatVector,
                           robjects.vectors.BoolVector,
                           robjects.vectors.IntVector)):
        result = robjects.conversion.get_conversion().rpy2py(r_obj[0])
        return result
    elif isinstance(r_obj, robjects.vectors.ListVector):
        if r_obj.names == robjects.vectors.NULL:
            if '__len__' in result.__dir__() and len(result) == 1 and remove_list:
                return convert_R_to_py(result[0])
        else:
            result = {}
            remove_list = False
            if len(r_obj) > 0:
                result = dict(zip(r_obj.names, list(r_obj)))
                for k, v in result.items():
                    result[k] = convert_R_to_py(v, name=k)
            return result

def serialize_to_json(data: any) -> dict:
    if isinstance(data, pd.DataFrame):
        json_df = data.to_json(orient="records", default_handler=str)
        return json_df
    elif isinstance(data, dict):
        for key, value in data.items():
            if isinstance(data[key], pd.DataFrame):
                data[key] = serialize_to_json(value)
        return data
    elif hasattr(data, 'rid') and hasattr(data, 'rclass') and hasattr(data, 'r_repr'):
        return data.r_repr()
    else:
        try:
            # For primitive types, tuple, list
            json_value = json.dumps(data)
            return json_value
        except:
            # Assume custom object
            return serialize_to_json(data.__dict__)

def get_scheduler_address(graph):
    scheduler_host = graph["executor_options"]["executor_address"]["host"]
    scheduler_port = graph["executor_options"]["executor_address"]["port"]
    ssl = graph["executor_options"]["executor_address"]["ssl"]
    if ssl:
        return "https://" + scheduler_host + ":" + scheduler_port
    else:
        return "http://" + scheduler_host + ":" + scheduler_port
