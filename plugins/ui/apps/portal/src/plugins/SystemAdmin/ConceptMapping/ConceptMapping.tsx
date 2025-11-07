import React, { FC } from "react";
import Overview from "./Overview/Overview";
import { ConceptMappingProvider } from "./Context/ConceptMappingContext";
import "./ConceptMapping.scss";

const ConceptMapping: FC = () => {
  return (
    <ConceptMappingProvider>
      <div className="conceptmapping__container">
        <Overview />
      </div>
    </ConceptMappingProvider>
  );
};

export default ConceptMapping;
