import { env } from "./env";
import { BlockType, DBCredentials, PrefectVariable, PrefectSecret, transformDBCredentials } from "./types";
import { PrefectAPI } from "./PrefectAPI";
import { customDockerWorkpool, customProcessWorkpool } from "./customWorkpool";

export async function seed(): Promise<void> {
  let prefectApi = new PrefectAPI();

  // Prefect sits behind nginx, which is listening before Prefect is: an unready
  // Prefect answers 502 immediately, and the calls below treat that as fatal.
  await prefectApi.waitUntilReady();

  // create prefect variables
  const prefectVariables = env.VARIABLES;

  for (const varName in prefectVariables) {
    if (prefectVariables.hasOwnProperty(varName)) {
      const variable: PrefectVariable = {
        name: varName,
        value: prefectVariables[varName],
      };
      const variableName = await prefectApi.createPrefectVariable(variable);
    }
  }

  // create prefect secrets
  const prefectSecrets = env.SECRETS;

  // Create every secret, then report. Previously one failure aborted the loop,
  // so a single bad value silently left the remaining secrets uncreated and the
  // first flow to need one failed with "Unable to find block document named ...".
  // Collect instead: create what can be created, and fail loudly naming all of
  // the ones that could not.
  const secretFailures: string[] = [];
  for (const secretName in prefectSecrets) {
    if (prefectSecrets.hasOwnProperty(secretName)) {
      const secretOptions: PrefectSecret = {
        value: prefectSecrets[secretName],
      };
      try {
        const secretBlockId = await prefectApi.createBlockDocument(
          secretName,
          secretOptions,
          BlockType.SECRET
        );
      } catch (error: any) {
        secretFailures.push(
          `${secretName} (${error.response?.status ?? error.code ?? error.message})`
        );
      }
    }
  }
  if (secretFailures.length > 0) {
    throw new Error(
      `Failed to create ${secretFailures.length} Prefect secret(s): ` +
        secretFailures.join(", ")
    );
  }

  const dbm = Trex.databaseManager();
  const dbCredentials: DBCredentials[] = await dbm.getDatabaseCredentials();
  const transformedCredentials = transformDBCredentials(dbCredentials);

  const dbCredBlockName = "database-credentials";
  const dbCredentialsOptions: PrefectSecret = {
    value: transformedCredentials,
  };
  const dbCredBlockId = await prefectApi.createBlockDocument(
    dbCredBlockName,
    dbCredentialsOptions,
    BlockType.SECRET
  );

  // create flow results block
  const flowResultsBlockOptions = {
    basepath: prefectVariables.flows_results_s3_dir_path,
    settings: {
      key: prefectVariables.minio_access_key,
      secret: env.SECRETS["minio-secret-key"],
      client_kwargs: {
        endpoint_url: `http://${prefectVariables.minio_endpoint}:${prefectVariables.minio_port}`,
      },
    },
  };

  const flowResultBlockId = await prefectApi.createBlockDocument(
    prefectVariables.flows_results_sb_name,
    flowResultsBlockOptions,
    BlockType.RFS
  );

  // apply custom workpool template (selected by WORKPOOL_TYPE; "docker" is the
  // legacy/rollback path)
  const result = await prefectApi.updateWorkPool(
    env.WORKPOOL_NAME,
    env.WORKPOOL_TYPE === "process" ? customProcessWorkpool : customDockerWorkpool
  );
}
