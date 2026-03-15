import { api } from "../../../../axios/api";
import { StudyDashboardTemplateData, ViewerCodeWithQueries } from "../../../../types";

export interface ConfigStrategy {
  fetchTemplates: () => Promise<StudyDashboardTemplateData[]>;
  fetchCodes: (id: string, type: "dashboard" | "cohort") => Promise<ViewerCodeWithQueries[]>;
  fetchStrategusCode: (id: string) => Promise<string>;
  saveCode: (params: SaveCodeParams) => Promise<void>;
  supportsMultipleCodes: boolean;
  supportsQueries: boolean;
}

export interface SaveCodeParams {
  id: string;
  code: string;
  name: string;
  type: "dashboard" | "cohort";
  language?: string;
}

const dashboardCohortStrategy: ConfigStrategy = {
  fetchTemplates: () => api.systemPortal.getDashboardTemplatesFromRepo(),
  fetchCodes: (id, type) => api.systemPortal.getDashboardCodes(id, type),
  fetchStrategusCode: async () => "",
  saveCode: async ({ id, code, name, type, language }) => {
    await api.systemPortal.upsertDashboardCode({
      datasetId: id,
      code,
      type,
      name,
      language,
    });
  },
  supportsMultipleCodes: true,
  supportsQueries: true,
};

const strategusStrategy: ConfigStrategy = {
  fetchTemplates: () => api.strategusAnalysis.getStudyViewerTemplates(),
  fetchCodes: async () => [],
  fetchStrategusCode: async (id) => {
    const study = await api.strategusAnalysis.getStrategusAnalysis(id);
    return study.viewerCode || "";
  },
  saveCode: async ({ id, code }) => {
    await api.strategusAnalysis.saveStategusAnalysisViewerCode(id, code);
  },
  supportsMultipleCodes: false,
  supportsQueries: false,
};

export function createConfigStrategy(type: "dashboard" | "cohort" | "strategus"): ConfigStrategy {
  return type === "strategus" ? strategusStrategy : dashboardCohortStrategy;
}
