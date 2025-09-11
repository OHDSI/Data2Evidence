import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { CohortSelectionDrawer } from "./CohortSelectionDrawer";
import { Cohort } from "./CohortSelectionType";

export interface CohortSelectionNodeData extends NodeDataState {
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
        renderChildren
        node={node}
      >
        <div style={{ padding: "8px 12px" }}>
          {data.cohorts && data.cohorts.length > 0 ? (
            data.cohorts.map((cohort, index) => (
              <div
                key={`${cohort.cohortId}-${index}`}
                style={{
                  display: "block",
                  fontSize: "14px",
                  lineHeight: 1.4,
                  padding: "10px 12px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  marginTop: index === 0 ? 0 : 8,
                  background: "#ffffff",
                }}
              >
                <div
                  style={{ display: "flex", gap: 12, alignItems: "baseline" }}
                >
                  <span>
                    <strong>Id:</strong> {cohort.cohortId}
                  </span>
                  <span>
                    <strong>Name:</strong> {cohort.cohortName}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: "14px", color: "#777" }}>
              No cohorts selected
            </div>
          )}
        </div>
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
