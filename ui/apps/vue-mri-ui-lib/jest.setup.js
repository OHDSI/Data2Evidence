HTMLCanvasElement.prototype.getContext = () => {
  // return whatever getContext has to return
}

// Mock SAP UI5 for DateUtils and UI5Adaptor
global.sap = {
  ui: {
    require: () => ({}),
    getCore: () => ({
      getEventBus: () => ({}),
      byId: () => ({}),
    }),
  },
}
