import React from "react";
import { NodeProps } from "reactflow";
import { useBooleanHelper } from "~/features/flow/hooks";
import { NodeDataState } from "../../../../types";
import { NodeLayout } from "../../NodeLayout/NodeLayout";
import { ResultsDrawer } from "../../../Flow/FlowRunResults/ResultsDrawer";
import { ConceptMappingDrawer } from "./ConceptMappingDrawer";
import { SourceHandle } from "../../CustomHandle/CustomHandle";
import { HandleIOType } from "../type";
import "./ConceptMappingNode.scss";

export interface ConceptMappingNodeData extends NodeDataState {
  data: any;
}

export const ConceptMappingNode = (node: NodeProps<ConceptMappingNodeData>) => {
  const { data } = node;
  const [settingVisible, openSetting, closeSetting] = useBooleanHelper(false);
  const [resultVisible, openResult, closeResult] = useBooleanHelper(false);

  return (
    <>
      <NodeLayout<ConceptMappingNodeData>
        className="concept-mapping-node"
        name={data.name}
        onSettingClick={openSetting}
        resultType={data.error ? "error" : "success"}
        onResultClick={data.result ? openResult : null}
        node={node}
        // Input handle removed for now — connecting an upstream SQL/Python output node is
        // disabled (CSV upload is the only supported source); Step 1's connect-node card is
        // greyed out to match. `null` (not omitted) so NodeLayout renders no handle rather
        // than falling back to its "default" one.
        LeftHandle={null}
        RightHandle={
          <SourceHandle ioType={HandleIOType.Dataframe} nodeId={node.id} />
        }
      >
        {data.description}
      </NodeLayout>
      <ConceptMappingDrawer
        node={node}
        title="Configure Concept Mapping"
        className="concept-mapping-drawer"
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
