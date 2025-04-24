import React, { FC } from "react";

import ChartContainer from "../../../Common/ChartContainer";
import LineChart from "../../../Common/LineChart";

import "./DataDensityRecordsPerPersonChart.scss";
import { useTranslation } from "../../../../../contexts";

interface DataDensityRecordsPerPersonChartProps {
  data: any;
}

const DataDensityRecordsPerPersonChart: FC<DataDensityRecordsPerPersonChartProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();

  const title = getText(i18nKeys.DATA_DENSITY_RECORDS_PER_PERSON_CHART__TITLE);
  const xAxisName = getText(i18nKeys.DATA_DENSITY_RECORDS_PER_PERSON_CHART__X_AXIS_NAME);
  const yAxisName = getText(i18nKeys.DATA_DENSITY_RECORDS_PER_PERSON_CHART__Y_AXIS_NAME);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.DATA_DENSITY_RECORDS_PER_PERSON_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  // Sort data based on X_CALENDAR_MONTH
  data = data.sort((a: any, b: any) => a["X_CALENDAR_MONTH"] - b["X_CALENDAR_MONTH"]);
  // Get list of all unique "SERIES_NAME" in dat
  const seriesList = [...new Set(data.map((obj: any) => obj["SERIES_NAME"]))];

  // Parse X_CALENDAR_MONTH from e.g 200910 -> 10/2009
  const lineChartXAxisData = [
    ...new Set(
      data.map(
        (obj: any) =>
          obj["X_CALENDAR_MONTH"].toString().slice(-2) + "/" + obj["X_CALENDAR_MONTH"].toString().slice(0, 4)
      )
    ),
  ];

  const series: any[] = [];

  for (const seriesName of seriesList) {
    series.push({
      name: seriesName,
      type: "line",
      emphasis: {
        focus: "series",
      },
      data: data.reduce((acc: Array<any>, obj: any) => {
        if (obj["SERIES_NAME"] === seriesName) {
          acc.push(Number(obj["Y_RECORD_COUNT"]).toFixed(4));
        }
        return acc;
      }, []),
    });
  }

  const extraChartConfigs = {
    legend: {
      data: seriesList,
    },
  };
  // const tooltipFormat = "Date: {b}<br />People: {c}";

  return (
    <div>
      <LineChart
        lineChartXAxisData={lineChartXAxisData}
        series={series}
        title={title}
        xAxisName={xAxisName}
        yAxisName={yAxisName}
        lineChartFormatConfig={{}}
        extraChartConfigs={extraChartConfigs}
      />
    </div>
  );
};

export default DataDensityRecordsPerPersonChart;
