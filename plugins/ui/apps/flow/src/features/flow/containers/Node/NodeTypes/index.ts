import { ComponentType } from "react";
import { Node, NodeProps } from "reactflow";
import { NodeDataState } from "../../../types";
import { CsvNode } from "./CsvNode/CsvNode";
import { DataMappingNode } from "./DataMappingNode/DataMappingNode";
import { DbReaderNode } from "./DbReaderNode/DbReaderNode";
import { DbWriterNode } from "./DbWriterNode/DbWriterNode";
import { GroupNode } from "./GroupNode/GroupNode";
import { Py2TableNode } from "./Py2TableNode/Py2TableNode";
import { PythonNode } from "./PythonNode/PythonNode";
import { PythonNotebookNode } from "./PythonNotebookNode/PythonNotebookNode";
import { RNode } from "./RNode/RNode";
import { SqlNode } from "./SqlNode/SqlNode";
import { NodeChoiceAttr, NodeTag, NodeType, NodeTypeChoice } from "./type";
import { ConceptMappingNode } from "./ConceptMappingNode/ConceptMappingNode";
import { WhiteRabbitNode } from "./WhiteRabbitNode/WhiteRabbitNode";

export const NODE_TYPES: {
  [key in NodeType]: ComponentType<NodeProps<any>>;
} = {
  python_node: PythonNode,
  python_notebook_node: PythonNotebookNode,
  py2table_node: Py2TableNode,
  r_node: RNode,
  sql_node: SqlNode,
  rabbit_in_a_hat: DataMappingNode,
  concept_mapping_node: ConceptMappingNode,
  csv_node: CsvNode,
  db_reader_node: DbReaderNode,
  db_writer_node: DbWriterNode,
  subflow: GroupNode,
  white_rabbit_node: WhiteRabbitNode,
};

export const NODE_COLORS: {
  [key in NodeType]: string;
} = {
  python_node: "#999fcb",
  python_notebook_node: "#999fcb",
  py2table_node: "#999fcb",
  r_node: "#999fcb",
  sql_node: "#999fcb",
  rabbit_in_a_hat: "#999fcb",
  concept_mapping_node: "#999fcb",
  csv_node: "#999fcb",
  db_reader_node: "#999fcb",
  db_writer_node: "#999fcb",
  subflow: "#999fcb",
  white_rabbit_node: "#999fcb",
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
  sql_node: {
    title: "SQL",
    description: "Run SQL in a database",
    tag: NodeTag.Stable,
    defaultData: {},
  },
  rabbit_in_a_hat: {
    title: "Rabbit in a Hat",
    description: "Map source data to OMOP data model.",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  white_rabbit_node: {
    title: "White Rabbit",
    description: "Scan source database schema.",
    tag: NodeTag.Experimental,
    defaultData: {
      scannedSchema: {
        etl_mapping: {
          id: 0,
          scan_report_id: 0,
          scan_report_name: "",
          source_schema_name: "",
          cdm_version: "",
          username: "",
        },
        source_tables: [],
      },
      sourceHandles: [],
    },
  },
  concept_mapping_node: {
    title: "Concept mapping",
    description: "Map source to vocabulary standard concepts.",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  csv_node: {
    title: "CSV",
    description: "Read CSV file from a path with columns specified.",
    tag: NodeTag.Experimental,
    defaultData: {
      file: "",
      delimiter: ",",
      hasheader: true,
      columns: [],
      encoding: "utf-8",
    },
  },
  db_reader_node: {
    title: "Database query",
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

export * from "./SelectNodeTypes/SelectNodeTypesDialog";
export * from "./type";
export type { NodeType };
