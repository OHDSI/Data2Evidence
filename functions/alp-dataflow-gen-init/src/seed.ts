import { env, getStudyResultsDbCredentials } from "./env";
import { BlockType, DBCredentials, PrefectVariable, PrefectSecret, transformDBCredentials } from "./types";
import { PrefectAPI } from "./PrefectAPI";
import { customDockerWorkpool } from "./customWorkpool";

export async function seed(): Promise<void> {
  console.log("[seed] Starting Prefect initialization seed...");
  let prefectApi = new PrefectAPI();

  // create prefect variables
  const prefectVariables = env.VARIABLES;
  const varNames = Object.keys(prefectVariables);
  console.log(`[seed] Creating ${varNames.length} Prefect variables: ${varNames.join(', ')}`);

  for (const varName in prefectVariables) {
    if (prefectVariables.hasOwnProperty(varName)) {
      console.log(`[seed] Processing variable: ${varName}`);
      const variable: PrefectVariable = {
        name: varName,
        value: prefectVariables[varName],
      };
      try {
        const variableName = await prefectApi.createPrefectVariable(variable);
        console.log(`[seed] Variable '${varName}' created/updated successfully`);
      } catch (error) {
        console.error(`[seed] Failed to create variable '${varName}':`, error);
        throw error;
      }
    }
  }

  // create prefect secrets
  const prefectSecrets = env.SECRETS;
  const secretNames = Object.keys(prefectSecrets);
  console.log(`[seed] Creating ${secretNames.length} Prefect secrets: ${secretNames.join(', ')}`);

  for (const secretName in prefectSecrets) {
    if (prefectSecrets.hasOwnProperty(secretName)) {
      console.log(`[seed] Processing secret block: ${secretName}`);
      const secretOptions: PrefectSecret = {
        value: prefectSecrets[secretName],
      };
      try {
        const secretBlockId = await prefectApi.createBlockDocument(
          secretName,
          secretOptions,
          BlockType.SECRET
        );
        console.log(`[seed] Secret block '${secretName}' created/updated successfully with ID: ${secretBlockId}`);
      } catch (error) {
        console.error(`[seed] Failed to create secret block '${secretName}':`, error);
        throw error;
      }
    }
  }

  console.log("[seed] Fetching database credentials...");
  const dbm = Trex.databaseManager();
  const dbCredentials: DBCredentials[] = await dbm.getDatabaseCredentials();
  console.log(`[seed] Retrieved ${dbCredentials.length} database credentials`);
  const transformedCredentials = transformDBCredentials(dbCredentials);

  const dbCredBlockName = "database-credentials";
  console.log(`[seed] Creating database credentials block: ${dbCredBlockName}`);
  const dbCredentialsOptions: PrefectSecret = {
    value: transformedCredentials,
  };
  try {
    const dbCredBlockId = await prefectApi.createBlockDocument(
      dbCredBlockName,
      dbCredentialsOptions,
      BlockType.SECRET
    );
    console.log(`[seed] Database credentials block created/updated successfully with ID: ${dbCredBlockId}`);
  } catch (error) {
    console.error(`[seed] Failed to create database credentials block '${dbCredBlockName}':`, error);
    throw error;
  }

  const strategusDbCredBlockName = "study-results-database-credentials";
  console.log(`[seed] Creating study results database credentials block: ${strategusDbCredBlockName}`);
  const strategusDbCredentials = getStudyResultsDbCredentials();
  const strategusDbCredentialsOptions: PrefectSecret = {
    value: strategusDbCredentials
  };
  try {
    const strategusDbCredBlockId = await prefectApi.createBlockDocument(
      strategusDbCredBlockName,
      strategusDbCredentialsOptions,
      BlockType.SECRET
    );
    console.log(`[seed] Study results database credentials block created/updated successfully with ID: ${strategusDbCredBlockId}`);
  } catch (error) {
    console.error(`[seed] Failed to create study results database credentials block '${strategusDbCredBlockName}':`, error);
    throw error;
  }

  // create flow results block
  console.log(`[seed] Creating flow results block: ${prefectVariables.flows_results_sb_name}`);
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

  try {
    const flowResultBlockId = await prefectApi.createBlockDocument(
      prefectVariables.flows_results_sb_name,
      flowResultsBlockOptions,
      BlockType.RFS
    );
    console.log(`[seed] Flow results block created/updated successfully with ID: ${flowResultBlockId}`);
  } catch (error) {
    console.error(`[seed] Failed to create flow results block '${prefectVariables.flows_results_sb_name}':`, error);
    throw error;
  }

  // apply custom workpool template
  console.log(`[seed] Updating workpool: ${env.WORKPOOL_NAME}`);
  try {
    const result = await prefectApi.updateWorkPool(
      env.WORKPOOL_NAME,
      customDockerWorkpool
    );
    console.log(`[seed] Workpool '${env.WORKPOOL_NAME}' updated successfully`);
  } catch (error) {
    console.error(`[seed] Failed to update workpool '${env.WORKPOOL_NAME}':`, error);
    throw error;
  }

  console.log("[seed] Prefect initialization seed completed successfully!");
}
