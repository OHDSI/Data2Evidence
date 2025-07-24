import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { CohortSelectionDrawer } from "./CohortSelectionDrawer";
import { Cohort, CohortType } from "./CohortSelectionType";

export interface CohortSelectionNodeData extends NodeDataState {
  type: CohortType;
  cohorts: Cohort[];
}

export const CohortSelectionNode = (
  node: NodeProps<CohortSelectionNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CohortSelectionNodeData>
        className="cohort-selection-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CohortSelectionDrawer
        node={node}
        title="Configure Cohort Selection Node"
        className="cohort-selection-drawer"
        open={settingVisible}
        onClose={closeSetting}
      />
    </>
  );
};
