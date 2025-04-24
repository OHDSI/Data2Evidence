import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { OutcomesDrawer } from "./OutcomesDrawer";
import "./OutcomesNode.scss";

export interface OutcomesNodeData extends NodeDataState {
  ncoCohortSetIds: string[];
  outcomeId?: number;
  outcomeOfInterest?: boolean;
  trueEffectSize?: number;
  priorOutcomeLookback?: number;
  riskWindowStart?: number;
  riskWindowEnd?: number;
  startAnchor?: string;
  endAnchor?: string;
}

export const OutcomesNode = (node: NodeProps<OutcomesNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<OutcomesNodeData>
        className="outcomes-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <OutcomesDrawer
        node={node}
        title="Configure Outcomes Node"
        className="outcomes-drawer"
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
