import {
  Kernel,
  KernelManager,
  ServerConnection,
  IKernelConnection,
} from "@jupyterlab/services";
import { services } from "../env.ts";
import { RESULT_VIEWER_TEMPLATE } from "./template/result_viewer_template.ts";
import { env } from "../env.ts";

interface IKernelModel extends Kernel.IModel {
  id: string;
  username: string;
}

export const startStrategusResultsViewer = async (
  token: string,
  studyId: string,
  datasetId: string
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

    const r_code = RESULT_VIEWER_TEMPLATE.replace(
      "$DATABASE_SCHEMA",
      "results_" + studyId
    )
      .replace(
        "$DATABASE_CONNECTION_STRING",
        `jdbc:postgresql://${env.PG__HOST}:${env.PG__PORT}/${env.PG__RESULTS_DB_NAME}`
      )
      .replace("$DATABASE_USER", readUser)
      .replace("$DATABASE_PASSWORD", readPassword)
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
      console.log(`Kernel found for study ${studyId}:`, runningKernel.id);
      return manager.connectTo({
        model: { name: "r_ohdsi_docker", id: runningKernel.id },
      });
    } else {
      console.log(`No kernel found for study ${studyId}, creating new kernel`);
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
