import React, { FC } from "react";
import ChartContainer from "../../../Common/ChartContainer";
import LineChart, { LineSeries } from "../../../Common/LineChart";
import { DomainContinuity } from "../../../../DQD/types";
import { useTranslation } from "../../../../../contexts";

interface DomainContinuityChartProps {
  data: DomainContinuity;
}

const DomainContinuityChart: FC<DomainContinuityChartProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();
  const title = data.domain;
  const xAxisName = getText(i18nKeys.DOMAIN_CONTINUITY_CHART__X_AXIS_NAME);
  const yAxisName = getText(i18nKeys.DOMAIN_CONTINUITY_CHART__Y_AXIS_NAME);
  const records = data.records;

  if (records.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.DOMAIN_CONTINUITY_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  const xAxisData = records.map((record) => record.cdmReleaseDate);

  const series: LineSeries[] = [
    {
      type: "line",
      data: records.map((record) => record.count),
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

export default DomainContinuityChart;
