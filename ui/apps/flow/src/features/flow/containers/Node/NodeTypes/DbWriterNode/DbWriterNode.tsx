import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { HandleIOType } from "../type";
import { DbWriterDrawer } from "./DbWriterDrawer";
import { TargetHandle } from "../../CustomHandle/CustomHandle";
import "./DbWriterNode.scss";

export interface DbWriterNodeData extends NodeDataState {
  database: string;
  dataframe: string[];
  dbtablename: string;
}

export const DbWriterNode = (node: NodeProps<DbWriterNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<DbWriterNodeData>
        className="db-writer-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={
          <TargetHandle ioType={HandleIOType.Dataframe} nodeId={node.id} />
        }
        RightHandle={null}
      >
        {data.description}
      </NodeLayout>
      <DbWriterDrawer
        node={node}
        title="Configure database writer"
        className="db-writer-drawer"
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
