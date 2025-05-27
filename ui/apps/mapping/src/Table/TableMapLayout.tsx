import { useCallback, useEffect } from "react";
import ReactFlow, { Controls, Edge, PanOnScrollMode, Panel } from "reactflow";
import { nodeTypes } from "../Nodes";
import { useApp, useCdmSchema, useField, useScannedSchema, useTable } from "../contexts";
import { Box } from "@portal/components";
import { MenuButton } from "../components/MenuButton/MenuButton";
import { pluginMetadata } from "../App";
import "./TableMapLayout.scss";
import "reactflow/dist/style.css";

export const TableMapLayout = () => {
  const { setPage, state } = useApp();
  const { nodes, edges, setTableNodes, setTableEdges, addTableConnection } = useTable();
  const { setActiveSourceTable, setActiveTargetTable } = useField();
  const { sourceTables } = useScannedSchema();
  const { cdmTables } = useCdmSchema();

  useEffect(() => {
    pluginMetadata?.data?.onChange(state);
  }, [state]);

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

      setPage("field");
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
