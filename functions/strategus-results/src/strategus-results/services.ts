import {
  Kernel,
  KernelManager,
  ServerConnection,
  IKernelConnection,
} from "@jupyterlab/services";
import { services } from "../env.ts";
import { USER_SCOPE, IDatabaseCredential, IReadCredential } from "../type.ts";
import { RESULT_VIEWER_TEMPLATE } from "./template/result_viewer.ts";
interface IKernelModel extends Kernel.IModel {
  username: string;
}

export const createStrategusResultsViewer = async (
  token: string,
  studyId: string,
  databaseCode: string
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

    const kernel: IKernelConnection = await getKernel(studyId, manager);
    const readCredentials = await getReadCredentials(databaseCode);

    const { host, port, readUser, readPassword } = readCredentials;

    const r_code = RESULT_VIEWER_TEMPLATE.replace(
      "$DATABASE_SCHEMA",
      "results_" + databaseCode
    )
      .replace("$DATABASE_SERVER", `${host}:${port}`)
      .replace("$DATABASE_USER", readUser)
      .replace("$DATABASE_PASSWORD", readPassword);

    console.debug("R code to execute:", r_code);

    const future = await kernel.requestExecute({
      code: r_code,
      stop_on_error: true,
    });

    let executionError: Error | null = null;
    future.onReply = (msg) => {
      if (msg.content.status === "error") {
        console.error("Execution error:", msg);
        executionError = new Error(
          `Code execution error: ${msg.content.ename} - ${msg.content.evalue}`
        );
      }
    };

    await future.done;
    kernel.dispose();
    if (executionError) {
      throw executionError;
    }

    console.log(
      `Strategus Results Viewer created for study ${studyId} with kernel ${kernel.id}`
    );

    return;
  } catch (error) {
    throw error;
  }
};

const getKernel: IKernelConnection = async (
  studyId: string,
  manager: KernelManager
): Promise<IKernelConnection> => {
  try {
    await manager.ready;
    await manager.refreshRunning();

    const running = manager.running();
    const existingKernel: IKernelConnection = running.find(
      (kernel: IKernelModel) => kernel.username === studyId
    );

    if (existingKernel) {
      console.log(`Kernel found for study ${studyId}:`, existingKernel.id);
      return manager.connectTo({
        model: { name: "r_ohdsi_docker", id: existingKernel.id },
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

const getReadCredentials = async (
  databaseCode: string
): Promise<IReadCredential> => {
  const dbm = Trex.databaseManager();

  const databaseCredentials =
    dbm.getDatabaseCredentials() as IDatabaseCredential[];

  const parsedDatabaseCredentials = databaseCredentials.map((db) => {
    const { credentials, dialect, name, port, ...rest } = db;

    const decryptedCreds = credentials.reduce<{ [key: string]: string }>(
      (acc, c) => {
        const { username, password, userScope } = c;
        switch (userScope) {
          case USER_SCOPE.ADMIN:
          case USER_SCOPE.READ:
            acc[userScope.toLowerCase() + "User"] = username;
            acc[userScope.toLowerCase() + "Password"] = password;
          default:
            acc["user"] = username;
            acc["password"] = password;
        }
        return acc;
      },
      {}
    );

    return {
      code: rest.code,
      host: rest.host.toString(),
      port: port.toString(),
      credentials: decryptedCreds,
    };
  });

  const readCredentials = parsedDatabaseCredentials.find(
    (parsedDatabaseCredential) => parsedDatabaseCredential.code === databaseCode
  );

  if (!readCredentials) {
    throw Error("No database credentials");
  }

  if (
    !readCredentials.credentials.readUser ||
    !readCredentials.credentials.readPassword
  ) {
    throw Error("Missing read credentials");
  }

  return {
    host: readCredentials.host,
    port: readCredentials.port,
    readUser: readCredentials.credentials.readUser,
    readPassword: readCredentials.credentials.readPassword,
  };
};
