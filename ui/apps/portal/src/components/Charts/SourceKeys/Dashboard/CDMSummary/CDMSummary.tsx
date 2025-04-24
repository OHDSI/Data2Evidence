import React from "react";

import ChartContainer from "../../../Common/ChartContainer";
import "./CDMSummary.scss";
import { useTranslation } from "../../../../../contexts";

interface CDMSummaryProps {
  data: any;
}

function CDMSummary({ data }: CDMSummaryProps) {
  const { getText, i18nKeys } = useTranslation();
  const title = getText(i18nKeys.CDM_SUMMARY__TITLE);

  if (data.length === 0) {
    return (
      <ChartContainer title={title} className="cdm-summary">
        <div className="no_data_text">{getText(i18nKeys.CDM_SUMMARY__NO_DATA)}</div>
      </ChartContainer>
    );
  }
  // Extract source name and number of persons from data
  const sourceName = data.filter((obj: any) => obj["ATTRIBUTE_NAME"] === "Source name")[0]["ATTRIBUTE_VALUE"];
  const numberOfPersons = data.filter((obj: any) => obj["ATTRIBUTE_NAME"] === "Number of persons")[0][
    "ATTRIBUTE_VALUE"
  ];

  return (
    <ChartContainer title={title} className="cdm-summary">
      <p>
        {getText(i18nKeys.CDM_SUMMARY__SOURCE_NAME)}: {sourceName}
      </p>
      <p>
        {getText(i18nKeys.CDM_SUMMARY__NUMBER_OF_PERSONS)}: {numberOfPersons}
      </p>
    </ChartContainer>
  );
}

export default CDMSummary;
