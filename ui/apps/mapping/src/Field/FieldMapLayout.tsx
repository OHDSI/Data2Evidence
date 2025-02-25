import { useEffect, useCallback } from "react";
import ReactFlow, { Controls, EdgeChange, PanOnScrollMode } from "reactflow";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { nodeTypes } from "../Nodes";
import { useApp, useCdmSchema, useField, useTable } from "../contexts";
import { TableToTable } from "./TableToTable";
import { transformEtlModel } from "../utils/etl-transformer";
import { saveBlobAs } from "../utils/utils";
import { api } from "../axios/api";
import "./FieldMapLayout.scss";

export const FieldMapLayout = () => {
  const { state } = useApp();
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

  const navigate = useNavigate();

  useEffect(() => {
    if (sourceFields?.length == 0 || targetFields?.length === 0) {
      navigate("/");
    }
  }, [sourceFields, targetFields]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

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
    console.debug("Model", model);

    try {
      const response = await api.whiteRabbit.generateEtlReport("word", model);
      saveBlobAs(response, "etl-mapping.docx");
    } catch (error) {
      console.error("Failed to generate ETL report", error);
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
          <Button variant="contained" onClick={handleReport}>
            Report
          </Button>
        </div>
      </div>
    </div>
  );
};
