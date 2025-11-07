import React, { FC, useCallback } from "react";
import { Select, SelectChangeEvent, SelectProps } from "@portal/components";
import { MenuItem } from "@mui/material";
import { useDatasets, usePublicDatasets } from "../../../hooks";
import { useActiveDataset, useTranslation } from "../../../contexts";
import { Study } from "../../../types";

interface SelectDatasetInternalProps extends Omit<SelectProps, "onChange"> {
  datasets: Study[];
  loading: boolean;
  onChange?: (datasetId: string) => void;
}

const CURRENT_RELEASE_ID = "";

const SelectDatasetInternal: FC<SelectDatasetInternalProps> = ({ datasets, loading, onChange, ...props }) => {
  const { getText, i18nKeys } = useTranslation();
  const { activeDataset, setActiveDatasetId, setActiveReleaseId } = useActiveDataset();

  const handleChange = useCallback(
    (datasetId: string) => {
      setActiveDatasetId(datasetId);
      setActiveReleaseId(CURRENT_RELEASE_ID);

      typeof onChange === "function" && onChange(datasetId);
    },
    [onChange]
  );

  if (datasets.length === 0) return null;

  return (
    <Select
      className="select-dataset"
      variant="outlined"
      sx={{
        minWidth: "100px",
        maxWidth: "200px",
        borderRadius: "6px",
        backgroundColor: "#000080",
        color: "white",
        ".MuiSelect-select": {
          padding: "8px 14px",
        },
        ".MuiSvgIcon-root": { fill: "white" },
      }}
      value={activeDataset.id}
      onChange={(e: SelectChangeEvent) => handleChange(e.target.value)}
      disabled={loading}
      displayEmpty
      {...props}
    >
      <MenuItem value="" disabled>
        {getText(i18nKeys.SELECT_DATASET__SELECT_DATASET)}
      </MenuItem>
      {datasets.map((ds) => (
        <MenuItem key={ds.id} value={ds.id}>
          {ds.studyDetail?.name || "Untitled"}
        </MenuItem>
      ))}
    </Select>
  );
};

interface SelectDatasetProps extends Omit<SelectDatasetInternalProps, "datasets" | "loading"> {}

export const SelectDataset: FC<SelectDatasetProps> = (props) => {
  const [datasets, loading] = useDatasets("researcher");
  return <SelectDatasetInternal datasets={datasets} loading={loading} {...props} />;
};

export const SelectPublicDataset: FC<SelectDatasetProps> = (props) => {
  const [datasets, loading] = usePublicDatasets();
  if (datasets == null) return null;
  return <SelectDatasetInternal datasets={datasets} loading={loading} {...props} />;
};
