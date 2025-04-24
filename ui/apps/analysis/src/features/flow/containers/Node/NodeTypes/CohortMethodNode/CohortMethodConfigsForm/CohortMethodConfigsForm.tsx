import React, { ChangeEvent, FC, useCallback } from "react";
import { Box, IconButton, TextField, TrashIcon } from "@portal/components";
import { CohortMethodConfigs } from "../CohortMethodNode";
import { FormHelperText } from "@mui/material";

interface CohortMethodConfigsFormProps {
  index: number;
  configs: CohortMethodConfigs | undefined;
  onRemove: () => void;
  onChange: (analysisId: string, targetId: string) => void;
  error?: CohortMethodConfigsFormError;
}

export interface CohortMethodConfigsFormError {
  analysisId: {
    required: boolean;
  };
  targetId: {
    required: boolean;
  };
}

export const EMPTY_COHORT_METHOD_CONFIGS_FORM_ERROR: CohortMethodConfigsFormError =
  {
    analysisId: { required: false },
    targetId: { required: false },
  };

export const EMPTY_COHORT_METHOD_CONFIGS_DATA: CohortMethodConfigs = {
  analysisId: "1",
  targetId: "1",
};

export const CohortMethodConfigsForm: FC<CohortMethodConfigsFormProps> = ({
  index,
  configs,
  onRemove,
  onChange,
  error,
}) => {
  const handleChange = useCallback(
    (changes: Partial<CohortMethodConfigs>) => {
      const update = { ...configs, ...changes } as CohortMethodConfigs;
      typeof onChange === "function" &&
        onChange(update.analysisId, update.targetId);
    },
    [configs, onChange]
  );

  return (
    <Box display="flex" alignItems="flex-end" gap={2}>
      <Box sx={{ width: "150px", height: index === 0 ? "70px" : "60px" }}>
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0
            ? { label: "AnalysisId" }
            : { placeholder: "AnalysisId" })}
          value={configs?.analysisId}
          error={error?.analysisId.required}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ analysisId: event.target.value })
          }
        />
        {error?.analysisId.required && (
          <FormHelperText className="form-error">
            This is required
          </FormHelperText>
        )}
      </Box>
      <Box sx={{ width: "150px", height: index === 0 ? "70px" : "60px" }}>
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0
            ? { label: "TargetId" }
            : { placeholder: "TargetId" })}
          value={configs?.targetId}
          error={error?.targetId.required}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ targetId: event.target.value })
          }
        />
        {error?.targetId.required && (
          <FormHelperText className="form-error">
            This is required
          </FormHelperText>
        )}
      </Box>
      <Box flex="none" sx={{ height: "60px" }}>
        <IconButton startIcon={<TrashIcon />} onClick={() => onRemove()} />
      </Box>
    </Box>
  );
};
