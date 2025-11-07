import { FC, useEffect } from "react";
import { Node } from "reactflow";
import { TableMapLayout } from "./Table/TableMapLayout";
import { FieldMapLayout } from "./Field/FieldMapLayout";
import { MappingFileDialogController } from "./components/MappingFileDialogController";
import { AppState, useApp, useScannedSchema, useTable } from "./contexts";
import "./MappingLayout.css";

interface MappingLayoutProps {
  mappingSuggestion?: boolean;
  nodeId?: string;
  data?: AppState;
  sourceNode?: Node;
}

export const MappingLayout: FC<MappingLayoutProps> = ({ mappingSuggestion, nodeId, data, sourceNode }) => {
  const { load, reset, setMappingSuggestion, setNodeId, setPage, state } = useApp();
  const { setScannedSchema } = useScannedSchema();
  const { setTableSourceHandles } = useTable();

  useEffect(() => {
    if (data && (data.field.edges.length > 0 || data.table.edges.length > 0)) {
      load(data);
    } else if (sourceNode) {
      setScannedSchema(sourceNode.data.scannedSchema);
      setTableSourceHandles(sourceNode.data.sourceHandles);
    } else {
      reset();
    }

    setPage("table");
    setNodeId(nodeId || "");
    setMappingSuggestion(mappingSuggestion || false);
  }, [mappingSuggestion, data]);

  return (
    <div className="mapping-layout">
      <div className="content-container">
        {state.page === "table" && <TableMapLayout />}
        {state.page === "field" && <FieldMapLayout />}
        <MappingFileDialogController />
      </div>
    </div>
  );
};
