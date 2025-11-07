import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { CalendarTimeCovariateSettingsDrawer } from "./CalendarTimeCovariateSettingsDrawer";
import "./CalendarTimeCovariateSettingsNode.scss";

export interface CalendarTimeCovariateSettingsNodeData extends NodeDataState {
  caldendarTimeKnots: number;
  allowRegularization: boolean;
  computeConfidenceIntervals: boolean;
}

export const CalendarTimeCovariateSettingsNode = (
  node: NodeProps<CalendarTimeCovariateSettingsNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<CalendarTimeCovariateSettingsNodeData>
        className="calendar-time-covariate-settings-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
      >
        {data.description}
      </NodeLayout>
      <CalendarTimeCovariateSettingsDrawer
        node={node}
        title="Configure CalendarTimeCovariateSettings Node"
        className="calendar-time-covariate-settings-drawer"
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
