import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { CohortMethodDrawer } from "./CohortMethodDrawer";
import "./CohortMethodNode.scss";
export interface CohortMethodConfigs {
  analysisId: string;
  targetId: string;
}
export interface CohortMethodNodeData extends NodeDataState {
  trueEffectSize: number;
  priorOutcomeLookback: number;
  cohortMethodConfigs: CohortMethodConfigs[];
}

export const CohortMethodNode = (node: NodeProps<CohortMethodNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CohortMethodNodeData>
        className="cohort-method-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CohortMethodDrawer
        node={node}
        title="Configure Cohort Method Node"
        className="cohort-method-drawer"
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
