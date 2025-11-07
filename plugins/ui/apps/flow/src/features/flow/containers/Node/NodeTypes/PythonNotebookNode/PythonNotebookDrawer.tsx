import React, {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput } from "@portal/components";
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
import { PythonNotebookNodeData } from "./PythonNotebookNode";
import { StarboardEmbed } from "@data2evidence/d2e-starboard-wrap";
import { pluginMetadata } from "~/FlowApp";

export interface PythonDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<PythonNotebookNodeData>;
  onClose: () => void;
}

interface FormData extends PythonNotebookNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  python_code: "",
};

export const PythonDrawer: FC<PythonDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );

  const [runtime, setRuntime] = useState<StarboardEmbed>();
  const [unsaved, setUnsaved] = useState(false);

  const loadStarboard = useCallback(async () => {
    const UI_ROOT_FILE_URL = pluginMetadata?.data?.dnBaseUrl;
    const STARBOARD_URL = `${UI_ROOT_FILE_URL}starboard-notebook-base`;

    const jwtToken = await pluginMetadata.getToken();
    const content = node.data.python_code ?? "";

    const mount = document.querySelector("#python-notebook-editor");
    while (mount?.firstChild) {
      mount.removeChild(mount.firstChild);
    }

    const embedEl = new StarboardEmbed({
      notebookContent: content,
      src: `${STARBOARD_URL}/index.html`,
      serverUrl: UI_ROOT_FILE_URL,
      token: jwtToken,
      userId: pluginMetadata?.userId,
      preventNavigationWithUnsavedChanges: true,
      onUnsavedChangesStatusChange: () => setUnsaved(true),
    });

    mount?.appendChild(embedEl);
    setRuntime(embedEl);
    setUnsaved(false);
  }, [node]);

  useEffect(() => {
    if (props.open) loadStarboard();
  }, [loadStarboard, props.open]);

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        python_code: "",
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["python_notebook_node"].defaultData,
      });
    }
  }, [runtime, node.data]);

  const handleOk = useCallback(() => {
    const notebookContent = runtime?.notebookContent;
    const updated: NodeState<PythonNotebookNodeData> = {
      ...nodeState,
      data: {
        ...formData,
        python_code: notebookContent,
      },
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
      <Box mb={0} flex="1 1 0" overflow="auto" border="1px solid #aeaeae">
        <div id="python-notebook-editor" />
      </Box>
    </NodeDrawer>
  );
};
