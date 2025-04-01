import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { SelfControlledCaseSeriesDrawer } from "./SelfControlledCaseSeriesDrawer";
import "./SelfControlledCaseSeriesNode.scss";

export interface SelfControlledCaseSeriesNodeData extends NodeDataState {
  combineDataFetchAcrossOutcomes: boolean;
}

export const SelfControlledCaseSeriesNode = (
  node: NodeProps<SelfControlledCaseSeriesNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<SelfControlledCaseSeriesNodeData>
        className="self-controlled-case-series-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <SelfControlledCaseSeriesDrawer
        node={node}
        title="Configure Self Controlled Case Series Node"
        className="SCCS-drawer"
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
