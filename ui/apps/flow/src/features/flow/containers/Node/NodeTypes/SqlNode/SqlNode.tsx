import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { HandleIOType } from "../type";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { SourceHandle, TargetHandle } from "../../CustomHandle/CustomHandle";
import { SqlDrawer } from "./SqlDrawer";
import "./SqlNode.scss";

export interface SourceToTableMap {
  source: string;
  path: string;
  tableName: string;
}

export interface SqlNodeData extends NodeDataState {
  tables: { [key: string]: string[] };
  uiTables: SourceToTableMap[];
  sql: string;
}

export const SqlNode = (node: NodeProps<SqlNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<SqlNodeData>
        className="sql-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={
          <TargetHandle nodeId={node.id} ioType={HandleIOType.Dataframe} />
        }
        RightHandle={
          <SourceHandle nodeId={node.id} ioType={HandleIOType.Dataframe} />
        }
      >
        {data.description}
      </NodeLayout>
      <SqlDrawer
        node={node}
        title="Configure SQL"
        className="sql-drawer"
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
