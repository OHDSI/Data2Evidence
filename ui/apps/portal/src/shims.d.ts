interface Window {
  d2eListeners: {
    [key: string]: { type: string; app: string; listener: any }[];
  };
  System: any;
  importMapOverrides?: {
    getOverrideMap: () => { imports?: Record<string, string> };
  };
}
