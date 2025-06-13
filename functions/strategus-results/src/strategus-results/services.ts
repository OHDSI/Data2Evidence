import {
  Kernel,
  KernelManager,
  ServerConnection,
  IKernelConnection,
} from "@jupyterlab/services";
import { services } from "../env.ts";

interface IKernelModel extends Kernel.IModel {
  username: string;
}

export const createStrategusResultsViewer = async (
  token: string,
  studyId: string
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

    let kernel: Kernel.IKernelConnection | null = null;

    await manager.ready;
    await manager.refreshRunning();

    const running = manager.running();
    const existingKernel: IKernelConnection = running.find(
      (kernel) => kernel.name === studyId
    );

    if (existingKernel) {
      console.log(`Kernel found for study ${studyId}:`, existingKernel.id);
      kernel = manager.connectTo({
        model: { name: "r_ohdsi_docker", id: existingKernel.id },
      });
    } else {
      console.log(`No kernel found for study ${studyId}, creating new kernel`);
      kernel = await manager.startNew({
        name: "r_ohdsi_docker",
        env: {
          KERNEL_USERNAME: studyId,
        },
      });
    }

    if (kernel) {
      kernel.dispose();
    }
  } catch (error) {
    throw error;
  }
};
