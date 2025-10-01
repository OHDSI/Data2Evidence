import React, { FC } from "react";

import ReactECharts from "echarts-for-react";
import ChartContainer from "./ChartContainer";
import "./BoxPlotChart.scss";
import { useTranslation } from "../../../contexts";
import { chartColors } from "./chartColors";

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
        Max: ${params.data["MAXVALUE"]} <br />
        P90: ${params.data["P90VALUE"]} <br />
        P75: ${params.data["P75VALUE"]} <br />
        Median: ${params.data["MEDIANVALUE"]} <br />
        P25: ${params.data["P25VALUE"]} <br />
        P10: ${params.data["P10VALUE"]} <br />
        Min: ${params.data["MINVALUE"]} <br />
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
          y: ["MINVALUE", "P25VALUE", "MEDIANVALUE", "P75VALUE", "MAXVALUE"],
          itemName: ["CATEGORY"],
          tooltip: ["MINVALUE", "P10VALUE", "P25VALUE", "MEDIANVALUE", "P75VALUE", "P90VALUE", "MAXVALUE"],
        },
      },
    ],
    color: chartColors,
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
