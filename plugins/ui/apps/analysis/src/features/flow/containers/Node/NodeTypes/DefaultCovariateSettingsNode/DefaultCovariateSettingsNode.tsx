import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { DefaultCovariateSettingsDrawer } from "./DefaultCovariateSettingsDrawer";
import "./DefaultCovariateSettingsNode.scss";

export interface DefaultCovariateSettingsNodeData extends NodeDataState {
  excludedCovariateConceptIds?: string[];
  includedCovariateConceptIds?: string[];
  addDescendantsToInclude?: boolean;
  addDescendantsToExclude?: boolean;
  includedCovariateIds?: string[];
}

export const DefaultCovariateSettingsNode = (
  node: NodeProps<DefaultCovariateSettingsNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<DefaultCovariateSettingsNodeData>
        className="default-covariate-settings-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <DefaultCovariateSettingsDrawer
        node={node}
        title="Configure Default Covariate Settings Node"
        className="default-covariate-settings-drawer"
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
