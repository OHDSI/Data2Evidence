import React, { FC } from "react";

import ReactECharts from "echarts-for-react";
import { LineChartFormatConfig } from "../../../plugins/SystemAdmin/DQD/types";
import ChartContainer from "./ChartContainer";
import { chartColors } from "./chartColors";
import ZoomPlusIcon from "./icons/zoom-plus.svg";
import "./LineChart.scss";
import { getAxisNameGap, createTooltipFormatter } from "../util";

interface LineChartProps {
  lineChartXAxisData: any[];
  series: any[];
  title: string;
  xAxisName: string;
  yAxisName: string;
  lineChartFormatConfig?: LineChartFormatConfig;
  extraChartConfigs?: any;
  axisBaseGap?: number;
}

export interface LineSeries {
  name?: string;
  type: "line";
  emphasis?: {
    focus: string;
  };
  data: any;
}

const LineChart: FC<LineChartProps> = ({
  lineChartXAxisData,
  series,
  title,
  xAxisName,
  yAxisName,
  lineChartFormatConfig,
  extraChartConfigs,
  axisBaseGap,
}) => {
  const yAxisNameGap = getAxisNameGap(series, lineChartFormatConfig?.yAxisFormat, axisBaseGap);
  const option = {
    grid: {
      containLabel: true,
    },

    tooltip: {
      trigger: "axis",
      formatter:
        typeof lineChartFormatConfig?.tooltipFormat === "string"
          ? createTooltipFormatter(lineChartFormatConfig.tooltipFormat)
          : lineChartFormatConfig?.tooltipFormat,
      axisPointer: {
        type: "cross",
      },
    },
    toolbox: {
      show: true,
      top: "bottom",
      feature: {
        dataZoom: {
          yAxisIndex: "none",
          icon: {
            zoom: `image://${ZoomPlusIcon}`,
          },
        },
        dataView: { readOnly: true },
        magicType: { type: ["line", "bar"] },
        restore: {},
        saveAsImage: {},
      },
    },
    xAxis: {
      name: xAxisName,
      nameLocation: "middle",
      nameGap: 25,
      nameTextStyle: {
        fontSize: 14,
        fontWeight: "bold",
      },
      boundaryGap: true,
      axisTick: {
        alignWithLabel: true,
      },
      type: "category",
      data: lineChartXAxisData,
      axisLabel: {
        formatter: lineChartFormatConfig?.xAxisFormat,
      },
    },
    yAxis: {
      name: yAxisName,
      nameLocation: "middle",
      nameGap: yAxisNameGap,
      nameTextStyle: {
        fontSize: 14,
        fontWeight: "bold",
      },
      type: "value",
      axisLabel: {
        formatter: lineChartFormatConfig?.yAxisFormat,
      },
    },
    series: series,
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

export default LineChart;
