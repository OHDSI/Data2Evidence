import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { KaplanMeierCharacterizationDrawer } from "./KaplanMeierCharacterizationDrawer";
import "./KaplanMeierCharacterizationNode.scss";
import { KaplanMeierCharacterizationArgs } from "./types";

export interface KaplanMeierCharacterizationNodeData extends NodeDataState {
  kaplanMeierCharacterizationArgs: KaplanMeierCharacterizationArgs;
}

export const KaplanMeierCharacterizationNode = (
  node: NodeProps<KaplanMeierCharacterizationNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<KaplanMeierCharacterizationNodeData>
        className="kaplan-meier-characterization-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <KaplanMeierCharacterizationDrawer
        node={node}
        title="Configure Kaplan-Meier Characterization Analysis Node"
        className="kaplan-meier-characterization-drawer"
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
