import React, { FC, ChangeEvent } from "react";
import { Loader, ChevronDownIcon, Checkbox } from "@portal/components";
import { CopyStudyColumnMetadata, CopyStudyTableMetadata } from "../../../../../types";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Alert from "@mui/material/Alert";

import "./SchemaFilter.scss";
import { useTranslation } from "../../../../../contexts";

interface SchemaFilterProps {
  copyStudySchemaMetadata: CopyStudyTableMetadata[];
  handleCheckboxTableChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleCheckboxColumnChange: (event: ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  error: string;
}

const SchemaFilter: FC<SchemaFilterProps> = ({
  copyStudySchemaMetadata,
  handleCheckboxTableChange,
  handleCheckboxColumnChange,
  loading,
  error,
}) => {
  const { getText, i18nKeys } = useTranslation();
  if (!copyStudySchemaMetadata || loading) {
    return <Loader text={getText(i18nKeys.SCHEMA_FILTER__LOADER)}></Loader>;
  }
  if (error) {
    return (
      <Alert severity="error" className="alert">
        {error}
      </Alert>
    );
  }

  return (
    <Accordion variant="outlined" className="schema-filter-form" disableGutters={true} defaultExpanded={true}>
      <AccordionSummary className="title" expandIcon={<ChevronDownIcon />}>
        {getText(i18nKeys.SCHEMA_FILTER__TEXT)}
      </AccordionSummary>
      <AccordionDetails className="table-accordion">
        {copyStudySchemaMetadata.map((tableMetadata: CopyStudyTableMetadata) => (
          <Accordion key={tableMetadata.tableName} disableGutters={true}>
            <AccordionSummary expandIcon={<ChevronDownIcon />} className="item">
              <Checkbox
                checked={tableMetadata.isSelected}
                checkbox-id={tableMetadata.tableName}
                label={tableMetadata.tableName}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleCheckboxTableChange(event)}
              />
            </AccordionSummary>
            <AccordionDetails className="column-accordion">
              {tableMetadata.tableColumnsMetadata.map((columnMetadata: CopyStudyColumnMetadata) => (
                <div className="column-checkbox-container" key={columnMetadata.columnName}>
                  <Checkbox
                    checked={columnMetadata.isSelected}
                    disabled={
                      columnMetadata.isPrimaryKey ||
                      !columnMetadata.isNullable ||
                      columnMetadata.isForeignKey ||
                      !tableMetadata.isSelected
                    }
                    checkbox-id={`${tableMetadata.tableName}-${columnMetadata.columnName}`}
                    label={columnMetadata.columnName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => handleCheckboxColumnChange(event)}
                  />
                </div>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

export default SchemaFilter;
