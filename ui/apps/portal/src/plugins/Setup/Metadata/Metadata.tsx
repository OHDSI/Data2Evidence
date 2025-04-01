import React, { FC } from "react";
import AttributeTable from "./AttributeTable/AttributeTable";
import TagTable from "./TagTable/TagTable";
import "./Metadata.scss";

interface MetadataProps {}

export const Metadata: FC<MetadataProps> = () => {
  return (
    <div className="metadata_setup">
      <div className="metadata_setup__content">
        <AttributeTable />
        <TagTable />
      </div>
    </div>
  );
};
