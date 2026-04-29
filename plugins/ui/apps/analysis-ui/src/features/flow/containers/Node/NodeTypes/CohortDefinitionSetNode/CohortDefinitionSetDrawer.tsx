import React, {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, Button, TextInput } from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "..";
import { CohortDefinitionSetNodeData } from "./CohortDefinitionSetNode";

export interface CohortDefinitionSetDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortDefinitionSetNodeData>;
  onClose: () => void;
}

interface FormData extends CohortDefinitionSetNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  file: "",
};

export const CohortDefinitionSetDrawer: FC<CohortDefinitionSetDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const [selectedFile, setSelectedFile] = useState<File>();
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        file: node.data.file,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_definition_set_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleAddFile = useCallback(() => {
    if (hiddenFileInput.current !== null) {
      hiddenFileInput.current.click();
    }
  }, [hiddenFileInput]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length == 0) return;

      const file = e.target.files[0];
      setSelectedFile(file);
      onFormDataChange({ file: file.name });
    },
    [onFormDataChange]
  );

  const handleOk = useCallback(() => {
    const updated: NodeState<CohortDefinitionSetNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  return (
    <NodeDrawer {...props} width="500px" onOk={handleOk} onClose={onClose}>
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
      <Box mb={4} display="flex" alignItems="center">
        <Button
          type="button"
          text="Choose file"
          onClick={handleAddFile}
          style={{ marginRight: 7 }}
        />
        <div>{selectedFile?.name}</div>
        <input
          type="file"
          accept=".zip"
          ref={hiddenFileInput}
          onChange={handleFileChange}
          onClick={() => {
            if (hiddenFileInput.current) {
              hiddenFileInput.current.value = "";
            }
          }}
          style={{ display: "none" }}
        />
      </Box>
    </NodeDrawer>
  );
};
