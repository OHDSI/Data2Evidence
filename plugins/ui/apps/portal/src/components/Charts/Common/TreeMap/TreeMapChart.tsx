import { FC, useState, useRef, useCallback } from "react";
import type { EChartsOption } from "echarts";

import ReactECharts from "echarts-for-react";
import "./TreeMapChart.scss";
import { useTranslation } from "../../../../contexts";
import { useTheme } from "@mui/material";

interface TreeMapChartProps {
  data: any[];
  title: string;
  setSelectedConcept: (value: { id: string; name: string } | null) => void;
  extraChartConfigs?: any;
  loading?: boolean;
}

const TreeMapChart: FC<TreeMapChartProps> = ({ data, title, setSelectedConcept, extraChartConfigs, loading }) => {
  const { getText, i18nKeys } = useTranslation();
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const chartRef = useRef<ReactECharts | null>(null);
  const theme = useTheme();
  const borderSelectedColor = theme.palette.custom.selectedRowBorder;

  // Create a unique key for each item
  const getItemKey = (item: any) => {
    return item.value?.[4] || item.name;
  };

  // Detect if records per person data is meaningful (not just placeholder values)
  // If all values are 1, it's likely a placeholder from simple format data
  const hasRecordsPerPerson = data.length > 0 && data.some((item) => item.value?.[1] !== 1);

  // Calculate min and max records per person from data (only needed if hasRecordsPerPerson)
  const recordsPerPersonValues = data.length > 0 ? data.map((item) => item.value?.[1] || 0) : [0, 100];
  const minRecordsPerPerson = Math.min(...recordsPerPersonValues);
  const maxRecordsPerPerson = Math.max(...recordsPerPersonValues);

  // Build styled data array based on selection and visualMap range
  const buildStyledData = useCallback(
    (currentRange: [number, number] | null) => {
      const solidColor = theme.palette.custom.treeMapLegendColor[1];

      return data.map((item) => {
        const itemKey = getItemKey(item);
        const itemStyle: any = {};

        // Apply selection styling (only if item is within visualMap range)
        if (itemKey && itemKey === selectedItemKey) {
          const recordsPerPersonVal = item.value?.[1];
          const isInRange =
            !currentRange || (recordsPerPersonVal >= currentRange[0] && recordsPerPersonVal <= currentRange[1]);
          if (isInRange) {
            itemStyle.borderColor = borderSelectedColor;
            itemStyle.borderWidth = 3;
          }
        }

        // For simple format data, apply solid color
        if (!hasRecordsPerPerson) {
          itemStyle.color = solidColor;
        }

        return {
          ...item,
          ...(Object.keys(itemStyle).length > 0 && { itemStyle }),
        };
      });
    },
    [data, selectedItemKey, hasRecordsPerPerson, theme.palette.custom.treeMapLegendColor, borderSelectedColor]
  );

  // Compute chart data on each render, reading the current visualMap range from the ECharts instance.
  // During drag, the imperative update in datarangeselected handles styling without triggering re-renders.
  const getVisualMapRange = (): [number, number] | null => {
    if (!hasRecordsPerPerson) return null;
    const instance = chartRef.current?.getEchartsInstance();
    if (instance) {
      const opt = instance.getOption() as any;
      return opt?.visualMap?.[0]?.range ?? null;
    }
    return null;
  };
  const chartData = buildStyledData(getVisualMapRange());

  // Build the base option object
  const baseOption: EChartsOption = {
    tooltip: {
      formatter: function (info: any) {
        const value = info.value;
        const numPersons = value[0];
        const recordsPerPerson = value[1];
        const percentPersons = value[2];
        const conceptPath = value[4] || info.name;

        // Parse conceptPath string, replace || with breaklines with growing indentation
        const parsedConceptPath = conceptPath
          .split("||")
          .map((e: string, index: number) => {
            return `<div style="padding-left: ${index * 10}px">${e.trim()}</div>`;
          })
          .join("");
        const formattedPrevalence = parseFloat(percentPersons).toFixed(5);

        const tooltipLines = [
          `<div class="tooltip-title">${parsedConceptPath}</div>`,
          `${getText(i18nKeys.TREE_MAP_CHART__PREVALENCE)}: ${formattedPrevalence}<br>`,
          `${getText(i18nKeys.TREE_MAP_CHART__NUMBER_OF_PEOPLE)}: ${Number(numPersons).toLocaleString()}<br>`,
        ];

        // Only show records per person if the data has meaningful values
        if (hasRecordsPerPerson) {
          tooltipLines.push(`${getText(i18nKeys.TREE_MAP_CHART__RECORDS_PER_PERSON)}: ${recordsPerPerson}`);
        }

        return tooltipLines.join("");
      },
      confine: true,
      className: "treemap-tooltip",
    },
    toolbox: {
      show: true,
      feature: {
        dataView: { readOnly: false },
        saveAsImage: {},
        restore: {},
      },
    },
    series: [
      {
        name: title,
        type: "treemap",
        data: chartData,
        breadcrumb: {
          show: false,
        },
        roam: false,
        visibleMin: 1000,
        itemStyle: {
          borderColor: "black",
          gapWidth: 1,
        },
        label: {
          color: "black",
        },
      },
    ],
  };

  // Add visualMap and visualDimension only if records per person data is meaningful
  if (hasRecordsPerPerson) {
    baseOption.visualMap = {
      type: "continuous",
      min: minRecordsPerPerson,
      max: maxRecordsPerPerson,
      text: ["", getText(i18nKeys.TREE_MAP_CHART__RECORDS_PER_PERSON)],
      calculable: true,
      hoverLink: false,
      orient: "horizontal",
      left: "center",
      bottom: "-4px",
      dimension: 1,
      inRange: {
        color: theme.palette.custom.treeMapLegendColor,
      },
      textStyle: {
        color: theme.palette.text.primary,
        fontSize: 16,
      },
      formatter: (value) => {
        return `${Number(value).toFixed(2)}`;
      },
    };
    // Type assertion needed because ECharts types don't narrow series array properly
    if (Array.isArray(baseOption.series) && baseOption.series[0]) {
      (baseOption.series[0] as any).visualDimension = 1;
    }
  }

  // Merge with extra configs if provided
  const option = extraChartConfigs ? { ...baseOption, ...extraChartConfigs } : baseOption;

  const handleNodeClick = (conceptId: string, conceptName: string, itemName: string) => {
    setSelectedConcept({ id: conceptId, name: conceptName });
    // Use conceptName or itemName as the unique key
    const itemKey = conceptName || itemName;
    setSelectedItemKey(itemKey);
  };

  const onEvents = {
    click: (e: any) => {
      // e.value[3] = conceptId, e.value[4] = conceptPath (if available), e.name = display name
      return handleNodeClick(e.value[3], e.value[4] || e.name, e.name);
    },
    datarangeselected: (e: any) => {
      if (e.selected != null) {
        // Imperatively update series data for immediate responsiveness during drag
        const instance = chartRef.current?.getEchartsInstance();
        if (instance) {
          const styledData = buildStyledData(e.selected);
          instance.setOption({ series: [{ data: styledData }] }, false, true);
        }
      }
    },
  };

  return (
    <div className="treemap-chart-wrapper">
      {loading && <div className="treemap-chart-overlay" />}
      <ReactECharts
        ref={chartRef}
        style={{
          minHeight: 500,
          width: "100%",
        }}
        option={option}
        onEvents={onEvents}
        notMerge={false}
        lazyUpdate={true}
      />
      <div className="legend-box-size">{getText(i18nKeys.TREE_MAP_CHART__CHART_LEGEND)}</div>
    </div>
  );
};

export default TreeMapChart;
