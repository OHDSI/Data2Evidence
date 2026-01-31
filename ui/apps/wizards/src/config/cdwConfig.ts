export interface CdwAttributeConfig {
  name: string;
  type: "num" | "text" | "datetime" | "time";
}

export interface CdwConfig {
  patient: {
    attributes: Record<string, CdwAttributeConfig>;
  };
}

const cdwConfig: CdwConfig = {
  patient: {
    attributes: {
      Age: { name: "Age", type: "num" },
    },
  },
};

export function getCdwConfig(): CdwConfig {
  return cdwConfig;
}

export function getAttributeByPath(path: string): CdwAttributeConfig | undefined {
  const parts = path.split(".");
  let current: any = cdwConfig;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}
