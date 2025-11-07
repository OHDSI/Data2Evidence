import React, { FC } from "react";
import ChartContainer from "../../../Common/ChartContainer";
import LineChart, { LineSeries } from "../../../Common/LineChart";
import { HistoricalDataQuality } from "../../../../DQD/types";
import { useTranslation } from "../../../../../contexts";

interface HistoricalDataQualityChartProps {
  data: HistoricalDataQuality[];
}

const HistoricalDataQualityChart: FC<HistoricalDataQualityChartProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();
  const title = getText(i18nKeys.HISTORICAL_DATA_QUALITY_CHART__TITLE);
  const xAxisName = getText(i18nKeys.HISTORICAL_DATA_QUALITY_CHART__X_AXIS_NAME);
  const yAxisName = getText(i18nKeys.HISTORICAL_DATA_QUALITY_CHART__Y_AXIS_NAME);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.HISTORICAL_DATA_QUALITY_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  const xAxisData = data.map((record) => record.cdmReleaseDate);

  const series: LineSeries[] = [
    {
      type: "line",
      data: data.map((record) => record.failed),
    },
  ];

  return (
    <div>
      <LineChart
        lineChartXAxisData={xAxisData}
        series={series}
        title={title}
        xAxisName={xAxisName}
        yAxisName={yAxisName}
      />
    </div>
  );
};

export default HistoricalDataQualityChart;
