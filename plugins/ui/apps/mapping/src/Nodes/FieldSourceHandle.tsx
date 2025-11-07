import { MappingHandle, MappingHandleProps } from "./MappingHandle";
import "./FieldSourceHandle.scss";

interface FieldSourceHandleProps extends MappingHandleProps {}

export const FieldSourceHandle = (props: FieldSourceHandleProps) => {
  return (
    <>
      <MappingHandle {...props} className="field-source-handle">
        <div className="field-source-handle__content">
          <div className="field-source-handle__label">{props.data.label}</div>
          <div className="field-source-handle__column-type">{props.data.columnType}</div>
        </div>
      </MappingHandle>
    </>
  );
};
