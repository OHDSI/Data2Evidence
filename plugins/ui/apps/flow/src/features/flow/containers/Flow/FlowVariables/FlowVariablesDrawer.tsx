import React, {
  FC,
  useCallback,
  useState,
  useEffect,
  SetStateAction,
} from "react";
import { useSelector } from "react-redux";
import { Typography, Divider } from "@mui/material";
import { SxProps } from "@mui/material";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Drawer,
  DrawerProps,
  IconButton,
  CloseIcon,
  AddSquareIcon,
  TextField,
} from "@portal/components";
import { dispatch, RootState } from "~/store";
import {
  markStatusAsDraft,
  replaceVariables,
  replaceImportLibs,
} from "../../../reducers";
import { KeyValue } from "../../../types";
import { VariableForm } from "./VariableForm/VariableForm";
import "./FlowVariablesDrawer.scss";

export interface FlowVariablesDrawerProps extends DrawerProps {
  onClose?: () => void;
}

const styles: SxProps = {
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
    color: "var(--color-neutral)",
    "&::after, &:hover:not(.Mui-disabled)::before": {
      borderBottom: "2px solid #000080",
    },
  },
};

export const FlowVariablesDrawer: FC<FlowVariablesDrawerProps> = ({
  onClose,
  ...drawerProps
}) => {
  const variables = useSelector((state: RootState) => state.flow.variables);
  const importLibs = useSelector((state: RootState) => state.flow.importLibs);
  const [localVariables, setLocalVariables] = useState<KeyValue[]>(variables);
  const [localImportLibs, setLocalImportLibs] = useState<string[]>([]);

  useEffect(() => {
    setLocalVariables(variables || []);
  }, [variables]);

  useEffect(() => {
    setLocalImportLibs(importLibs || []);
  }, [importLibs]);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  const handleAddVariable = useCallback(() => {
    const newVariable: KeyValue = { key: "", value: "" };
    setLocalVariables([...localVariables, newVariable]);
  }, [localVariables]);

  const handleRemoveVariable = useCallback(
    <T extends {}>(
      index: number,
      state: Array<T>,
      setState: (value: SetStateAction<T[]>) => void
    ) => {
      const copyLine = [...state];
      copyLine.splice(index, 1);
      setState(copyLine);
    },
    []
  );

  const handleVariableChange = useCallback(
    (key: string, value: string, index: number) => {
      const newVariable = { key, value };
      const currentVariables = [...localVariables];
      currentVariables[index] = newVariable;
      setLocalVariables(currentVariables);
    },
    [localVariables]
  );

  const handleApply = useCallback(() => {
    dispatch(replaceVariables(localVariables));
    dispatch(replaceImportLibs(localImportLibs));
    dispatch(markStatusAsDraft());
    handleClose();
  }, [localVariables, localImportLibs, handleClose]);

  const isKeyDuplicate = useCallback(
    (key: string, currentIndex: number) => {
      if (!key.trim()) return false;
      return localVariables.some(
        (variable, index) =>
          index !== currentIndex && variable.key.trim() === key.trim()
      );
    },
    [localVariables]
  );

  return (
    <Drawer
      anchor="right"
      className="flow-variables-drawer"
      PaperProps={{
        style: { width: "600px", display: "flex", flexDirection: "column" },
      }}
      onClose={onClose}
      {...drawerProps}
    >
      <div className="flow-variables-drawer__header">
        <Box flexGrow={1}>
          <Typography variant="h6">
            Variables
            {localVariables.length > 0 && (
              <span className="flow-variables-drawer__count">
                ({localVariables.length} variable
                {localVariables.length !== 1 ? "s" : ""})
              </span>
            )}
          </Typography>
        </Box>
        <Box>
          <IconButton
            startIcon={<CloseIcon />}
            aria-label="close"
            onClick={handleClose}
          />
        </Box>
      </div>

      <div className="flow-variables-drawer__content">
        <div className="flow-variables-drawer__tags">
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
            Python libraries to import
          </Typography>
          <Box mb={4}>
            <Autocomplete
              multiple
              freeSolo
              autoSelect
              options={[] as string[]}
              sx={styles}
              id="autocomplete-flow-tags"
              renderTags={(value: string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  helperText="Press enter to confirm the entry"
                />
              )}
              value={localImportLibs}
              onChange={(event, newTags) => setLocalImportLibs(newTags)}
            />
          </Box>
        </div>

        <Divider sx={{ my: 3 }} />

        <div className="flow-variables-drawer__variables">
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
            Variables
          </Typography>
          {localVariables.length === 0 ? (
            <Box
              display="flex"
              justifyContent="flex-start"
              alignItems="center"
              py={4}
              sx={{
                color: "text.secondary",
                fontStyle: "italic",
              }}
            >
              <Typography variant="body2">
                No variables defined. Click "Add Variable" to get started.
              </Typography>
            </Box>
          ) : (
            localVariables.map((variable, index) => {
              const isDuplicateKey = isKeyDuplicate(variable.key, index);
              return (
                <VariableForm
                  key={index}
                  variable={variable}
                  index={index}
                  onVariableChange={handleVariableChange}
                  onRemoveVariable={() =>
                    handleRemoveVariable(
                      index,
                      localVariables,
                      setLocalVariables
                    )
                  }
                  isDuplicateKey={isDuplicateKey}
                />
              );
            })
          )}
        </div>

        <Box display="flex" justifyContent="flex-start">
          <IconButton
            startIcon={<AddSquareIcon />}
            title="Add Variable"
            onClick={handleAddVariable}
          />
        </Box>
      </div>

      <div className="flow-variables-drawer__footer">
        <Box display="flex" justifyContent="flex-end">
          <Button
            type="submit"
            className="flow-variables-drawer__submit"
            text="Apply"
            onClick={handleApply}
          />
        </Box>
      </div>
    </Drawer>
  );
};
