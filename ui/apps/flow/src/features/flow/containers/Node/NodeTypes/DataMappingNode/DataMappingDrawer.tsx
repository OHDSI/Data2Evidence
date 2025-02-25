import React, { FC, useCallback, useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  NodeProps,
  PanOnScrollMode,
  ReactFlowProvider,
  Node,
  Controls,
  Edge,
  MarkerType,
} from "reactflow";
import {
  FormControl,
  InputLabel,
  SxProps,
  Select,
  MenuItem,
} from "@mui/material";
import { IconButton, CloseIcon } from "@portal/components";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { DataMappingNodeData } from "./DataMappingNode";
import { DataMappingInternalNode } from "./DataMappingInternalNode/DataMappingInternalNode";
import { NodeState } from "~/features/flow/types";
import { getCDMData, sampleCDM, sampleInput } from "./SampleData/sample-data";
import "./DataMappingNode.scss";

export interface DataMappingDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<DataMappingNodeData>;
  onClose: () => void;
}

enum NodeType {
  Input = "input",
  Output = "output",
}

const styles: SxProps = {
  color: "#000080",
  "&::after, &:hover:not(.Mui-disabled)::before": {
    borderBottom: "2px solid #000080",
  },
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
  },
  "&.MuiMenuItem-root:hover": {
    backgroundColor: "#ebf2fa",
  },
};

export const DataMappingDrawer: FC<DataMappingDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );

  const [tableNodes, setTableNodes] = useState([]);
  const [fieldNodes, setFieldNodes] = useState([]);

  const [activeFieldNodes, setActiveFieldNodes] = useState([]);

  const [activeTableNodes, setActiveTableNodes] = useState([]);
  const [activeTableEdges, setActiveTableEdges] = useState([]);

  const [edges, setEdges] = useState([]);

  const [activeNode, setActiveNode] = useState<Node>();
  const [displayFields, setDisplayFields] = useState(false);
  const [dataModel, setDataModel] = useState("5.4");

  const nodeTypes = useMemo(
    () => ({ dataMappingInternalNode: DataMappingInternalNode }),
    []
  );

  const flattenMapping = useCallback(() => {
    function split(edge: Edge) {
      const source = edge.source.split("-");
      const target = edge.target.split("-");
      const sourceTable = source[0];
      const sourceField = source[1];
      const targetTable = target[0];
      const targetField = target[1];
      return { sourceTable, sourceField, targetTable, targetField };
    }

    const output = [];
    for (const edge of edges) {
      const { sourceTable, sourceField, targetTable, targetField } =
        split(edge);

      const findIndex = output.findIndex(
        (entry) =>
          entry.input_table === sourceTable &&
          entry.output_table === targetTable
      );
      if (findIndex === -1) {
        if (!sourceField && !targetField) {
          output.push({
            input_table: sourceTable,
            output_table: targetTable,
            fields: [],
          });
        } else {
          output.push({
            input_table: sourceTable,
            output_table: targetTable,
            fields: [{ source_field: sourceField, target_field: targetField }],
          });
        }
      } else {
        output[findIndex].fields.push({
          source_field: sourceField,
          target_field: targetField,
        });
      }
    }
    return { data_mapping: output };
  }, [edges]);

  useEffect(() => {
    const { edges, data_model } = node.data;

    if (edges && data_model) {
      setEdges(edges);
      setDataModel(data_model);
    }
  }, []);

  useEffect(() => {
    const yPosConstant = 50;
    const inputTableNodes = [];
    const inputFieldNodes = [];

    // PREPARE INPUT NODES
    sampleInput.forEach((db, index) => {
      inputTableNodes.push({
        id: db.tableName,
        position: { x: 0, y: index * yPosConstant },
        data: {
          label: db.tableName,
          name: db.tableName,
          fields: db.fields,
          type: NodeType.Input,
        },
        type: "dataMappingInternalNode",
        sourcePosition: "right",
      });
      db.fields.forEach((field, fieldIndex) => {
        inputFieldNodes.push({
          id: `${db.tableName}-${field.name}`,
          position: { x: 0, y: fieldIndex * index * yPosConstant },
          data: {
            label: field.name,
            name: field.name,
            desc: field.desc,
            table: db.tableName,
            type: NodeType.Input,
          },
          type: "dataMappingInternalNode",
          sourcePosition: "right",
        });
      });
    });

    // PREPARE OUTPUT NODES & CONSOLIDATE STATE
    async function prepOutputNodes() {
      const outputTableNodes = [];
      const outputFieldNodes = [];

      const { tables, fields } = await getCDMData(dataModel);

      tables.forEach((table: any, index) => {
        outputTableNodes.push({
          id: table.cdmTableName,
          position: { x: 300, y: index * yPosConstant },
          data: {
            label: table.cdmTableName,
            type: NodeType.Output,
            name: table.cdmTableName,
            conceptPrefix: table.conceptPrefix,
            etlConventions: table.etlConventions,
            isRequired: table.isRequired,
            measurePersonCompleteness: table.measurePersonCompleteness,
            measurePersonCompletenessThreshold:
              table.measurePersonCompletenessThreshold,
            schema: table.schema,
            tableDescription: table.tableDescription,
            userGuidance: table.userGuidance,
            validation: table.validation,
          },
          type: "dataMappingInternalNode",
          targetPosition: "left",
        });
      });

      fields.forEach((field: any, index) => {
        outputFieldNodes.push({
          id: `${field.cdmTableName}-${field.cdmFieldName}`,
          position: { x: 300, y: index * yPosConstant },
          data: {
            label: field.cdmFieldName,
            table: field.cdmTableName,
            type: NodeType.Output,
          },
          type: "dataMappingInternalNode",
          targetPosition: "left",
        });
      });

      setTableNodes(inputTableNodes.concat(outputTableNodes));
      setFieldNodes(inputFieldNodes.concat(outputFieldNodes));
    }

    prepOutputNodes();
  }, [node.data, dataModel]);

  const handleOk = useCallback(() => {
    const updated: NodeState<DataMappingNodeData> = {
      ...nodeState,
      data: {
        name: node.data.name,
        description: node.data.description,
        data_map: flattenMapping(),
        edges,
        data_model: dataModel,
      },
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());
    setDisplayFields(false);
    typeof onClose === "function" && onClose();
  }, [edges]);

  const addStaticNodes = useCallback((edge: Edge) => {
    setActiveTableNodes([
      {
        id: "1",
        type: "dataMappingInternalNode",
        data: {
          label: edge.source,
          type: NodeType.Input,
        },
        position: { x: 0, y: 0 },
      },
      {
        id: "2",
        type: "dataMappingInternalNode",
        data: {
          label: edge.target,
          type: NodeType.Output,
        },
        position: { x: 300, y: 0 },
      },
    ]);
    setActiveTableEdges([
      {
        id: "e1-2",
        source: "1",
        target: "2",
      },
    ]);
  }, []);

  const handleEdgeClick = useCallback(
    (event, edge) => {
      // Set static nodes and edges
      addStaticNodes(edge);
      // Set field nodes
      const filteredNodes = fieldNodes.filter(
        (node) =>
          node.data.table === edge.source || node.data.table === edge.target
      );

      const inputNodes = filteredNodes
        .filter((node) => node.sourcePosition)
        .map((node, index) => ({ ...node, position: { x: 0, y: index * 50 } }));
      const outputNodes = filteredNodes
        .filter((node) => node.targetPosition)
        .map((node, index) => ({
          ...node,
          position: { x: 300, y: index * 50 },
        }));

      setActiveFieldNodes(inputNodes.concat(outputNodes));
      setDisplayFields(true);
    },
    [fieldNodes]
  );

  const handleNodeClick = useCallback((event, node) => {
    setActiveNode(node);
  }, []);

  const handleCloseDisplayFields = useCallback(() => {
    setDisplayFields(false);
    setActiveTableNodes([]);
    setActiveTableEdges([]);
  }, []);

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onEdgesConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  const handleDataModelSelect = useCallback((event) => {
    setDataModel(event.target.value);
    resetNodesAndEdges();
  }, []);

  const resetNodesAndEdges = useCallback(() => {
    setTableNodes([]);
    setFieldNodes([]);
    setEdges([]);
  }, []);

  return (
    <NodeDrawer {...props} onOk={handleOk} onClose={onClose}>
      <div className="data-mapping">
        <div className="data-mapping__flow">
          {displayFields ? (
            <>
              <div className="data-mapping__header">
                <span className="header-container">Tables</span>
                <IconButton
                  startIcon={<CloseIcon />}
                  onClick={handleCloseDisplayFields}
                />
              </div>
              <div className="data-mapping__flow-container-table">
                {/* STATIC FLOW */}
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={activeTableNodes}
                    edges={activeTableEdges}
                    defaultViewport={{
                      x: 50,
                      y: 50,
                      zoom: 2,
                    }}
                    zoomOnScroll={false}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={{
                      markerEnd: { type: MarkerType.ArrowClosed },
                      deletable: false,
                    }}
                  ></ReactFlow>
                </ReactFlowProvider>
              </div>

              {/* FIELD FLOW */}
              <div className="data-mapping__header">
                <span className="header-container">Fields</span>
              </div>

              <div className="data-mapping__flow-container">
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={activeFieldNodes}
                    edges={edges}
                    onEdgesChange={onEdgesChange}
                    onConnect={onEdgesConnect}
                    defaultViewport={{
                      x: 50,
                      y: 50,
                      zoom: 1.5,
                    }}
                    onlyRenderVisibleElements
                    snapToGrid
                    panOnScroll
                    panOnScrollMode={PanOnScrollMode.Vertical}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={{
                      markerEnd: { type: MarkerType.ArrowClosed },
                    }}
                  >
                    <Controls />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
            </>
          ) : (
            <>
              <div className="data-mapping__header">
                <span className="header-container">Tables</span>
                <div className="data-mapping__flow-dropdown">
                  <FormControl
                    sx={styles}
                    className="select"
                    variant="standard"
                    fullWidth
                  >
                    <InputLabel htmlFor="tenant-id">
                      Select data model
                    </InputLabel>
                    <Select
                      sx={styles}
                      value={dataModel}
                      onChange={handleDataModelSelect}
                    >
                      {Object.keys(sampleCDM).map((cdm) => (
                        <MenuItem sx={styles} key={sampleCDM[cdm]} value={cdm}>
                          {sampleCDM[cdm]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* TABLE FLOW */}
              <div className="data-mapping__flow-container">
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={tableNodes}
                    edges={edges}
                    onEdgesChange={onEdgesChange}
                    onConnect={onEdgesConnect}
                    defaultViewport={{
                      x: 50,
                      y: 50,
                      zoom: 1.5,
                    }}
                    onlyRenderVisibleElements
                    snapToGrid
                    panOnScroll
                    panOnScrollMode={PanOnScrollMode.Vertical}
                    onNodeClick={handleNodeClick}
                    onEdgeDoubleClick={handleEdgeClick}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={{
                      markerEnd: { type: MarkerType.ArrowClosed },
                    }}
                  >
                    <Controls />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
            </>
          )}
        </div>

        <div className="data-mapping__details">
          <div className="data-mapping__details-header">
            <span className="header-container">Details</span>
          </div>
          <div className="data-mapping__details-container">
            <div>
              <span>General information</span>
              <div className="data-mapping__details-container-box">
                {activeNode && activeNode.data.type === NodeType.Input ? (
                  <>
                    <span>Table name: </span>
                    {activeNode.data.name}
                  </>
                ) : (
                  activeNode &&
                  activeNode.data.type === NodeType.Output && (
                    <>
                      <span>Table name:</span>
                      {activeNode.data.name}
                      <span>Table description:</span>
                      {activeNode.data.tableDescription}
                      <span>ETL conventions:</span>
                      {activeNode.data.etlConventions}
                    </>
                  )
                )}
              </div>
            </div>
            <div>
              <span>Fields</span>
              <div className="data-mapping__details-container-box"></div>
            </div>
            <div>
              <span>Comments</span>
              <div className="data-mapping__details-container-box">
                <span>No comments available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NodeDrawer>
  );
};
