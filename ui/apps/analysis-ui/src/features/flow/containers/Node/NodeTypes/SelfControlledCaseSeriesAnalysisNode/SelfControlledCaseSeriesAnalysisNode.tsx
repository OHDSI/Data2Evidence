import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { SelfControlledCaseSeriesAnalysisDrawer } from "./SelfControlledCaseSeriesAnalysisDrawer";
import "./SelfControlledCaseSeriesAnalysisNode.scss";

interface DbSccsDataArgs {
  // TODO: Confirm the format of Date, align with backend
  // TODO: Implement a Date Selector for date fields
  studyStartDate: string;
  studyEndDate: string;
  maxCasesPerOutcome: number;
  useNestingCohort: boolean;
  nestingCohortId: number;
  deleteCovariateSmallCount: number;
}

interface SccsIntervalDataArgs {
  minCasesForTimeCovariates: number;
}

interface FitSccsModelArgs {
  control: boolean;
  cvType: string;
  selectorType: string;
  startingVariance: number;
  seed: number;
  resetCoefficients: boolean;
  noiseLevel: string;
}

export interface SelfControlledCaseSeriesAnalysisNodeData
  extends NodeDataState {
  analysisId: number;
  dbSccsDataArgs: DbSccsDataArgs;
  sccsIntervalDataArgs: SccsIntervalDataArgs;
  fitSccsModelArgs: FitSccsModelArgs;
}

export const SelfControlledCaseSeriesAnalysisNode = (
  node: NodeProps<SelfControlledCaseSeriesAnalysisNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<SelfControlledCaseSeriesAnalysisNodeData>
        className="self-controlled-case-series-analysis-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <SelfControlledCaseSeriesAnalysisDrawer
        node={node}
        title="Configure Self Controlled Case Series Analysis Node"
        className="self-controlled-case-series-analysis-drawer"
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
