import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { HandleIOType } from "../type";
import { TransformDataDrawer } from "./TransformDataDrawer";
import { SourceHandle, TargetHandle } from "../../CustomHandle/CustomHandle";
import "./TransformDataNode.scss";

export interface TransformNodeData extends NodeDataState {
  structure_map: string;
  output_omop_data: string;
  dataframe: string;
}

export const TransformDataNode = (node: NodeProps<TransformNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<TransformNodeData>
        className="python-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={
          <TargetHandle nodeId={node.id} ioType={HandleIOType.Dataframe} />
        }
        RightHandle={
            <SourceHandle nodeId={node.id} ioType={HandleIOType.Dataframe} />
        }
      >
        {data.description}
      </NodeLayout>
      <TransformDataDrawer
        node={node}
        title="Configure Transform Data"
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
