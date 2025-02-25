import React, { FC, useEffect, useState, useCallback } from "react";

import { api } from "../../../../axios/api";

import { Loader } from "@portal/components";

import BoxPlotChart from "../../Common/BoxPlotChart";
import DataDensityRecordsPerPersonChart from "../../SourceKeys/DataDensity/DataDensityRecordsPerPersonChart/DataDensityRecordsPerPersonChart";
import DataDensityTotalRecordsChart from "../../SourceKeys/DataDensity/DataDensityTotalRecordsChart/DataDensityTotalRecordsChart";

import { DATA_DENSITY_REPORT_TYPE, WEBAPI_CDMRESULTS_SOURCE_KEYS } from "../../../DQD/types";
import "./DataDensity.scss";
import { useTranslation } from "../../../../contexts";

interface DataDensityProps {
  flowRunId: string;
  datasetId: string;
}

const DataDensity: FC<DataDensityProps> = ({ flowRunId, datasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [dataDensityData, setDataDensityData] = useState<DATA_DENSITY_REPORT_TYPE>({
    totalRecords: [],
    recordsPerPerson: [],
    conceptsPerPerson: [],
  });
  const [isloadingDataDensityData, setIsLoadingDataDensityData] = useState(true);
  const [errDataDensity, setErrDataDensity] = useState("");

  const getDataDensityData = useCallback(async () => {
    setIsLoadingDataDensityData(true);
    try {
      const result = await api.dataflow.getDataCharacterizationResults(
        flowRunId,
        WEBAPI_CDMRESULTS_SOURCE_KEYS.DATA_DENSITY,
        datasetId
      );
      setDataDensityData(result as DATA_DENSITY_REPORT_TYPE);
      setIsLoadingDataDensityData(false);
      setErrDataDensity("");
    } catch (error) {
      console.error(error);
      setIsLoadingDataDensityData(false);
      setErrDataDensity(getText(i18nKeys.DATA_DENSITY__ERROR_MESSAGE));
    }
  }, [flowRunId, getText, datasetId]);

  useEffect(() => {
    // Fetch data for charts
    getDataDensityData();
  }, [getDataDensityData]);

  return (
    <>
      {isloadingDataDensityData ? (
        <Loader text={getText(i18nKeys.DATA_DENSITY__LOADER)} />
      ) : errDataDensity ? (
        <div className="info__section">{errDataDensity}</div>
      ) : (
        <>
          <DataDensityTotalRecordsChart data={dataDensityData.totalRecords} />
          <DataDensityRecordsPerPersonChart data={dataDensityData.recordsPerPerson} />
          <BoxPlotChart
            data={dataDensityData.conceptsPerPerson}
            title={getText(i18nKeys.DATA_DENSITY__BOX_PLOT_TITLE)}
            xAxisName={getText(i18nKeys.DATA_DENSITY__BOX_PLOT_X_AXIS_NAME)}
            yAxisName={getText(i18nKeys.DATA_DENSITY__BOX_PLOT_Y_AXIS_NAME)}
          />
        </>
      )}
    </>
  );
};

export default DataDensity;
