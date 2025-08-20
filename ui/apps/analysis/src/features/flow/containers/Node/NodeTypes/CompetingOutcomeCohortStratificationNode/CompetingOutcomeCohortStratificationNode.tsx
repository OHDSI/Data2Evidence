import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { CompetingOutcomeCohortStratificationDrawer } from "./CompetingOutcomeCohortStratificationDrawer";
import "./CompetingOutcomeCohortStratificationNode.scss";
import { CompetingOutcomeCohortStratificationArgs } from "./types";

export interface CompetingOutcomeCohortStratificationNodeData
  extends NodeDataState {
  competingOutcomeCohortStratificationArgs: CompetingOutcomeCohortStratificationArgs;
}

export const CompetingOutcomeCohortStratificationNode = (
  node: NodeProps<CompetingOutcomeCohortStratificationNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CompetingOutcomeCohortStratificationNodeData>
        className="competing-outcome-cohort-stratification-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CompetingOutcomeCohortStratificationDrawer
        node={node}
        title="Configure Competing Outcome Cohort / Stratification Node"
        className="competing-outcome-cohort-stratification-drawer"
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
