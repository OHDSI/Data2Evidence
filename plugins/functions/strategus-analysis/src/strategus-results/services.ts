import {
  Kernel,
  KernelManager,
  ServerConnection,
  IKernelConnection,
} from "@jupyterlab/services";
import { services } from "../env.ts";
import { env } from "../env.ts";
import dataSource from "../db/datasource.ts";

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
        baseUrl: services["jupyter-gateway-viewer"],
        token: token,
        appendToken: true,
      }),
    });

    const kernelConnection: IKernelConnection = await getKernelConnection(
      studyId,
      manager
    );
    // dynamically generate the shiny module config and resolve viewerCode.
    const strategusAnalysisRepository = dataSource.getRepository("StrategusAnalysis");
    const strategusAnalysisObj = await strategusAnalysisRepository.findOne({
            where: { studyId: studyId }
        });
    const moduleConfig = await createShinyModuleConfig(strategusAnalysisObj);

    // When the caller sends an empty viewerCode, fall back to the one stored in the DB.
    const resolvedViewerCode = viewerCode || strategusAnalysisObj?.viewerCode;
    if (!resolvedViewerCode) {
      throw new Error(
        `Viewer code is not configured for study ${studyId}. Please contact your Admin.`
      );
    }

    const r_code = resolvedViewerCode
      .replace("$DATABASE_SCHEMA", "results_" + studyId)
      .replace(
        "$DATABASE_CONNECTION_STRING",
        `jdbc:postgresql://${env.TREX__SQL__HOST}:${env.TREX__SQL__PORT}/${env.TREX__STRATEGUS_RESULTS_DB_NAME}?preferQueryMode=simple&autocommit=true`
      )
      .replace("$DATABASE_USER", env.TREX__SQL__USER)
      .replace("$DATABASE_PASSWORD", env.TREX__SQL__PASSWORD)
      .replaceAll("$STUDY_ID", encodeURIComponent(studyId))
      .replace("$DATASET_ID", datasetId || "") // relevant for table1 alone; TODO: remove
      .replace("$SHINY_MODULE_CONFIG", moduleConfig);

    const future = await kernelConnection.requestExecute({
      code: r_code,
      stop_on_error: true,
    });

    return new Promise<void>((resolve, reject) => {
      let executionError: Error | null = null;
      let executionComplete = false;

      future.onReply = (msg: any) => {
        if (msg.content.status === "error") {
          console.error("Execution error:", msg);
          executionError = new Error(
            `Code execution error: ${msg.content.ename} - ${msg.content.evalue}`
          );
          kernelConnection.dispose();
          reject(executionError);
        }
      };

      future.onIOPub = (msg: any) => {
        console.debug(msg);
        if (
          msg.content &&
          msg.content.text &&
          typeof msg.content.text === "string" &&
          msg.content.text.includes("Listening on http://0.0.0.0:3838")
        ) {
          executionComplete = true;
          kernelConnection.dispose();
          manager.dispose();
          resolve();
        }
      };

      setTimeout(() => {
        if (!executionComplete) {
          kernelConnection.dispose();
          manager.dispose();
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
        baseUrl: services["jupyter-gateway-viewer"],
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

    const runningKernels: Kernel.IModel[] = await manager.running();

    return runningKernels.find(
      (kernel: IKernelModel) => kernel.username === studyId
    );
  } catch (error) {
    console.log("Error in getKernel for study %s: %o", studyId, error);
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
    console.log("Error in getKernelConnection for study %s: %o", studyId, error);
    throw Error(`Failed to create or connect to kernel for study ${studyId}`);
  }
};

// Dynamically generate the shiny module config R code based on the study specification.
const createShinyModuleConfig = async (strategusAnalysisObj: any): Promise<string> => {
  try {
    if (!strategusAnalysisObj || !strategusAnalysisObj.analysisSpec) {
      return "";
    }

    // Parse the analysis spec JSON
    const analysisSpec = JSON.parse(strategusAnalysisObj.analysisSpec);
    const moduleSpecifications = analysisSpec.moduleSpecifications || [];

    // Helper function to generate module config blocks
    const generateDefaultModuleConfig = (functionName: string): string => {
      return `addModuleConfig(\n\t\t${functionName}()\n\t)`;
    };

    const generateCustomModuleConfig = (
      moduleId: string,
      tabName: string,
      uiFunction: string,
      serverFunction: string
    ): string => {
      return `addModuleConfig(\n\t\tcreateModuleConfig(\n\t\t\tmoduleId = "${moduleId}",\n\t\t\ttabName = "${tabName}",\n\t\t\tshinyModulePackage = NULL,\n\t\t\tshinyModulePackageVersion = NULL,\n\t\t\tmoduleUiFunction = ${uiFunction},\n\t\t\tmoduleServerFunction = ${serverFunction},\n\t\t\tmoduleInfoBoxFile = function(){},\n\t\t\tmoduleIcon = "info",\n\t\t\tinstallSource = "CRAN",\n\t\t\tgitHubRepo = NULL\n\t\t)\n\t)`;
    };

    // Start with base configuration
    let moduleConfigs: string[] = [];
    moduleConfigs.push("initializeModuleConfig() |>\n\t" + generateDefaultModuleConfig("createDefaultAboutConfig"));
    moduleConfigs.push(" |>\n\t" + generateDefaultModuleConfig("createDefaultDatasourcesConfig"));

    // Add modules based on the analysis spec
    for (const moduleSpec of moduleSpecifications) {
      const moduleName = moduleSpec.module;

      if (moduleName === "CohortGeneratorModule") {
        moduleConfigs.push(" |>\n\t" + generateDefaultModuleConfig("createDefaultCohortGeneratorConfig"));
      } else if (moduleName === "CohortDiagnosticsModule") {
        moduleConfigs.push(" |>\n\t" + generateDefaultModuleConfig("createDefaultCohortDiagnosticsConfig"));
      } else if (moduleName === "CharacterizationModule") {
        moduleConfigs.push(" |>\n\t" + generateDefaultModuleConfig("createDefaultCharacterizationConfig"));
      } else if (moduleName === "PatientLevelPredictionModule") {
        moduleConfigs.push(" |>\n\t" + generateDefaultModuleConfig("createDefaultPredictionConfig"));
      } else if (moduleName === "CohortMethodModule") {
        moduleConfigs.push(" |>\n\t" + generateDefaultModuleConfig("createDefaultEstimationConfig"));
      } else if (moduleName === "CohortSurvivalModule") {
        moduleConfigs.push(" |>\n\t" + generateCustomModuleConfig("survival", "SurvivalAnalysis", "survivalModuleUI", "survivalModuleServer"));
      } else if (moduleName === "TreatmentPatternsModule") {
        moduleConfigs.push(" |>\n\t" + generateCustomModuleConfig("patterns", "TreatmentPatterns", "patternsModuleUI", "patternsModuleServer"));
      }
    }

    const rCode = `${moduleConfigs.join("")}\n`;
    return rCode;
  } catch (error) {
    console.error("Error creating shiny module config:", error);
    return "";
  }
};
