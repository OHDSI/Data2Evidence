import { Button } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import ReactFlow, { Controls, EdgeChange, PanOnScrollMode } from "reactflow";
import { nodeTypes } from "../Nodes";
import { api } from "../axios/api";
import { useApp, useCdmSchema, useField, useTable } from "../contexts";
import { transformEtlModel } from "../utils/etl-transformer";
import { saveBlobAs } from "../utils/utils";
import { TableToTable } from "./TableToTable";
import { pluginMetadata } from "../App";
import "./FieldMapLayout.scss";

export const FieldMapLayout = () => {
  const { setPage, state } = useApp();
  const [loading, setLoading] = useState(false);
  const {
    nodes,
    edges: fieldEdges,
    activeSourceHandles: sourceFields,
    activeTargetHandles: targetFields,
    targetHandles: allTargetFields,
    setFieldNodes,
    setFieldEdges,
    addFieldConnection,
  } = useField();

  const { edges: tableEdges, sourceHandles: sourceTables, targetHandles: targetTables } = useTable();
  const { cdmVersion } = useCdmSchema();

  useEffect(() => {
    pluginMetadata?.data?.onChange(state);
  }, [state]);

  useEffect(() => {
    if (sourceFields?.length == 0 || targetFields?.length === 0) {
      setPage("table");
    }
  }, [sourceFields, targetFields]);

  const handleBack = useCallback(() => {
    setPage("table");
  }, []);

  const sourceTableName = sourceFields?.length ? sourceFields[0].data?.tableName : "";
  const targetTableName = targetFields?.length ? targetFields[0].data?.tableName : "";

  const deleteLinks = useCallback(() => {
    const edgeChanges: EdgeChange[] = fieldEdges.map((edge) => ({
      id: edge.id,
      type: "remove",
    }));
    setFieldEdges(edgeChanges);
  }, [setFieldEdges, fieldEdges]);

  const handleReport = useCallback(async () => {
    try {
      setLoading(true);
      const model = transformEtlModel(
        1,
        "Source",
        state.scannedSchema,
        2,
        `CDM ${cdmVersion}`,
        state.cdmTables,
        tableEdges,
        fieldEdges,
        allTargetFields
      );
      const response = await api.whiteRabbit.createEtlReport(model);
      const flowRunId = response.flowRunId;

      const intervalId = setInterval(async () => {
        try {
          const status = await api.whiteRabbit.getFlowRunStatus(flowRunId);
          if (status.state_name === "Completed") {
            clearInterval(intervalId);
            const reportBlob = await api.whiteRabbit.getEtlReportFromArtifacts(flowRunId);
            saveBlobAs(reportBlob, "etl-mapping.docx");
            setLoading(false);
          }
        } catch (error) {
          console.error("Failed to check ETL report status", error);
          clearInterval(intervalId);
          setLoading(false);
        }
      }, 7000);
    } catch (error) {
      console.error("Failed to generate ETL report", error);
      setLoading(false);
    }
  }, [fieldEdges, tableEdges, sourceFields, targetFields, allTargetFields, sourceTables, targetTables, cdmVersion]);

  return (
    <div className="field-map-layout">
      <TableToTable source={sourceTableName} target={targetTableName} />
      <div className="react-flow-container">
        <ReactFlow
          nodes={nodes}
          edges={fieldEdges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => setFieldNodes(changes)}
          onEdgesChange={(changes) => setFieldEdges(changes)}
          onConnect={(changes) => addFieldConnection(changes)}
          zoomOnDoubleClick={false}
          zoomOnScroll={false}
          panOnScrollMode={PanOnScrollMode.Horizontal}
          panOnScroll
          panOnDrag={false}
          zoomOnPinch={false}
          fitView
          maxZoom={1}
          minZoom={1}
        >
          <Controls showZoom={false} showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="footer">
        <Button variant="outlined" onClick={handleBack}>
          Back
        </Button>
        <div className="button-group">
          <Button variant="outlined" color="error" onClick={deleteLinks}>
            Delete links
          </Button>
          <Button variant="contained" onClick={handleReport} disabled={loading}>
            {loading ? "Generating..." : "Report"}
          </Button>
        </div>
      </div>
    </div>
  );
};
