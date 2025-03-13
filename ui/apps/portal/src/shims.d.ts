interface Window {
  d2eListeners: {
    [key: string]: { type: string; app: string; listener: any }[];
  };
}
