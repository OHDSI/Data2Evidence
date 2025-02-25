import { ComponentType } from "react";
import { Node, NodeProps } from "reactflow";
import { NodeDataState } from "../../../types";
import { CsvNode } from "./CsvNode/CsvNode";
import { PythonNode } from "./PythonNode/PythonNode";
import { PythonNotebookNode } from "./PythonNotebookNode/PythonNotebookNode";
import { Py2TableNode } from "./Py2TableNode/Py2TableNode";
import { RNode } from "./RNode/RNode";
import { StrategusNode } from "./StrategusNode/StrategusNode";
import { SqlQueryNode } from "./SqlQueryNode/SqlQueryNode";
import { SqlNode } from "./SqlNode/SqlNode";
import { DbReaderNode } from "./DbReaderNode/DbReaderNode";
import { DbWriterNode } from "./DbWriterNode/DbWriterNode";
import { DataMappingNode } from "./DataMappingNode/DataMappingNode";
import { GroupNode } from "./GroupNode/GroupNode";
import { NodeChoiceAttr, NodeType, NodeTypeChoice, NodeTag } from "./type";

export const NODE_TYPES: {
  [key in NodeType]: ComponentType<NodeProps<any>>;
} = {
  python_node: PythonNode,
  python_notebook_node: PythonNotebookNode,
  py2table_node: Py2TableNode,
  r_node: RNode,
  strategus: StrategusNode,
  sql_query_node: SqlQueryNode,
  sql_node: SqlNode,
  data_mapping_node: DataMappingNode,
  csv_node: CsvNode,
  db_reader_node: DbReaderNode,
  db_writer_node: DbWriterNode,
  subflow: GroupNode,
};

export const NODE_COLORS: {
  [key in NodeType]: string;
} = {
  python_node: "#999fcb",
  python_notebook_node: "#999fcb",
  py2table_node: "#999fcb",
  r_node: "#999fcb",
  strategus: "#999fcb",
  sql_query_node: "#999fcb",
  sql_node: "#999fcb",
  data_mapping_node: "#999fcb",
  csv_node: "#999fcb",
  db_reader_node: "#999fcb",
  db_writer_node: "#999fcb",
  subflow: "#999fcb",
};

export const NodeChoiceMap: { [key in NodeTypeChoice]: NodeChoiceAttr } = {
  python_node: {
    title: "Python",
    description: "Run python code.",
    tag: NodeTag.Stable,
    defaultData: {
      python_code: `def exec(myinput):
  return "This is exec function"
def test_exec(myinput):
  return "This is test_exec function"`,
    },
  },
  python_notebook_node: {
    title: "Python Notebook",
    description: "Run python notebook with starboard.",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  py2table_node: {
    title: "Python To Table",
    description: "Transform python object to table.",
    tag: NodeTag.Stable,
    defaultData: {},
  },
  r_node: {
    title: "R",
    description: "Run R code.",
    tag: NodeTag.Experimental,
    defaultData: {
      r_code: `exec <- function(myinput) {
  return ("This is exec function")
}
test_exec <- function(myinput) {
  return ("This is test_exec function")
}`,
    },
  },
  strategus: {
    title: "Strategus",
    description: "JSON analysis specification for executing HADES modules",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  sql_query_node: {
    title: "SQL query",
    description: "Run SQL command.",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  sql_node: {
    title: "SQL",
    description: "Run SQL in a database",
    tag: NodeTag.Stable,
    defaultData: {},
  },
  data_mapping_node: {
    title: "Data mapping",
    description:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  csv_node: {
    title: "CSV",
    description: "Read CSV file from a path with columns specified.",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  db_reader_node: {
    title: "Database reader",
    description: "Output SQL query as table.",
    tag: NodeTag.Stable,
    defaultData: {},
  },
  db_writer_node: {
    title: "Database writer",
    description: "Write dataframe to a database table.",
    tag: NodeTag.Stable,
    defaultData: {},
  },
};

export const getNodeColors = (node: Node<NodeDataState>) => {
  if (node.type && Object.keys(NODE_COLORS).includes(node.type)) {
    return NODE_COLORS[node.type as NodeType];
  }
  return "#999fcb";
};

export const getNodeClassName = (node: Node<NodeDataState>) => {
  if (node.type === "start") {
    return "node--round";
  }
  return "";
};

export type { NodeType };
export * from "./SelectNodeTypes/SelectNodeTypesDialog";
export * from "./type";
