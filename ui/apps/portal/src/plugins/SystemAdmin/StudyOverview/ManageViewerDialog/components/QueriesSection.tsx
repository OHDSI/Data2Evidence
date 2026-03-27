import React, { FC } from "react";
import { Button, TextField } from "@portal/components";
import InputLabel from "@mui/material/InputLabel";
import { QueryEntry } from "../hooks/useViewerData";
import { useTranslation } from "../../../../../contexts";
import { i18nKeys } from "../../../../../contexts/app-context/states";

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
  const { getText } = useTranslation();

  return (
    <div className="manage-viewer-dialog__queries">
      <div className="manage-viewer-dialog__queries__header">
        <InputLabel>{getText(i18nKeys.QUERIES_SECTION__QUERIES)}</InputLabel>
        <Button text={getText(i18nKeys.QUERIES_SECTION__ADD_QUERY)} onClick={onAddQuery} variant="outlined" size="small" />
      </div>
      {queries.map((query, index) => (
        <div key={index} className="manage-viewer-dialog__queries__entry">
          <TextField
            label={getText(i18nKeys.QUERIES_SECTION__QUERY_NAME)}
            variant="standard"
            value={query.queryName}
            onChange={(e) => onUpdateQuery(index, "queryName", e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label={getText(i18nKeys.QUERIES_SECTION__SQL)}
            variant="standard"
            value={query.sql}
            onChange={(e) => onUpdateQuery(index, "sql", e.target.value)}
            sx={{ flex: 2 }}
            multiline
            rows={1}
          />
          <Button text={getText(i18nKeys.QUERIES_SECTION__REMOVE)} onClick={() => onRemoveQuery(index)} variant="text" size="small" />
        </div>
      ))}
    </div>
  );
};
