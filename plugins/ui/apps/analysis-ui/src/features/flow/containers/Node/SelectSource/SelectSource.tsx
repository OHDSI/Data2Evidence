import React, { FC, useCallback, useEffect, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  SelectProps,
} from "@portal/components";
import { useSelector } from "react-redux";
import { Node } from "reactflow";
import { selectSourceNodes } from "~/features/flow/selectors";
import { KeyValueData, NodeDataState } from "~/features/flow/types";
import { RootState } from "~/store";
import { NodeChoiceMap, NodeType } from "../NodeTypes";
import { NodeTypeChoice } from "../NodeTypes/type";

export type SourceType = "node" | "script_node";

export class SourceTypes {
  public static get NODE(): SourceType {
    return "node";
  }
  public static get SCRIPT_NODE(): SourceType {
    return "script_node";
  }
}

export type SourceOptions = { [nodeType in NodeType]?: SourceType[] };

export interface SelectSourceProps
  extends Omit<SelectProps, "label" | "value" | "onChange"> {
  nodeId: string;
  label?: string;
  value: string;
  sourceOptions: SourceOptions;
  onChange: (value: string) => void;
  onFilter?: (kv: KeyValueData) => boolean;
}

export const SelectSource: FC<SelectSourceProps> = ({
  nodeId,
  label,
  value,
  sourceOptions,
  onChange,
  onFilter,
  ...props
}) => {
  const sourceNodes = useSelector(
    (state: RootState) =>
      selectSourceNodes(state, nodeId) as Node<NodeDataState>[]
  );

  const [selection, setSelection] = useState<KeyValueData[]>([]);

  const prepareSelection = useCallback(async (nodes: Node<NodeDataState>[]) => {
    const nodeAsSource = nodes
      .filter(
        (n) =>
          n.type in sourceOptions &&
          sourceOptions[n.type].includes(SourceTypes.NODE)
      )
      .map(
        (n) =>
          ({
            key: n.data.name,
            value: n.data.name,
            data: NodeChoiceMap[n.type as NodeTypeChoice]?.title?.toLowerCase(),
          } as KeyValueData)
      );

    const scriptNodeAsSource = nodes
      .filter(
        (n) =>
          n.type in sourceOptions &&
          sourceOptions[n.type].includes(SourceTypes.SCRIPT_NODE)
      )
      .map(
        (n) =>
          ({
            key: `${n.data.name}.${SourceTypes.SCRIPT_NODE}`,
            value: `${n.data.name}.${SourceTypes.SCRIPT_NODE}`,
            data: NodeChoiceMap[n.type as NodeTypeChoice]?.title?.toLowerCase(),
          } as KeyValueData)
      );

    setSelection([...nodeAsSource, ...scriptNodeAsSource]);
  }, []);

  useEffect(() => {
    prepareSelection(sourceNodes);
  }, [sourceNodes]);

  const filtered = onFilter ? selection.filter(onFilter) : selection;

  return (
    <FormControl variant="standard" sx={{ minWidth: "350px", width: "100%" }}>
      {label && <InputLabel shrink>{label}</InputLabel>}
      <Select
        value={value}
        onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
        {...props}
      >
        {filtered.map(({ key, value, data }) => (
          <MenuItem key={key} value={key}>
            <Box display="flex" gap={1}>
              {value}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
