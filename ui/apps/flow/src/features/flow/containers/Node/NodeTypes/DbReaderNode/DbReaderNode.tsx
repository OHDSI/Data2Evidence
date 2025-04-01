import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { HandleIOType } from "../type";
import { DbReaderDrawer } from "./DbReaderDrawer";
import { SourceHandle } from "../../CustomHandle/CustomHandle";
import "./DbReaderNode.scss";

export interface DbReaderNodeData extends NodeDataState {
  database: string;
  sqlquery: string;
  columns: string[];
  testdata: (string | number | boolean | Date)[][];
}

export const DbReaderNode = (node: NodeProps<DbReaderNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<DbReaderNodeData>
        className="db-reader-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={null}
        RightHandle={
          <SourceHandle ioType={HandleIOType.Dataframe} nodeId={node.id} />
        }
      >
        {data.description}
      </NodeLayout>
      <DbReaderDrawer
        node={node}
        title="Configure database reader"
        className="db-reader-drawer"
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
