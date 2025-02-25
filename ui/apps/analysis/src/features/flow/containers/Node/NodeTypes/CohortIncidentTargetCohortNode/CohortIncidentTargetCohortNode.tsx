import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { CohortIncidentTargetCohortDrawer } from "./CohortIncidentTargetCohortDrawer";
import "./CohortIncidentTargetCohortNode.scss";

export interface CohortIncidentTargetCohortNodeData extends NodeDataState {
  defId: number;
  defName: string;
  cohortId: number;
  cleanWindow: number;
}

export const CohortIncidentTargetCohortNode = (
  node: NodeProps<CohortIncidentTargetCohortNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CohortIncidentTargetCohortNodeData>
        className="cohort-incident-target-cohort-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CohortIncidentTargetCohortDrawer
        node={node}
        title="Configure Cohort Incident Target Cohort Node"
        className="cohort-incident-target-cohort-drawer"
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
