import client from "../axios/request";

export interface CdwAttributeConfig {
  name: string;
  type: "num" | "text" | "datetime" | "time";
  [key: string]: unknown;
}

export interface CdwConfig {
  patient: {
    attributes: Record<string, CdwAttributeConfig>;
  };
}

const mockConfig: CdwConfig = {
  patient: {
    attributes: {
      Age: { name: "Age", type: "num" },
    },
  },
};

const isDev = import.meta.env.DEV;

let cachedConfig: CdwConfig | null = null;

export async function fetchCdwConfig(datasetId?: string): Promise<CdwConfig> {
  if (cachedConfig) return cachedConfig;

  if (isDev) {
    cachedConfig = mockConfig;
    return cachedConfig;
  }

  const response = await client.get("/d2e/analytics-svc/pa/services/analytics.xsjs", {
    params: {
      action: "getMyConfig",
      datasetId,
    },
  });

  const data = response.data;
  const configEntry = Array.isArray(data) ? data[0] : data;
  cachedConfig = configEntry.config as CdwConfig;
  return cachedConfig;
}

export function getAttributeByPath(config: CdwConfig, path: string): CdwAttributeConfig | undefined {
  const parts = path.split(".");
  let current: any = config;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}
