import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  AddSquareIcon,
  Box,
  CloseIcon,
  IconButton,
  TextField,
  TextInput,
} from "@portal/components";
import { Editor } from "~/components/Editor/Editor";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import {
  SelectSource,
  SourceOptions,
  SourceTypes,
} from "../../SelectSource/SelectSource";
import { NodeChoiceMap } from "../../NodeTypes";
import { SourceToTableMap, SqlNodeData } from "./SqlNode";
import "./SqlDrawer.scss";

export interface SqlDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<SqlNodeData>;
  onClose: () => void;
}

interface FormData extends Omit<SqlNodeData, "tables" | "uiTables"> {
  uiTables: SourceToTableMap[];
}

const JSON_PATH_PREFIX = "$.";
const SCRIPT_NODE_INDICATOR = `.${SourceTypes.SCRIPT_NODE}`;

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  uiTables: [],
  sql: "",
};

const sourceOptions: SourceOptions = {
  csv_node: [SourceTypes.NODE],
  python_node: [SourceTypes.SCRIPT_NODE],
  python_notebook_node: [SourceTypes.SCRIPT_NODE],
  r_node: [SourceTypes.SCRIPT_NODE],
};

export const SqlDrawer: FC<SqlDrawerProps> = ({ node, onClose, ...props }) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );

  useEffect(() => {
    if (node.data) {
      const uiTables = node.data.uiTables
        ? Object.keys(node.data.uiTables).map(
            (t) =>
              ({
                source: node.data.uiTables[t].source,
                path: node.data.uiTables[t].path,
                tableName: node.data.uiTables[t].tableName,
              } as SourceToTableMap)
          )
        : [];

      setFormData({
        name: node.data.name,
        description: node.data.description,
        uiTables,
        sql: node.data.sql,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["sql_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const tables: { [key: string]: any } = Object.assign(
      {},
      ...formData.uiTables
        .filter((t) => !!t.source)
        .map((t) => {
          if (t.source.endsWith(SCRIPT_NODE_INDICATOR)) {
            const scriptNodeIndex = t.source.indexOf(SCRIPT_NODE_INDICATOR);
            const path = t.path.startsWith(JSON_PATH_PREFIX)
              ? t.path.substring(JSON_PATH_PREFIX.length, t.path.length)
              : t.path;

            return {
              [t.tableName]: [
                t.source.substring(0, scriptNodeIndex)!,
                ...path.split("."),
              ],
            };
          }

          return { [t.tableName]: [t.source] };
        })
    );

    const updated: NodeState<SqlNodeData> = {
      ...nodeState,
      data: { ...formData, tables },
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  return (
    <NodeDrawer {...props} onOk={handleOk} onClose={onClose}>
      <Box mb={4}>
        <TextInput
          label="Name"
          value={formData.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ name: e.target.value })
          }
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="Description"
          value={formData.description}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ description: e.target.value })
          }
        />
      </Box>
      <Box mb={4} width="100%" overflow="auto">
        {formData.uiTables.map((tbl, index) => (
          <Box key={index} display="flex" alignItems="flex-end" gap={3} mb={1}>
            <Box flex="1">
              <SelectSource
                fullWidth
                nodeId={node.id}
                sourceOptions={sourceOptions}
                label={index === 0 ? "Source" : undefined}
                value={tbl.source}
                onChange={(value: string) =>
                  onFormDataChange({
                    uiTables: [
                      ...formData.uiTables.slice(0, index),
                      {
                        ...formData.uiTables[index],
                        source: value,
                      } as SourceToTableMap,
                      ...formData.uiTables.slice(
                        index + 1,
                        formData.uiTables.length
                      ),
                    ],
                  })
                }
              />
            </Box>
            <Box sx={{ width: "200px" }}>
              {tbl.source.endsWith(SCRIPT_NODE_INDICATOR) ? (
                <TextField
                  variant="standard"
                  sx={{ width: "200px" }}
                  label={index === 0 ? "JSON Path" : ""}
                  value={tbl.path}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onFormDataChange({
                      uiTables: [
                        ...formData.uiTables.slice(0, index),
                        {
                          ...formData.uiTables[index],
                          path: e.target.value,
                        } as SourceToTableMap,
                        ...formData.uiTables.slice(
                          index + 1,
                          formData.uiTables.length
                        ),
                      ],
                    })
                  }
                />
              ) : (
                <Box sx={{ width: "200px" }}>&nbsp;</Box>
              )}
            </Box>
            <Box sx={{ width: "200px" }}>
              <TextField
                variant="standard"
                sx={{ width: "200px" }}
                label={index === 0 ? "Map as table name" : ""}
                value={tbl.tableName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    uiTables: [
                      ...formData.uiTables.slice(0, index),
                      {
                        ...formData.uiTables[index],
                        tableName: e.target.value,
                      } as SourceToTableMap,
                      ...formData.uiTables.slice(
                        index + 1,
                        formData.uiTables.length
                      ),
                    ],
                  })
                }
              />
            </Box>
            <Box flex="none">
              <IconButton
                startIcon={<CloseIcon className="remove-row-icon" />}
                onClick={() =>
                  onFormDataChange({
                    uiTables: [
                      ...formData.uiTables.slice(0, index),
                      ...formData.uiTables.slice(
                        index + 1,
                        formData.uiTables.length
                      ),
                    ],
                  })
                }
              />
            </Box>
          </Box>
        ))}
        <IconButton
          startIcon={<AddSquareIcon />}
          title="row"
          onClick={() =>
            onFormDataChange({
              uiTables: [
                ...formData.uiTables,
                { source: "", path: "", tableName: "" } as SourceToTableMap,
              ],
            })
          }
        />
      </Box>
      <Editor
        language="sql"
        value={formData.sql}
        onChange={(sql: string) => onFormDataChange({ sql })}
        label="SQL"
        boxProps={{ mb: 0 }}
      />
    </NodeDrawer>
  );
};
