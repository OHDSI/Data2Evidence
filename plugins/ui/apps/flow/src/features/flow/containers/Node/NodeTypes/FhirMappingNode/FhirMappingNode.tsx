import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { HandleIOType } from "../type";
import { FhirMappingDrawer } from "./FhirMappingDrawer";
import { TargetHandle } from "../../CustomHandle/CustomHandle";

export interface FhirMappingNodeData extends NodeDataState {
  database_code: string;
  schema_name: string;
  omop_table_name: string;
  fhir_resource_type: string;
  write_key_map: boolean;
  source_value_col?: string;
}

export const FhirMappingNode = (
  node: NodeProps<FhirMappingNodeData>
) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<FhirMappingNodeData>
        className="db-writer-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        LeftHandle={
          <TargetHandle ioType={HandleIOType.Any} nodeId={node.id} />
        }
        RightHandle={null}
      >
        {data.description}
      </NodeLayout>
      <FhirMappingDrawer
        node={node}
        title="Configure FHIR Mapping Writer"
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
