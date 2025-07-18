import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { TargetHandle, SourceHandle } from "../../CustomHandle/CustomHandle";
import { HandleIOType } from "../type";
import { WhiteRabbitDrawer } from "./WhiteRabbitDrawer";

export interface TableSchemaState {
  table_name: string;
  column_list: ColumnSchemaState[];
}

export interface ColumnSchemaState {
  column_name: string;
  column_type: string;
  is_column_nullable?: string;
}

export interface TableSourceHandleData {
  label: string;
  type: "input";
}

export type TableSourceState = NodeProps<TableSourceHandleData>;

export interface WhiteRabbitNodeData extends NodeDataState {
  scannedSchema: {
    etl_mapping: {
      id: number;
      scan_report_id: number;
      scan_report_name: string;
      source_schema_name: string;
      cdm_version: string;
      username: string;
    };
    source_tables: TableSchemaState[];
  };
  sourceHandles: TableSourceState[];
}

export const WhiteRabbitNode = (node: NodeProps<WhiteRabbitNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<WhiteRabbitNodeData>
        className="white-rabbit-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={null}
        RightHandle={
          <SourceHandle nodeId={node.id} ioType={HandleIOType.Object} />
        }
      >
        {data.description}
      </NodeLayout>
      <WhiteRabbitDrawer
        node={node}
        title="Configure White Rabbit"
        className="white-rabbit-drawer"
        open={settingVisible}
        onClose={closeSetting}
      />
      <ResultsDrawer
        open={resultVisible}
        onClose={closeResult}
        title={data.name}
        error={data.error}
        message={data.errorMessage || data.result}
        createdDate={data.resultDate}
      />
    </>
  );
};
