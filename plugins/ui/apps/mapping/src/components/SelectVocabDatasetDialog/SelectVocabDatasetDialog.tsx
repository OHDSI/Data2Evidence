import { FC, useCallback, useEffect, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog, FormControl, Select, SelectChangeEvent, MenuItem } from "@portal/components";
import { api } from "../../axios/api";
import { Study, TerminologyProps } from "../../types/vocabSearchDialog";
import { useApp } from "../../contexts";
import "./SelectVocabDatasetDialog.scss";

export type CloseDialogType = "success" | "cancelled";

interface SaveMappingDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

export const SelectVocabDatasetDialog: FC<SaveMappingDialogProps> = ({ open, onClose }) => {
  const [datasets, setDatasets] = useState<Study[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const { setVocabularyDatasetId } = useApp();

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = useCallback(async () => {
    const datasets = await api.SystemPortal.getDatasets();
    setDatasets(datasets);
  }, []);

  const handleApply = useCallback(() => {
    const event = new CustomEvent<{ props: TerminologyProps }>("alp-terminology-open", {
      detail: {
        props: {
          mode: "CONCEPT_SEARCH",
          selectedDatasetId: selectedDatasetId,
          onClose: (onCloseValues) => {
            // No action to do if no concept set is being created
            if (!onCloseValues?.currentConceptSet) {
              return;
            }
          },
        },
      },
    });
    window.dispatchEvent(event);
    setVocabularyDatasetId({ datasetSelected: selectedDatasetId, saved: false });
    typeof onClose === "function" && onClose("success");
  }, [selectedDatasetId]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  return (
    <Dialog
      className="select-dataset-dialog"
      title="Select Dataset"
      open={open}
      onClose={() => handleClose("cancelled")}
      sx={{
        "& .MuiDialog-container": {
          "& .MuiPaper-root": {
            width: "100%",
            maxWidth: "680px",
          },
        },
      }}
    >
      <Divider />
      <div className="select-dataset__content">
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ margin: "30px" }}>Select Dataset: </div>
          <FormControl sx={{ marginRight: "20px", marginLeft: "-15px" }}>
            <Select
              value={selectedDatasetId}
              onChange={(e: SelectChangeEvent) => {
                setSelectedDatasetId(e.target.value);
              }}
              sx={{ "& .MuiSelect-outlined": { paddingTop: "8px", paddingBottom: "8px" } }}
            >
              {datasets?.map((dataset) => (
                <MenuItem value={dataset.id} key={dataset.id} sx={{}} disableRipple>
                  {dataset.studyDetail?.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button block text="Cancel" onClick={() => handleClose("cancelled")} variant="outlined" />
        <Button block text="Apply" onClick={handleApply} variant="contained" disabled={!selectedDatasetId} />
      </div>
    </Dialog>
  );
};
