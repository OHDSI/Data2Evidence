import React, { FC } from "react";

import Dashboard from "../Dashboard/Dashboard";
import DataDensity from "../DataDensity/DataDensity";

import "./DataCharacterization.scss";

interface DataCharacterizationProps {
  flowRunId: string;
  datasetId: string;
}

const DataCharacterization: FC<DataCharacterizationProps> = ({ flowRunId, datasetId }) => {
  return (
    <>
      <Dashboard flowRunId={flowRunId} datasetId={datasetId} />
      <DataDensity flowRunId={flowRunId} datasetId={datasetId} />
    </>
  );
};

export default DataCharacterization;
