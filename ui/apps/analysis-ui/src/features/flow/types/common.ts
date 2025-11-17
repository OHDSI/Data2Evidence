export interface KeyValue {
  key: string;
  value: string;
}

export interface KeyValueData<T = string> extends KeyValue {
  data: T;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
