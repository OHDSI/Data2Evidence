;(window as any).sap = (window as any).sap || {
  hc: {
    mri: {
      pa: {
        ui: {
          Utils: {},
        },
      },
    },
  },
  ui: {
    getCore: () => ({
      byId: () => text => 'ABC',
      getEventBus: () => ({
        subscribe:
          () =>
          (text, {}) => ({}),
        unsubscribe:
          () =>
          (text, {}) => ({}),
      }),
    }),
    model: {
      resource: {
        ResourceModel: () => ({
          getResourceBundle: () => ({
            getText: () => text => 'ABC',
          }),
          _oResourceBundle: {
            sLocale: 'ABC',
          },
        }),
      },
    },
    require: () => ({}),
  },
}
export {}
