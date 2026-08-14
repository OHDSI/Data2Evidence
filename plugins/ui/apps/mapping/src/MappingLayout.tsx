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
    // Hydrate from saved node data whenever it carries any mapping work —
    // edges, a scanned schema, or table handles. Keying only on edges dropped
    // scanned-but-unmapped nodes on reload (#1162).
    const hasSavedWork =
      !!data &&
      (data.field?.edges?.length > 0 ||
        data.table?.edges?.length > 0 ||
        !!data.scannedSchema ||
        data.table?.sourceHandles?.length > 0);

    if (hasSavedWork) {
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
