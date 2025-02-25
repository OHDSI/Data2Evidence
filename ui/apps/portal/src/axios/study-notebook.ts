import { StarboardNotebook } from "../plugins/Starboard/utils/notebook";
import { request } from "./request";

const STUDY_NOTEBOOK_BASE_URL = "system-portal/notebook";

export class StudyNotebook {
  public getNotebookList(datasetId?: string): Promise<StarboardNotebook[]> {
    const notebookList = request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: ``,
      method: "GET",
      params: { datasetId },
    });
    return notebookList;
  }

  public createNotebook(datasetId: string, name?: string, notebookContent?: string): Promise<StarboardNotebook> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: ``,
      data: { name, notebookContent, datasetId },
      method: "POST",
    });
  }

  public saveNotebook(
    id: string,
    name: string,
    notebookContent: string,
    isShared: boolean,
    datasetId: string
  ): Promise<StarboardNotebook> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: ``,
      data: {
        id,
        name,
        notebookContent,
        isShared,
        datasetId,
      },
      method: "PUT",
    });
  }

  public deleteNotebook(id: string, datasetId: string): Promise<boolean> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: `/${id}`,
      method: "DELETE",
      params: { datasetId },
    });
  }
}
