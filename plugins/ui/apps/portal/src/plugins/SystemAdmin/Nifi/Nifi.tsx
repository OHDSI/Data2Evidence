import React, { FC } from "react";
import "./Nifi.scss";

const NIFI_URL = "nifi/";

export const Nifi: FC = () => {
  return (
    <div className="nifi__container">
      <iframe title="Nifi" src={NIFI_URL} frameBorder="0" width="100%" height="100%" />
    </div>
  );
};
