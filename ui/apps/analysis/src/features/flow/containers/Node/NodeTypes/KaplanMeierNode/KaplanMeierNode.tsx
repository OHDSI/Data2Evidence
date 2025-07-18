import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { KaplanMeierDrawer } from "./KaplanMeierDrawer";
import "./KaplanMeierNode.scss";

interface KaplanMeierArgs {
  // Study Population Configuration (from createStudyPopulation)
  outcomeId: number;
  firstExposureOnly: boolean;
  restrictToCommonPeriod: boolean;
  washoutPeriod: number;
  removeDuplicateSubjects: "keep all" | "keep first" | "remove all";
  removeSubjectsWithPriorOutcome: boolean;
  minDaysAtRisk: number;

  // Risk Window Definition
  riskWindowStart: number;
  startAnchor: "cohort start" | "cohort end";
  riskWindowEnd: number;
  endAnchor: "cohort start" | "cohort end";

  // Kaplan-Meier Plot Settings
  includeZero: boolean;
  stratified: boolean;

  // Optional Advanced Settings
  censorAtNewRiskWindow?: boolean;
  minDaysToOutcome?: number;
}

export interface KaplanMeierNodeData extends NodeDataState {
  kaplanMeierArgs: KaplanMeierArgs;
}

export const KaplanMeierNode = (node: NodeProps<KaplanMeierNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<KaplanMeierNodeData>
        className="kaplan-meier-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <KaplanMeierDrawer
        node={node}
        title="Configure Kaplan-Meier Analysis Node"
        className="kaplan-meier-drawer"
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
