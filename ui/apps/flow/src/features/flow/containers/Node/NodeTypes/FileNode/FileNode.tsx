import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { FileDrawer } from "./FileDrawer";
import "./FileNode.scss";

export interface FileNodeData extends NodeDataState {
  file: string;
  file_type: string;
  encoding?: string;
}

export const FileNode = (node: NodeProps<FileNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<FileNodeData>
        className="file-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={null}
      >
        {data.description}
      </NodeLayout>
      <FileDrawer
        node={node}
        title="Configure File Node"
        className="file-drawer"
        open={settingVisible}
        onClose={closeSetting}
      />
      <ResultsDrawer
        open={resultVisible}
        onClose={closeResult}
        title={data.name}
        error={data.error}
        message={data.error ? data.errorMessage : data.result}
        createdDate={data.resultDate}
      />
    </>
  );
};
