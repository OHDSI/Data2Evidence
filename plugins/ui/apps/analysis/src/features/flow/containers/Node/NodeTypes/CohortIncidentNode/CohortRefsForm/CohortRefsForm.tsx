import React, { ChangeEvent, FC, useCallback } from "react";
import { Box, IconButton, TextField, TrashIcon } from "@portal/components";
import { CohortRefs } from "../CohortIncidentNode";

interface CohortRefsFormProps {
  index: number;
  configs: CohortRefs | undefined;
  onRemove: () => void;
  onChange: (name: string, id: string, description: string) => void;
}

export const EMPTY_COHORTREFS_FORM_DATA: CohortRefs = {
  name: "",
  id: "",
  description: "",
};

export const CohortRefsForm: FC<CohortRefsFormProps> = ({
  index,
  configs,
  onRemove,
  onChange,
}) => {
  const handleChange = useCallback(
    (changes: Partial<CohortRefs>) => {
      const update = { ...configs, ...changes } as CohortRefs;
      typeof onChange === "function" &&
        onChange(update.name, update.id, update.description);
    },
    [configs, onChange]
  );

  return (
    <Box display="flex" alignItems="flex-end" gap={2}>
      <Box sx={{ width: "150px", height: index === 0 ? "70px" : "60px" }}>
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0 ? { label: "Name" } : { placeholder: "Name" })}
          value={configs?.name}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ name: event.target.value })
          }
        />
      </Box>
      <Box
        flex="1"
        sx={{ width: "150px", height: index === 0 ? "70px" : "60px" }}
      >
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0 ? { label: "ID" } : { placeholder: "ID" })}
          value={configs?.id}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ id: event.target.value })
          }
        />
      </Box>
      <Box sx={{ width: "200px", height: index === 0 ? "70px" : "60px" }}>
        <TextField
          fullWidth
          variant="standard"
          {...(index === 0
            ? { label: "Description" }
            : { placeholder: "Description" })}
          value={configs?.description}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleChange({ description: event.target.value })
          }
        />
      </Box>
      <Box flex="none" sx={{ height: "60px" }}>
        <IconButton startIcon={<TrashIcon />} onClick={() => onRemove()} />
      </Box>
    </Box>
  );
};
