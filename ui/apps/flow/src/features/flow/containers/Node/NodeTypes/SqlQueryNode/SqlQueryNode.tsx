import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { SqlQueryDrawer } from "./SqlQueryDrawer";
import "./SqlQueryNode.scss";

export interface SqlQueryNodeData extends NodeDataState {
  database: string;
  sqlquery: string;
  params: { [key: string]: any };
  is_select: boolean;
  testsqlquery: string;
}

export const SqlQueryNode = (node: NodeProps<SqlQueryNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<SqlQueryNodeData>
        className="sql-query-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={null}
      >
        {data.description}
      </NodeLayout>
      <SqlQueryDrawer
        node={node}
        title="Configure SQL query"
        className="sql-query-drawer"
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
