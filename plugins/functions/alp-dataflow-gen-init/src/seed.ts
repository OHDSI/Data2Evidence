import { env, getStudyResultsDbCredentials } from "./env";
import { BlockType, DBCredentials, PrefectVariable, PrefectSecret, transformDBCredentials } from "./types";
import { PrefectAPI } from "./PrefectAPI";
import { customDockerWorkpool } from "./customWorkpool";

export async function seed(): Promise<void> {
  let prefectApi = new PrefectAPI();

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

  for (const secretName in prefectSecrets) {
    if (prefectSecrets.hasOwnProperty(secretName)) {
      const secretOptions: PrefectSecret = {
        value: prefectSecrets[secretName],
      };
      const secretBlockId = await prefectApi.createBlockDocument(
        secretName,
        secretOptions,
        BlockType.SECRET
      );
    }
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

  const strategusDbCredBlockName = "study-results-database-credentials";
  const strategusDbCredentials = getStudyResultsDbCredentials();
  const strategusDbCredentialsOptions: PrefectSecret = {
    value: strategusDbCredentials
  };
  const strategusDbCredBlockId = await prefectApi.createBlockDocument(
    strategusDbCredBlockName,
    strategusDbCredentialsOptions,
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

  // apply custom workpool template
  const result = await prefectApi.updateWorkPool(
    env.WORKPOOL_NAME,
    customDockerWorkpool
  );
}
