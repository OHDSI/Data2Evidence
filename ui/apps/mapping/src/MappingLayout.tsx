import { FC, useEffect } from "react";
import { TableMapLayout } from "./Table/TableMapLayout";
import { FieldMapLayout } from "./Field/FieldMapLayout";
import { MappingFileDialogController } from "./components/MappingFileDialogController";
import { AppState, useApp } from "./contexts";
import "./MappingLayout.css";

interface MappingLayoutProps {
  mappingSuggestion?: boolean;
  nodeId?: string;
  data?: AppState;
}

export const MappingLayout: FC<MappingLayoutProps> = ({ mappingSuggestion, nodeId, data }) => {
  const { load, reset, setMappingSuggestion, setNodeId, setPage, state } = useApp();

  useEffect(() => {
    if (data) {
      load(data);
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
