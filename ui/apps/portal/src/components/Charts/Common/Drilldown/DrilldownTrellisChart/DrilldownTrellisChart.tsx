import React, { FC } from "react";
import ChartContainer from "../../ChartContainer";
import TrellisChart from "../../TrellisChart";

import "./DrilldownTrellisChart.scss";
import { groupBy } from "lodash";
import { useTranslation } from "../../../../../contexts";

interface DrilldownTrellisChartProps {
  data: any;
  trellisXAxisKey?: string;
  maxPlotsPerRow?: number;
}

const DrilldownTrellisChart: FC<DrilldownTrellisChartProps> = ({
  data,
  trellisXAxisKey = "YPREVALENCE1000PP",
  maxPlotsPerRow = 5,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const title = getText(i18nKeys.DRILLDOWN_TRELLIS_CHART__TITLE);
  const trellisTopLabel = getText(i18nKeys.DRILLDOWN_TRELLIS_CHART__TRELLIS_TOP_LABEL);
  const trellisBottomLabel = getText(i18nKeys.DRILLDOWN_TRELLIS_CHART__TRELLIS_BOTTOM_LABEL);

  const series: any[] = [];
  const grid: any[] = [];
  const gridTitles: any[] = [];
  const xAxis: any[] = [];
  const yAxis: any[] = [];

  if (data.length === 0) {
    return (
      <ChartContainer title={title}>
        <div className="no_data_text">{getText(i18nKeys.DRILLDOWN_TRELLIS_CHART__NO_DATA)}</div>
      </ChartContainer>
    );
  }

  // Group by trellis name -> parallel line chart
  const trellisData = groupBy(data, (obj: any) => obj.TRELLISNAME);

  // Calculate dimensions for multi-row layout
  const totalPlots = Object.keys(trellisData).length;
  const plotsPerRow = Math.min(maxPlotsPerRow, totalPlots);
  const numRows = Math.ceil(totalPlots / plotsPerRow);

  const GRID_WIDTH = 90 / plotsPerRow;
  const GRID_GAP = 5 / plotsPerRow;
  const GRID_LEFT_MARGIN = 5;
  const GRID_HEIGHT = 60 / numRows;
  const GRID_TOP_MARGIN = 8;
  const GRID_VERTICAL_GAP = 30 / numRows;

  // Get keys from trellisData sorted
  const sortedTrellisNames = Object.keys(trellisData).sort();

  // Calculate global y-axis range for harmonization across all plots
  const allYValues = data.map((obj: any) => Number(obj[trellisXAxisKey])).filter((v: number) => !isNaN(v));
  const globalYMin = Math.min(...allYValues);
  const globalYMax = Math.max(...allYValues);

  for (const [index, trellisName] of sortedTrellisNames.entries()) {
    let seriesData = trellisData[trellisName];

    // Calculate row and column position
    const rowIndex = Math.floor(index / plotsPerRow);
    const colIndex = index % plotsPerRow;

    // Add top and bottom labels for each row (only once per row, when colIndex === 0)
    if (colIndex === 0) {
      const rowTop = rowIndex * (GRID_HEIGHT + GRID_VERTICAL_GAP) + GRID_TOP_MARGIN;
      // Top label for this row (positioned above trellis names)
      gridTitles.push({
        text: trellisTopLabel,
        top: `${rowTop - 5}%`,
        left: "center",
        textStyle: {
          fontSize: 14,
          color: "#6b6b6bff", // color to match Echart's default axis label color
        },
      });
      // Bottom label for this row (positioned below x-axis labels)
      gridTitles.push({
        text: trellisBottomLabel,
        top: `${rowTop + GRID_HEIGHT + 2}%`,
        left: "center",
        textStyle: {
          fontSize: 14,
          color: "#6b6b6bff",
        },
      });
    }

    grid.push({
      show: true,
      width: `${GRID_WIDTH}%`,
      height: `${GRID_HEIGHT}%`,
      left: `${colIndex * (GRID_WIDTH + GRID_GAP) + GRID_LEFT_MARGIN}%`,
      top: `${rowIndex * (GRID_HEIGHT + GRID_VERTICAL_GAP) + GRID_TOP_MARGIN}%`,
      borderColor: "black",
      borderWidth: 1,
      containLabel: true,
    });
    gridTitles.push({
      textAlign: "center",
      text: trellisName,
      top: `${rowIndex * (GRID_HEIGHT + GRID_VERTICAL_GAP) + GRID_TOP_MARGIN - 2}%`,
      left: `${colIndex * (GRID_WIDTH + GRID_GAP) + GRID_WIDTH / 2 + GRID_LEFT_MARGIN}%`,
      textStyle: {
        fontWeight: "normal",
        fontSize: 14,
      },
    });

    // Sort seriesData based on XCALENDARYEAR
    seriesData = seriesData.sort((a: any, b: any) => a["XCALENDARYEAR"] - b["XCALENDARYEAR"]);
    // Get list of all unique "SERIESNAME" in dat
    const seriesList = [...new Set(seriesData.map((obj: any) => obj["SERIESNAME"]))];
    const lineChartXAxisData = [...new Set(seriesData.map((obj: any) => obj["XCALENDARYEAR"]))];

    for (const seriesName of seriesList) {
      series.push({
        name: seriesName,
        type: "line",
        emphasis: {
          focus: "series",
        },
        label: {
          show: true,
          position: "top",
        },
        xAxisIndex: index,
        yAxisIndex: index,
        data: seriesData.reduce((acc: Array<any>, obj: any) => {
          if (obj["SERIESNAME"] === seriesName) {
            acc.push(Number(obj[trellisXAxisKey]).toFixed(2));
          }
          return acc;
        }, []),
      });
    }
    xAxis.push({
      axisTick: {
        show: false,
      },
      splitLine: {
        show: true,
      },
      axisLabel: {
        show: true,
      },
      gridIndex: index,
      position: "bottom",
      data: lineChartXAxisData,
    });
    yAxis.push({
      axisTick: {
        show: false,
      },
      splitLine: {
        show: true,
      },
      gridIndex: index,
      min: globalYMin,
      max: globalYMax,
      // Only show y axis label for leftmost chart in each row
      axisLabel: {
        show: colIndex === 0,
      },
      // Only show y axis name for leftmost chart in each row
      ...(colIndex === 0 && {
        name: getText(i18nKeys.DRILLDOWN_TRELLIS_CHART__Y_AXIS_PREVALENCE_PER_1000_PEOPLE),
        nameLocation: "middle",
        nameGap: 50,
        position: "left",
        nameTextStyle: {
          fontSize: 14,
          fontWeight: "bold",
        },
      }),
    });
  }

  return (
    <TrellisChart
      series={series}
      grid={grid}
      gridTitles={gridTitles}
      title={title}
      xAxis={xAxis}
      yAxis={yAxis}
      numRows={numRows}
    />
  );
};

export default DrilldownTrellisChart;
