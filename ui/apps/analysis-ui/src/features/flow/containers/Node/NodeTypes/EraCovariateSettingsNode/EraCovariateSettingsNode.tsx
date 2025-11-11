import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { EraCovariateSettingsDrawer } from "./EraCovariateSettingsDrawer";
import "./EraCovariateSettingsNode.scss";

export interface EraCovariateSettingsNodeData extends NodeDataState {
  label: string;
  includedEraIds: string[];
  excludedEraIds: string[];
  start: number;
  end: number;
  startAnchor: string;
  endAnchor: string;
  stratifyById: boolean;
  firstOccurenceOnly: boolean;
  allowRegularization: boolean;
  profileLikelihood: boolean;
  exposureOfInterest: boolean;
}

export const EraCovariateSettingsNode = (
  node: NodeProps<EraCovariateSettingsNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<EraCovariateSettingsNodeData>
        className="era-covariate-settings-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <EraCovariateSettingsDrawer
        node={node}
        title="Configure EraCovariateSettings Node"
        className="era-covariate-settings-drawer"
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
