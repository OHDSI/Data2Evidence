import React, { FC } from "react";
import "./NifiRegistry.scss";

const NIFI_REGISTRY_URL = "nifi-registry/";

const NifiRegistry: FC = () => {
  return (
    <div className="registry__container">
      <iframe title="Nifi Registry" src={NIFI_REGISTRY_URL} frameBorder="0" width="100%" height="100%" />
    </div>
  );
};

export default NifiRegistry;
