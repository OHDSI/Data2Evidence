import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { EdgeState, NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { DataMappingDrawer } from "./DataMappingDrawer";
import "./DataMappingNode.scss";

export interface DataMappingNodeData extends NodeDataState {
  edges?: EdgeState[];
  data_model?: string;
  data_map?: {};
}

export const DataMappingNode = (node: NodeProps<DataMappingNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<DataMappingNodeData>
        className="data-mapping-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <DataMappingDrawer
        node={node}
        title="Configure Data Mapping"
        className="data-mapping-drawer"
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
