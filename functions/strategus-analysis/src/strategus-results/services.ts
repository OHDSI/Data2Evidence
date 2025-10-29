import {
  Kernel,
  KernelManager,
  ServerConnection,
  IKernelConnection,
} from "@jupyterlab/services";
import { services } from "../env.ts";
import { env } from "../env.ts";
import { PortalServerAPI } from "./api/PortalServerAPI.ts";

interface IKernelModel extends Kernel.IModel {
  id: string;
  username: string;
}

export const startStrategusResultsViewer = async (
  token: string,
  studyId: string,
  datasetId: string,
  viewerCode: string
): Promise<void> => {
  console.log("Creating Strategus Results Viewer for study:", studyId);

  try {
    const manager = new KernelManager({
      standby: "when-hidden",
      serverSettings: ServerConnection.makeSettings({
        baseUrl: services["jupyter-gateway"],
        token: token,
        appendToken: true,
      }),
    });

    const kernelConnection: IKernelConnection = await getKernelConnection(
      studyId,
      manager
    );

    // const portalServerApi = new PortalServerAPI(token);
    // const { databaseCode, schemaName, vocabSchemaName, resultSchemaName } =
    //   await portalServerApi.getDataset(datasetId);

    // const dbm = Trex.databaseManager();
    // const credentials = await dbm.getCredentialsDecrypted();

    const r_code = viewerCode
      .replace("$DATABASE_SCHEMA", "results_" + studyId)
      .replace(
        "$DATABASE_CONNECTION_STRING",
        `jdbc:postgresql://${env.TREX__SQL__HOST}:${env.TREX__SQL__PORT}/${env.TREX__SQL__DBNAME}?preferQueryMode=simple&autocommit=true`
      )
      .replace("$DATABASE_USER", env.TREX__SQL__USER)
      .replace("$DATABASE_PASSWORD", env.TREX__SQL__PASSWORD)
      .replace("$STUDY_ID", encodeURIComponent(studyId));

    const future = await kernelConnection.requestExecute({
      code: r_code,
      stop_on_error: true,
    });

    return new Promise<void>((resolve, reject) => {
      let executionError: Error | null = null;
      let executionComplete = false;

      future.onReply = (msg) => {
        if (msg.content.status === "error") {
          console.error("Execution error:", msg);
          executionError = new Error(
            `Code execution error: ${msg.content.ename} - ${msg.content.evalue}`
          );
          kernelConnection.dispose();
          reject(executionError);
        }
      };

      future.onIOPub = (msg) => {
        console.debug(msg);
        if (
          msg.content &&
          msg.content.text &&
          typeof msg.content.text === "string" &&
          msg.content.text.includes("Listening on http://0.0.0.0:3838")
        ) {
          executionComplete = true;
          resolve();
        }
      };

      setTimeout(() => {
        if (!executionComplete) {
          reject(new Error("Timeout error: Shiny app failed to start"));
        }
      }, 60000);
    });
  } catch (error) {
    throw error;
  }
};

export const stopStrategusResultsViewer = async (
  token: string,
  studyId: string
): Promise<{ stopped: boolean; message: string }> => {
  try {
    const manager = new KernelManager({
      standby: "when-hidden",
      serverSettings: ServerConnection.makeSettings({
        baseUrl: services["jupyter-gateway"],
        token: token,
        appendToken: true,
      }),
    });

    const runningKernel = await getKernel(studyId, manager);

    if (runningKernel) {
      await manager.shutdown(runningKernel.id);
      return { stopped: true, message: `Kernel for study ${studyId} stopped.` };
    } else {
      return {
        stopped: false,
        message: `No running kernel found for study ${studyId}.`,
      };
    }
  } catch (error) {
    throw error;
  }
};

const getKernel = async (
  studyId: string,
  manager: KernelManager
): Promise<IKernelModel | undefined> => {
  try {
    await manager.ready;
    await manager.refreshRunning();

    const runningKernels: Kernel.IModel[] = manager.running();

    return runningKernels.find(
      (kernel: IKernelModel) => kernel.username === studyId
    );
  } catch (error) {
    throw new Error("Failed to get kernel");
  }
};

const getKernelConnection = async (
  studyId: string,
  manager: KernelManager
): Promise<IKernelConnection> => {
  try {
    const runningKernel = await getKernel(studyId, manager);

    if (runningKernel) {
      console.log("Kernel found for study %s:", studyId, runningKernel.id);
      return manager.connectTo({
        model: { name: "r_ohdsi_docker", id: runningKernel.id },
      });
    } else {
      console.log("No kernel found for study %s, creating new kernel", studyId);
      return await manager.startNew({
        name: "r_ohdsi_docker",
        env: {
          KERNEL_USERNAME: studyId,
        },
      });
    }
  } catch (error) {
    throw Error(`Failed to create or connect to kernel for study ${studyId}`);
  }
};
