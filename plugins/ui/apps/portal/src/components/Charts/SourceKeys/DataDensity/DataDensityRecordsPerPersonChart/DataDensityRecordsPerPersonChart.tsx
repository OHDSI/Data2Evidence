import { FC } from "react";
import DataDensityLineChart from "../DataDensityLineChart";

interface DataDensityRecordsPerPersonChartProps {
  data: any;
}

const DataDensityRecordsPerPersonChart: FC<DataDensityRecordsPerPersonChartProps> = ({ data }) => (
  <DataDensityLineChart
    data={data}
    titleKey="DATA_DENSITY_RECORDS_PER_PERSON_CHART__TITLE"
    xAxisNameKey="DATA_DENSITY_RECORDS_PER_PERSON_CHART__X_AXIS_NAME"
    yAxisNameKey="DATA_DENSITY_RECORDS_PER_PERSON_CHART__Y_AXIS_NAME"
    noDataKey="DATA_DENSITY_RECORDS_PER_PERSON_CHART__NO_DATA"
    valueFormatter={(v) => Number(v.toFixed(4))}
  />
);

export default DataDensityRecordsPerPersonChart;
