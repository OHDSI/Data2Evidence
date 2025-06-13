import { KernelManager, ServerConnection } from "@jupyterlab/services";

export const createStrategusResultsViewer = async (
  studyId: string
): Promise<any> => {
  console.log("Creating Strategus Results Viewer for study:", studyId);
};
