import { FC } from "react";
import DataDensityLineChart from "../DataDensityLineChart";

interface DataDensityTotalRecordsChartProps {
  data: any;
}

const DataDensityTotalRecordsChart: FC<DataDensityTotalRecordsChartProps> = ({ data }) => (
  <DataDensityLineChart
    data={data}
    titleKey="DATA_DENSITY_TOTAL_RECORDS_CHART__TITLE"
    xAxisNameKey="DATA_DENSITY_TOTAL_RECORDS_CHART__X_AXIS_NAME"
    yAxisNameKey="DATA_DENSITY_TOTAL_RECORDS_CHART__Y_AXIS_NAME"
    noDataKey="DATA_DENSITY_TOTAL_RECORDS_CHART__NO_DATA"
  />
);

export default DataDensityTotalRecordsChart;
