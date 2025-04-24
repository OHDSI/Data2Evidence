import React, { FC, useEffect, useState, useCallback } from "react";

import { api } from "../../../../axios/api";
import { Loader } from "@portal/components";

import PieChart from "../../Common/PieChart";
import BarChart from "../../Common/BarChart";

import { parsePieChartData, parseBarChartData } from "../../util";

import { PERSON_REPORT_TYPE, WEBAPI_CDMRESULTS_SOURCE_KEYS } from "../../../DQD/types";
import "./Person.scss";
import { useTranslation } from "../../../../contexts";

interface PersonProps {
  flowRunId: string;
  datasetId: string;
}

const Person: FC<PersonProps> = ({ flowRunId, datasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [personData, setPersonData] = useState<PERSON_REPORT_TYPE>({
    population: [],
    gender: [],
    race: [],
    ethnicity: [],
    yearOfBirthData: [],
    yearOfBirthStats: [],
  });
  const [isloadingPersonData, setIsLoadingPersonData] = useState(true);
  const [errPerson, setErrPerson] = useState("");

  const getPersonData = useCallback(async () => {
    setIsLoadingPersonData(true);
    try {
      const result = await api.dataflow.getDataCharacterizationResults(
        flowRunId,
        WEBAPI_CDMRESULTS_SOURCE_KEYS.PERSON,
        datasetId
      );
      setPersonData(result as PERSON_REPORT_TYPE);
      setIsLoadingPersonData(false);
      setErrPerson("");
    } catch (error) {
      console.error(error);
      setIsLoadingPersonData(false);
      setErrPerson(getText(i18nKeys.PERSON__ERROR_MESSAGE));
    }
  }, [flowRunId, getText, datasetId]);

  useEffect(() => {
    // Fetch data for charts
    getPersonData();
  }, [getPersonData]);

  return (
    <>
      {isloadingPersonData ? (
        <Loader text={getText(i18nKeys.PERSON__LOADER)} />
      ) : errPerson ? (
        <div className="info__section">{errPerson}</div>
      ) : (
        <>
          <BarChart
            barChartData={parseBarChartData(personData.yearOfBirthData, personData.yearOfBirthStats[0].MINVALUE)}
            title={getText(i18nKeys.PERSON__BAR_CHART_TITLE)}
            xAxisName={getText(i18nKeys.PERSON__BAR_CHART_X_AXIS_NAME)}
            yAxisName={getText(i18nKeys.PERSON__BAR_CHART_Y_AXIS_NAME)}
            tooltipFormat={getText(i18nKeys.PERSON__BAR_CHART_TOOLTIP_FORMAT)}
          />
          <div className="chart__container">
            <PieChart data={parsePieChartData(personData.gender)} title={getText(i18nKeys.PERSON__PIE_CHART_1_TITLE)} />
            <PieChart data={parsePieChartData(personData.race)} title={getText(i18nKeys.PERSON__PIE_CHART_2_TITLE)} />
            <PieChart
              data={parsePieChartData(personData.ethnicity)}
              title={getText(i18nKeys.PERSON__PIE_CHART_3_TITLE)}
            />
          </div>
        </>
      )}
    </>
  );
};

export default Person;
