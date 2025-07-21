import React, {
  FC,
  useCallback,
  useState,
  useEffect,
  SetStateAction,
} from "react";
import { useSelector } from "react-redux";
import { Typography } from "@mui/material";
import {
  Box,
  Button,
  Drawer,
  DrawerProps,
  IconButton,
  CloseIcon,
  AddSquareIcon,
} from "@portal/components";
import { dispatch, RootState } from "~/store";
import { markStatusAsDraft, replaceVariables } from "../../../reducers";
import { KeyValue } from "../../../types";
import { VariableForm } from "./VariableForm/VariableForm";
import "./FlowVariablesDrawer.scss";

export interface FlowVariablesDrawerProps extends DrawerProps {
  onClose?: () => void;
}
export const FlowVariablesDrawer: FC<FlowVariablesDrawerProps> = ({
  onClose,
  ...drawerProps
}) => {
  const variables = useSelector((state: RootState) => state.flow.variables);
  const [localVariables, setLocalVariables] = useState<KeyValue[]>(variables);

  useEffect(() => {
    setLocalVariables(variables || []);
  }, [variables]);

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
    dispatch(markStatusAsDraft());
    handleClose();
  }, [localVariables, handleClose]);

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
        <div className="flow-variables-drawer__variables">
          {localVariables.map((variable, index) => {
            const isDuplicateKey = isKeyDuplicate(variable.key, index);
            return (
              <VariableForm
                key={index}
                variable={variable}
                index={index}
                onVariableChange={handleVariableChange}
                onRemoveVariable={() =>
                  handleRemoveVariable(index, localVariables, setLocalVariables)
                }
                isDuplicateKey={isDuplicateKey}
              />
            );
          })}
        </div>

        <IconButton
          startIcon={<AddSquareIcon />}
          title="Add Variable"
          onClick={handleAddVariable}
        />
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
