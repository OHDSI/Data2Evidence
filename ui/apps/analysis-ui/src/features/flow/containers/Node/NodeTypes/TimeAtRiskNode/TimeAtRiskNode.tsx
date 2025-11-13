import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { TimeAtRiskDrawer } from "./TimeAtRiskDrawer";
import "./TimeAtRiskNode.scss";

export interface TimeAtRiskNodeData extends NodeDataState {
  timeAtRiskId: number;
  endWith: string;
  startWith: string;
  startOffset?: number;
  endOffset?: number;
}

export const TimeAtRiskNode = (node: NodeProps<TimeAtRiskNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<TimeAtRiskNodeData>
        className="time-at-risk-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <TimeAtRiskDrawer
        node={node}
        title="Configure TimeAtRisk Node"
        className="time-at-risk-drawer"
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
