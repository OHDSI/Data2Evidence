import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { HandleIOType } from "../type";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { SourceHandle, TargetHandle } from "../../CustomHandle/CustomHandle";
import { Py2TableDrawer } from "./Py2TableDrawer";
import "./Py2TableNode.scss";

export interface SourceToTableMap {
  source: string;
  path: string;
}

export interface Py2TableNodeData extends NodeDataState {
  map: { [key: string]: string[] };
  uiMap: SourceToTableMap;
}

export const Py2TableNode = (node: NodeProps<Py2TableNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<Py2TableNodeData>
        className="py2table-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={
          <TargetHandle nodeId={node.id} ioType={HandleIOType.Object} />
        }
        RightHandle={
          <SourceHandle nodeId={node.id} ioType={HandleIOType.Dataframe} />
        }
      >
        {data.description}
      </NodeLayout>
      <Py2TableDrawer
        node={node}
        title="Configure Python To Table Mapping"
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
