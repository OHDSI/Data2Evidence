export interface ConversionWithLogsResponse {
  id: number;
  statusCode: number;
  statusName: string;
  logs: {
    message: string;
    statusCode: number;
    statusName: string;
    percent: number;
    time: Date;
  }[];
}
