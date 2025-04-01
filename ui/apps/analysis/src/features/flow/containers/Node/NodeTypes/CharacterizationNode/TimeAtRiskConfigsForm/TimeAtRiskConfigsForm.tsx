import React, { ChangeEvent, FC, useCallback } from "react";
import { Box, IconButton, TextField, TrashIcon } from "@portal/components";
import { TimeAtRiskConfigs } from "../CharacterizationNode";

interface TimeAtRiskConfigsFormProps {
  index: number;
  configs: TimeAtRiskConfigs | undefined;
  onRemove: () => void;
  onChange: (
    riskWindowStart: number,
    riskWindowEnd: number,
    startAnchor: string,
    endAnchor: string
  ) => void;
}

export const EMPTY_TIMEATRISK_FORM_DATA: TimeAtRiskConfigs = {
  riskWindowStart: 0,
  riskWindowEnd: 0,
  startAnchor: "cohort start",
  endAnchor: "cohort end",
};

export const TimeAtRiskConfigsForm: FC<TimeAtRiskConfigsFormProps> = ({
  index,
  configs,
  onRemove,
  onChange,
}) => {
  const handleChange = useCallback(
    (changes: Partial<TimeAtRiskConfigs>) => {
      const update = { ...configs, ...changes } as TimeAtRiskConfigs;
      typeof onChange === "function" &&
        onChange(
          update.riskWindowStart,
          update.riskWindowEnd,
          update.startAnchor,
          update.endAnchor
        );
    },
    [configs, onChange]
  );

  return (
    <Box display="flex" alignItems="flex-end" gap={2}>
      <Box sx={{ width: "200px", height: index === 0 ? "70px" : "60px" }}>
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0
            ? { label: "RiskWindowStart" }
            : { placeholder: "RiskWindowStart" })}
          value={configs?.riskWindowStart}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ riskWindowStart: Number(event.target.value) })
          }
          type="number"
        />
      </Box>
      <Box
        flex="1"
        sx={{ width: "200px", height: index === 0 ? "70px" : "60px" }}
      >
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0
            ? { label: "RiskWindowEnd" }
            : { placeholder: "RiskWindowEnd" })}
          value={configs?.riskWindowEnd}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ riskWindowEnd: Number(event.target.value) })
          }
          type="number"
        />
      </Box>
      <Box sx={{ width: "150px", height: index === 0 ? "70px" : "60px" }}>
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0
            ? { label: "StartAnchor" }
            : { placeholder: "StartAnchor" })}
          value={configs?.startAnchor}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ startAnchor: event.target.value })
          }
        />
      </Box>
      <Box sx={{ width: "150px", height: index === 0 ? "70px" : "60px" }}>
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0
            ? { label: "EndAnchor" }
            : { placeholder: "EndAnchor" })}
          value={configs?.endAnchor}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ endAnchor: event.target.value })
          }
        />
      </Box>
      <Box flex="none" sx={{ height: "60px" }}>
        <IconButton startIcon={<TrashIcon />} onClick={() => onRemove()} />
      </Box>
    </Box>
  );
};
