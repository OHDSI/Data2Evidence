import {
  Kernel,
  KernelManager,
  ServerConnection,
  IKernelConnection,
} from "@jupyterlab/services";
import { services } from "../env.ts";
import { USER_SCOPE, IDatabaseCredential, IReadCredential } from "../type.ts";
import { RESULT_VIEWER_TEMPLATE } from "./template/result_viewer_template.ts";
import { PortalServerAPI } from "./api/PortalServerAPI.ts";

interface IKernelModel extends Kernel.IModel {
  username: string;
}

export const createStrategusResultsViewer = async (
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

    const portalServerApi = new PortalServerAPI(token);
    const { databaseCode } = await portalServerApi.getDataset(datasetId);

    const kernel: IKernelConnection = await getKernel(studyId, manager);
    const readCredentials = await getReadCredentials(databaseCode);

    const { name, host, port, readUser, readPassword } = readCredentials;
    const r_code = RESULT_VIEWER_TEMPLATE.replace(
      "$DATABASE_SCHEMA",
      "results_" + studyId
    )
      .replace(
        "$DATABASE_CONNECTION_STRING",
        `jdbc:postgresql://${host}:${port}/${name}`
      )
      .replace("$DATABASE_USER", readUser)
      .replace("$DATABASE_PASSWORD", readPassword)
      .replace("$STUDY_ID", studyId);

    const future = await kernel.requestExecute({
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
          kernel.dispose();
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

const getKernel = async (
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
            break;
          default:
            acc["user"] = username;
            acc["password"] = password;
            break;
        }
        return acc;
      },
      {}
    );

    return {
      name: name,
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
    name: readCredentials.name,
    host: readCredentials.host,
    port: readCredentials.port,
    readUser: readCredentials.credentials.readUser,
    readPassword: readCredentials.credentials.readPassword,
  };
};
