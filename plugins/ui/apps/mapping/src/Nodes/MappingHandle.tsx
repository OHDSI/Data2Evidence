import { ReactNode } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import classNames from "classnames";
import "./MappingHandle.scss";

export interface MappingHandleProps extends Partial<NodeProps> {
  children?: ReactNode;
  className?: string;
}

export const MappingHandle = ({
  children,
  className,
  ...props
}: MappingHandleProps) => {
  const { label, type, tableName, isField } = props.data;
  const isInput = type === "input";

  return (
    <div
      className={classNames(
        "mapping-handle",
        { "mapping-handle__input": isInput },
        { "mapping-handle__output": !isInput },
        { [`${className}`]: !!className }
      )}
    >
      <div className="mapping-handle__header">
        {!children ? label : children}
      </div>
      <Handle
        id={isField ? `${tableName}-${label}` : label}
        type={isInput ? "source" : "target"}
        position={isInput ? Position.Right : Position.Left}
      />
    </div>
  );
};
