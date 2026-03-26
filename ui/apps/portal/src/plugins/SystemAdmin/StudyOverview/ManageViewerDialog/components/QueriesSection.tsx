import React, { FC } from "react";
import { Button, TextField } from "@portal/components";
import InputLabel from "@mui/material/InputLabel";
import { QueryEntry } from "../hooks/useViewerData";

interface QueriesSectionProps {
  queries: QueryEntry[];
  onAddQuery: () => void;
  onUpdateQuery: (index: number, field: keyof QueryEntry, value: string) => void;
  onRemoveQuery: (index: number) => void;
}

export const QueriesSection: FC<QueriesSectionProps> = ({
  queries,
  onAddQuery,
  onUpdateQuery,
  onRemoveQuery,
}) => {
  return (
    <div className="manage-viewer-dialog__queries">
      <div className="manage-viewer-dialog__queries__header">
        <InputLabel>Queries</InputLabel>
        <Button text="Add query" onClick={onAddQuery} variant="outlined" size="small" />
      </div>
      {queries.map((query, index) => (
        <div key={index} className="manage-viewer-dialog__queries__entry">
          <TextField
            label="Query name"
            variant="standard"
            value={query.queryName}
            onChange={(e) => onUpdateQuery(index, "queryName", e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label="SQL"
            variant="standard"
            value={query.sql}
            onChange={(e) => onUpdateQuery(index, "sql", e.target.value)}
            sx={{ flex: 2 }}
            multiline
            rows={1}
          />
          <Button text="Remove" onClick={() => onRemoveQuery(index)} variant="text" size="small" />
        </div>
      ))}
    </div>
  );
};
