import { useCallback } from "react";
import ReactFlow, { Controls, Edge, PanOnScrollMode, Panel } from "reactflow";
import { useNavigate } from "react-router-dom";
import { nodeTypes } from "../Nodes";
import { useCdmSchema, useField, useScannedSchema, useTable } from "../contexts";
import { Box } from "@portal/components";
import { MenuButton } from "../components/MenuButton/MenuButton";
import "./TableMapLayout.scss";
import "reactflow/dist/style.css";

export const TableMapLayout = () => {
  const { nodes, edges, setTableNodes, setTableEdges, addTableConnection } = useTable();
  const { setActiveSourceTable, setActiveTargetTable } = useField();
  const { sourceTables } = useScannedSchema();
  const { cdmTables } = useCdmSchema();
  const navigate = useNavigate();

  const handleEdgeClick = useCallback(
    (_event: any, edge: Edge) => {
      const { sourceHandle: sourceTable, targetHandle: targetTable } = edge;

      if (!sourceTable) {
        console.warn(`Source table is empty`);
        return;
      }

      if (!targetTable) {
        console.warn(`Target table is empty`);
        return;
      }

      setActiveSourceTable(sourceTable);
      setActiveTargetTable(targetTable);

      navigate("link-fields");
    },
    [sourceTables, cdmTables]
  );

  return (
    <div className="table-map-layout">
      <div className="react-flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => setTableNodes(changes)}
          onEdgesChange={(changes) => setTableEdges(changes)}
          onConnect={(changes) => addTableConnection(changes)}
          zoomOnDoubleClick={false}
          zoomOnScroll={false}
          panOnScrollMode={PanOnScrollMode.Horizontal}
          panOnScroll
          panOnDrag={false}
          zoomOnPinch={false}
          fitView
          maxZoom={1}
          minZoom={1}
          onEdgeDoubleClick={handleEdgeClick}
        >
          <Controls showZoom={false} showInteractive={false} />
          <Panel position="top-left" className="panel">
            <Box className="flow-panel__custom-controls">
              <MenuButton />
            </Box>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};
