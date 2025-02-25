import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { SeasonalityCovariateSettingsDrawer } from "./SeasonalityCovariateSettingsDrawer";
import "./SeasonalityCovariateSettingsNode.scss";

export interface SeasonalityCovariateSettingsNodeData extends NodeDataState {
  seasonalityKnots: number;
  allowRegularization: boolean;
  computeConfidenceIntervals: boolean;
}

export const SeasonalityCovariateSettingsNode = (
  node: NodeProps<SeasonalityCovariateSettingsNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<SeasonalityCovariateSettingsNodeData>
        className="seasonality-covariate-settings-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <SeasonalityCovariateSettingsDrawer
        node={node}
        title="Configure SeasonalityCovariateSettings Node"
        className="seasonality-covariate-settings-drawer"
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
