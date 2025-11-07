import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { HandleIOType } from "../type";
import { PythonDrawer } from "./PythonDrawer";
import { SourceHandle } from "../../CustomHandle/CustomHandle";
import "./PythonNode.scss";

export interface PythonNodeData extends NodeDataState {
  python_code: string;
  output_json_schema: string;
}

export const PythonNode = (node: NodeProps<PythonNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<PythonNodeData>
        className="python-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        RightHandle={
          <SourceHandle ioType={HandleIOType.Object} nodeId={node.id} />
        }
      >
        {data.description}
      </NodeLayout>
      <PythonDrawer
        node={node}
        title="Configure Python"
        className="python-drawer"
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
