import React from "react";
import { NodeProps, useUpdateNodeInternals } from "reactflow";
import { debounce } from "lodash";
import { useField } from "../contexts";
import { FieldSourceHandle } from "./FieldSourceHandle";
import { FieldTargetHandle } from "./FieldTargetHandle";
import "./BaseNode.scss";
import "./FieldNode.scss";

export const FieldNode = (props: NodeProps) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const { activeSourceHandles, activeTargetHandles } = useField();
  const isSource = props.data.type === "source";
  const data = isSource ? activeSourceHandles : activeTargetHandles;

  const handleWheel = debounce(() => {
    updateNodeInternals(props.id);
  }, 100);

  return (
    <div className="base-node field-node nodrag nowheel" onWheel={() => handleWheel()}>
      <div className="content-container">
        <div
          className={
            isSource ? "handle-container scroll-shadow handle-container-source" : "handle-container scroll-shadow"
          }
        >
          {data?.map((node) => (
            <React.Fragment key={node.id}>
              {node.data.isField && node.data.type === "output" ? (
                <FieldTargetHandle {...node} />
              ) : (
                <FieldSourceHandle {...node} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
