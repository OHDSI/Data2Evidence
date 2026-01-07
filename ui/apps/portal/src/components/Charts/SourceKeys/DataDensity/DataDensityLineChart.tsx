import React, { FC } from "react";

import ChartContainer from "../../Common/ChartContainer";
import LineChart from "../../Common/LineChart";
import { useTranslation } from "../../../../contexts";
import { generateAllMonths } from "../../util";

interface DataDensityLineChartProps {
  data: any;
  titleKey: string;
  xAxisNameKey: string;
  yAxisNameKey: string;
  noDataKey: string;
  valueFormatter?: (value: number) => number | string;
}

const DataDensityLineChart: FC<DataDensityLineChartProps> = ({
  data,
  titleKey,
  xAxisNameKey,
  yAxisNameKey,
  noDataKey,
  valueFormatter = (v) => v,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const title = getText(i18nKeys[titleKey as keyof typeof i18nKeys]);
  const xAxisName = getText(i18nKeys[xAxisNameKey as keyof typeof i18nKeys]);
  const yAxisName = getText(i18nKeys[yAxisNameKey as keyof typeof i18nKeys]);

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys[noDataKey as keyof typeof i18nKeys])}</div>
      </ChartContainer>
    );
  }

  // Get list of all unique "SERIESNAME" in data
  const seriesList = [...new Set(data.map((obj: any) => obj["SERIESNAME"]))];

  // Get min and max months from data
  // XCALENDARMONTH format is YYYYMM
  const months = data.map((obj: any) => obj["XCALENDARMONTH"].toString());
  const minMonth = months.reduce((a: string, b: string) => (a < b ? a : b));
  const maxMonth = months.reduce((a: string, b: string) => (a > b ? a : b));

  const allMonths = generateAllMonths(minMonth, maxMonth);

  // Parse XCALENDARMONTH from e.g 200910 -> 10/2009
  const lineChartXAxisData = allMonths.map((month: string) => month.slice(-2) + "/" + month.slice(0, 4));

  const series: any[] = [];

  for (const seriesName of seriesList) {
    // Create a map of month -> record count for this series
    const monthToCount = new Map(
      data
        .filter((obj: any) => obj["SERIESNAME"] === seriesName)
        .map((obj: any) => [obj["XCALENDARMONTH"].toString(), valueFormatter(Number(obj["YRECORDCOUNT"]))])
    );

    series.push({
      name: seriesName,
      type: "line",
      emphasis: {
        focus: "series",
      },
      connectNulls: false,
      symbolSize: 1,
      showAllSymbol: true,
      clip: false,
      // Align data to all months, using null for missing values
      data: allMonths.map((month: any) => monthToCount.get(month) ?? null),
    });
  }

  const extraChartConfigs = {
    legend: {
      data: seriesList,
    },
  };

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

export default DataDensityLineChart;
