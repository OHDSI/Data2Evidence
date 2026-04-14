import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  FormControl,
  MenuItem,
  TextField,
} from "@portal/components";
import { useGetStudyDatasetsQuery } from "~/features/flow/slices";
import "./StudySelectDialog.scss";

interface StudySelectDialogProps {
  open: boolean;
  onClose: () => void;
  onRun: (datasetId: string) => void;
  isRunning: boolean;
}

export const StudySelectDialog: FC<StudySelectDialogProps> = ({
  open,
  onClose,
  onRun,
  isRunning,
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const { data: studyDatasets = [], isLoading } = useGetStudyDatasetsQuery(
    undefined,
    { skip: !open }
  );

  useEffect(() => {
    if (!open) setSelectedDatasetId("");
  }, [open]);

  const handleRun = useCallback(() => {
    if (selectedDatasetId) {
      onRun(selectedDatasetId);
    }
  }, [selectedDatasetId, onRun]);

  return (
    <Dialog
      className="study-select-dialog"
      title="Select study"
      open={open}
      onClose={onClose}
    >
      <div className="study-select-dialog__content">
        <FormControl fullWidth>
          <TextField
            select
            label="Study"
            variant="outlined"
            size="small"
            value={selectedDatasetId}
            disabled={isLoading}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSelectedDatasetId(e.target.value)
            }
          >
            {studyDatasets.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.studyDetail?.name || d.id}
              </MenuItem>
            ))}
          </TextField>
        </FormControl>
      </div>
      <div className="study-select-dialog__footer">
        <Box display="flex" gap={1} className="study-select-dialog__footer-actions">
          <Button text="Cancel" variant="outlined" onClick={onClose} />
          <Button
            text="Run"
            onClick={handleRun}
            loading={isRunning}
            disabled={!selectedDatasetId}
          />
        </Box>
      </div>
    </Dialog>
  );
};
