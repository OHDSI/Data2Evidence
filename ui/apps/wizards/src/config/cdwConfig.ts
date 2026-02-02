import client from "../axios/request";

export interface CdwAttributeConfig {
  name: string;
  type: "num" | "text" | "datetime" | "time";
  [key: string]: unknown;
}

export interface ChartOptions {
  initialAttributes?: {
    measures?: string[];
    categories?: string[];
    stackCategory?: string[];
  };
  initialChart?: string;
}

export interface CdwConfig {
  patient: {
    attributes: Record<string, CdwAttributeConfig>;
    interactions?: Record<
      string,
      {
        attributes: Record<string, CdwAttributeConfig>;
        [key: string]: unknown;
      }
    >;
    [key: string]: unknown;
  };
  chartOptions?: ChartOptions;
  [key: string]: unknown;
}

export interface ConfigMeta {
  configId: string;
  configVersion: string;
}

export interface CdwConfigResult {
  config: CdwConfig;
  meta: ConfigMeta;
}

const mockConfig: CdwConfig = {
  patient: {
    attributes: {
      Age: { name: "Age", type: "num" },
      Gender_concept_name: { name: "Gender", type: "text" },
    },
    interactions: {
      conditionoccurrence: {
        name: "Condition Occurrence",
        attributes: {
          condition_occ_concept_name: { name: "Condition", type: "text" },
        },
      },
      measurement: {
        name: "Measurement",
        attributes: {
          numval: { name: "Value As Number", type: "num" },
          meas_concept_name: { name: "Measurement concept name", type: "text" },
          measurementid: { name: "Measurement Id", type: "text" },
        },
      },
    },
  },
  chartOptions: {
    initialAttributes: {
      measures: ["patient.attributes.pcount"],
      categories: ["patient.attributes.Age"],
      stackCategory: [],
    },
    initialChart: "stacked",
  },
};

const isDev = import.meta.env.DEV;

const mockMeta: ConfigMeta = { configId: "mock", configVersion: "1" };

let cachedResult: CdwConfigResult | null = null;

export async function fetchCdwConfig(datasetId?: string): Promise<CdwConfigResult> {
  if (cachedResult) return cachedResult;

  if (isDev) {
    cachedResult = { config: mockConfig, meta: mockMeta };
    return cachedResult;
  }

  const response = await client.get("/d2e/analytics-svc/pa/services/analytics.xsjs", {
    params: {
      action: "getMyConfig",
      datasetId,
    },
  });

  const data = response.data;
  const configEntry = Array.isArray(data) ? data[0] : data;
  cachedResult = {
    config: configEntry.config as CdwConfig,
    meta: configEntry.meta as ConfigMeta,
  };
  return cachedResult;
}

const mockAttributeValues: Record<string, Array<{ label: string; value: string }>> = {
  "patient.attributes.Gender_concept_name": [
    { label: "FEMALE", value: "FEMALE" },
    { label: "MALE", value: "MALE" },
  ],
  "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name": [
    { label: "Diabetes mellitus", value: "Diabetes mellitus" },
    { label: "Hypertension", value: "Hypertension" },
    { label: "Asthma", value: "Asthma" },
  ],
};

export async function fetchAttributeValues(
  attributePath: string,
  meta: ConfigMeta,
  datasetId?: string,
  searchQuery?: string,
): Promise<Array<{ label: string; value: string }>> {
  if (isDev) {
    const values = mockAttributeValues[attributePath] || [];
    const query = (searchQuery || "").toLowerCase();
    if (!query) return values;
    return values.filter((v) => v.label.toLowerCase().includes(query));
  }

  const response = await client.get("/d2e/analytics-svc/api/services/values", {
    params: {
      attributePath,
      configId: meta.configId,
      configVersion: meta.configVersion,
      datasetId,
      searchQuery: searchQuery || "",
      attributeType: "text",
    },
  });

  const items: Array<{ value: string; text: string }> = response.data?.data || [];
  return items.map((item) => ({ label: item.text, value: item.value }));
}

export function getAttributeByPath(config: CdwConfig, path: string): CdwAttributeConfig | undefined {
  const parts = path.split(".");
  let current: any = config;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}
