import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { CohortDiagnosticsDrawer } from "./CohortDiagnosticsDrawer";
import "./CohortDiagnosticsNode.scss";

export interface CohortDiagnosticsNodeData extends NodeDataState {
  runInclusionStatistics: boolean;
  runIncludedSourceConcepts: boolean;
  runOrphanConcepts: boolean;
  runTimeSeries: boolean;
  runVisistContext: boolean;
  runBreakdownIndexEvents: boolean;
  runIncidenceRate: boolean;
  runCohortRelationship: boolean;
  runTemporalCohortCharacterization: boolean;
  incremental: boolean;
}

export const CohortDiagnosticsNode = (
  node: NodeProps<CohortDiagnosticsNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CohortDiagnosticsNodeData>
        className="cohort-diagnostics-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CohortDiagnosticsDrawer
        node={node}
        title="Configure cohort diagnostics node"
        className="cohort-diagnostics-drawer"
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
