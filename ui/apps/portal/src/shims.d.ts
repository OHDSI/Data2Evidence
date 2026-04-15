interface Window {
  d2eListeners: {
    [key: string]: { type: string; app: string; listener: any }[];
  };
  mountPA?: () => void;
  unmountPA?: () => void;
  System: any;
  importMapOverrides?: {
    getOverrideMap: () => { imports?: Record<string, string> };
  };
}
