import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { CohortIncidentDrawer } from "./CohortIncidentDrawer";
import "./CohortIncidentNode.scss";

interface StrataSettings {
  byYear: boolean;
  byGender: boolean;
}

interface IncidenceAnalysis {
  targets: string[];
  outcomes: string[];
  tars: string[];
}

export interface CohortRefs {
  name: string;
  id: string;
  description: string;
}
export interface CohortIncidentNodeData extends NodeDataState {
  strataSettings: StrataSettings;
  cohortRefs: CohortRefs[];
  incidenceAnalysis: IncidenceAnalysis;
}

export const CohortIncidentNode = (node: NodeProps<CohortIncidentNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CohortIncidentNodeData>
        className="cohort-incident-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CohortIncidentDrawer
        node={node}
        title="Configure Cohort Incident Node"
        className="cohort-incident-drawer"
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
