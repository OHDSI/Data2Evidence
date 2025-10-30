import request from "./request";
import { API_PATHS } from "../constants/api";

const DATAFLOW_BASE_ENDPOINT = API_PATHS.DATAFLOW;

export class Dataflow {
  public uploadCsv(nodeId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);

    return request({
      url: `${DATAFLOW_BASE_ENDPOINT}dataflow/file/csv?nodeId=${nodeId}`,
      method: "POST",
      data: formData,
    });
  }
}
