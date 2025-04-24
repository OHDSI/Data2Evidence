import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { TargetComparatorOutcomesDrawer } from "./TargetComparatorOutcomesDrawer";
import "./TargetComparatorOutcomesNode.scss";

export interface TargetComparatorOutcomesNodeData extends NodeDataState {
  targetId: number;
  comparatorId: number;
  excludedCovariateConceptIds: string[];
  includedCovariateConceptIds: string[];
}

export const TargetComparatorOutcomesNode = (
  node: NodeProps<TargetComparatorOutcomesNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<TargetComparatorOutcomesNodeData>
        className="target-comparator-outcomes-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <TargetComparatorOutcomesDrawer
        node={node}
        title="Configure Target Comparator Outcomes Node"
        className="target-comparator-outcomes-drawer"
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
