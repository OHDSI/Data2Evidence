import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { CohortGeneratorDrawer } from "./CohortGeneratorDrawer";
import "./CohortGeneratorNode.scss";

export interface CohortGeneratorNodeData extends NodeDataState {
  incremental: boolean;
  generateStats: boolean;
}

export const CohortGeneratorNode = (
  node: NodeProps<CohortGeneratorNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CohortGeneratorNodeData>
        className="cohort-generator-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CohortGeneratorDrawer
        node={node}
        title="Configure Cohort Generator Node"
        className="cohort-generator-drawer"
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
