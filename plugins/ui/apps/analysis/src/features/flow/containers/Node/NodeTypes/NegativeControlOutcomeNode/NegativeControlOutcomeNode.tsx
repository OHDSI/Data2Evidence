import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { NegatveControlOutcomeDrawer } from "./NegativeControlOutcomeDrawer";
import "./NegativeControlOutcomeNode.scss";

export interface NegatveControlOutcomeNodeData extends NodeDataState {
  occurenceType: string;
  detectOnDescendants: boolean;
}

export const NegatveControlOutcomeNode = (
  node: NodeProps<NegatveControlOutcomeNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<NegatveControlOutcomeNodeData>
        className="negative-control-outcome-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <NegatveControlOutcomeDrawer
        node={node}
        title="Configure Negative Control Outcome Node"
        className="negative-control-outcome-drawer"
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
