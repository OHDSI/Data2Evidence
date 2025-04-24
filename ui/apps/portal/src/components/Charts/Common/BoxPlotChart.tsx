import React, { FC } from "react";

import ReactECharts from "echarts-for-react";
import ChartContainer from "./ChartContainer";
import "./BoxPlotChart.scss";
import { useTranslation } from "../../../contexts";

interface BoxPlotChartProps {
  data: any[];
  title: string;
  xAxisName: string;
  yAxisName: string;
  extraChartConfigs?: any;
}

const BoxPlotChart: FC<BoxPlotChartProps> = ({ data, title, xAxisName, yAxisName, extraChartConfigs }) => {
  const { getText, i18nKeys } = useTranslation();
  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.BOX_PLOT_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  const option = {
    dataset: [
      {
        id: "data",
        source: data,
      },
    ],
    grid: { containLabel: true },
    toolbox: {
      show: true,
      feature: {
        dataView: { readOnly: false },
        saveAsImage: {},
        restore: {},
      },
    },
    tooltip: {
      trigger: "item",
      formatter: function (params: any) {
        return `
        Max: ${params.data["MAX_VALUE"]} <br />
        P90: ${params.data["P90_VALUE"]} <br />
        P75: ${params.data["P75_VALUE"]} <br />
        Median: ${params.data["MEDIAN_VALUE"]} <br />
        P25: ${params.data["P25_VALUE"]} <br />
        P10: ${params.data["P10_VALUE"]} <br />
        Min: ${params.data["MIN_VALUE"]} <br />
        `;
      },
      confine: true,
    },
    xAxis: {
      type: "category",
      name: xAxisName,
      nameLocation: "middle",
      nameGap: 25,
      axisLabel: {
        interval: 0,
      },
      nameTextStyle: {
        fontSize: 14,
        fontWeight: "bold",
      },
    },
    yAxis: {
      name: yAxisName,
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: {
        fontSize: 14,
        fontWeight: "bold",
      },
    },
    series: [
      {
        name: "boxplot",
        type: "boxplot",
        datasetId: "data",
        itemStyle: {
          color: "#b8c5f2",
        },
        encode: {
          x: "CATEGORY",
          y: ["MIN_VALUE", "P25_VALUE", "MEDIAN_VALUE", "P75_VALUE", "MAX_VALUE"],
          itemName: ["CATEGORY"],
          tooltip: ["MIN_VALUE", "P10_VALUE", "P25_VALUE", "MEDIAN_VALUE", "P75_VALUE", "P90_VALUE", "MAX_VALUE"],
        },
      },
    ],
    ...(extraChartConfigs && { ...extraChartConfigs }),
  };

  return (
    <ChartContainer title={title}>
      <ReactECharts
        style={{
          height: "100%",
          minHeight: 400,
          width: "100%",
        }}
        option={option}
      />
    </ChartContainer>
  );
};

export default BoxPlotChart;
