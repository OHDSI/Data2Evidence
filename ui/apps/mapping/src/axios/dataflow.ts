import request from "./request";

const DATAFLOW_BASE_ENDPOINT = "dataflow-mgmt/";

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
