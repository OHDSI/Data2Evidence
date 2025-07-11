import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { TreatmentPatternsDrawer } from "./TreatmentPatternsDrawer";
import {
  TreatmentPatternsCohort,
  IncludeTreatments,
  FilterTreatments,
  CensorType,
} from "./TreatmentPatternsType";

export interface TreatmentPatternsNodeData extends NodeDataState {
  cohorts: TreatmentPatternsCohort[];
  includeTreatments: IncludeTreatments;
  indexDateOffset: number;
  minEraDuration: number;
  splitEventCohorts: string;
  splitTime: number;
  eraCollapseSize: number;
  combinationWindow: number;
  minPostCombinationDuration: number;
  filterTreatments: FilterTreatments;
  maxPathLength: number;
  ageWindow: number;
  minCellCount: number;
  censorType: CensorType;
}

export const TreatmentPatternsNode = (
  node: NodeProps<TreatmentPatternsNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<TreatmentPatternsNodeData>
        className="treatment-patterns-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <TreatmentPatternsDrawer
        node={node}
        title="Configure Treatment Patterns Node"
        className="treatment-patterns-drawer"
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
