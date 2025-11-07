import React, { FC, useState, useCallback, useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { SelectChangeEvent } from "@mui/material/Select";
import { SxProps } from "@mui/system";
import { SystemPortal } from "../../../../axios/system-portal";
import { DatasetRelease } from "../types";
import { useTranslation } from "../../../../contexts";

interface ReleaseSelectorProps {
  datasetId: string;
  handleReleaseSelect: (releaseId: string) => void;
}

const styles: SxProps = {
  color: "#000080",
  minWidth: 220,
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
    color: "#000080",
  },
  ".MuiInput-root": {
    "&::after, &:hover:not(.Mui-disabled)::before": {
      borderBottom: "2px solid #000080",
    },
  },
  "&.MuiMenuItem-root:hover": {
    backgroundColor: "#ebf2fa",
  },
};

const ReleaseSelector: FC<ReleaseSelectorProps> = ({ datasetId, handleReleaseSelect }) => {
  const { getText, i18nKeys } = useTranslation();
  const [releases, setReleases] = useState([]);
  const [releaseId, setReleaseId] = useState("");
  const isLoading = false;

  const fetchHanaReleasesForDataset = useCallback(async () => {
    const systemPortalAPI = new SystemPortal();
    const releases = await systemPortalAPI.getDatasetReleases(datasetId);
    setReleases(releases);
  }, [datasetId]);

  useEffect(() => {
    fetchHanaReleasesForDataset();
  }, [fetchHanaReleasesForDataset]);

  const handleReleaseSelection = (event: SelectChangeEvent) => {
    const releaseId = event.target.value.toString();
    setReleaseId(releaseId);
    handleReleaseSelect(releaseId);
  };

  return (
    <div className="update-account-dialog__edit-input u-padding-vertical--normal">
      <Select value={releaseId} onChange={handleReleaseSelection} displayEmpty sx={styles} disabled={isLoading}>
        <MenuItem value="" sx={styles} disableRipple>
          {getText(i18nKeys.RELEASE_SELECTOR__RELEASE_SELECTION)}
        </MenuItem>
        {releases?.map((release: DatasetRelease) => (
          <MenuItem value={release.id} key={release.id} sx={styles} disableRipple>
            {release.name} - {release.releaseDate}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
};

export default ReleaseSelector;
