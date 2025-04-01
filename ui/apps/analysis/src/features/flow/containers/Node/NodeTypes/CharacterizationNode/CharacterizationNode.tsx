import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { CharacterizationDrawer } from "./CharacterizationDrawer";
import "./CharacterizationNode.scss";

export interface TimeAtRiskConfigs {
  riskWindowStart: number;
  startAnchor: string;
  riskWindowEnd: number;
  endAnchor: string;
}

export interface CharacterizationNodeData extends NodeDataState {
  dechallengeStopInterval: number;
  dechallengeEvaluationWindow: number;
  minPriorObservation: number;
  targetIds: string[];
  outcomeIds: string[];
  timeAtRiskConfigs: TimeAtRiskConfigs[];
}

export const CharacterizationNode = (
  node: NodeProps<CharacterizationNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CharacterizationNodeData>
        className="characterization-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CharacterizationDrawer
        node={node}
        title="Configure Characterization Node"
        className="characterization-drawer"
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
