
/* global jQuery, sap */
/* eslint-disable */
jQuery.sap.registerModulePath('sap.hc', '/sap/hc');
sap.ui.getCore().loadLibrary('sap.hc.hph.core.ui');

sap.ui.define([
  'hc/mri/pa/ui/lib/VueComponentHelper'
], function (VueComponentHelper) {

  return VueComponentHelper.setup('hc.mri.pa.ui.Component', {
    metadata: {
      name: 'mri.pa',
      version: '${version}',
      includes: [
        "css/style.css"
      ],
      dependencies: {
        libs: [
          'sap.hc.hph.core.ui',
          'hc.mri.pa.ui.lib',
          'sap.m',
          'sap.ui.commons',
          'sap.ui.core',
          'sap.ui.layout',
          'sap.ui.table',
          'sap.viz',
        ],
        ui5version: '1.52.17',
      },
      config: {
        fullWidth: true,
        resourceBundle: 'i18n/text.properties',
      },
      rootView: 'hc.mri.pa.ui.vue.Vue',
      routing: {
        config: {
          routerClass: sap.m.routing.Router,
          viewType: 'XML',
          viewPath: 'hc.mri.pa.ui.vue',
          controlId: 'appControl',
          controlAggregation: 'pages',
          bypassed: {
            target: 'main',
          },
        },
        routes: [
          {
            pattern: '',
            name: 'main',
            target: 'main',
          },
        ],
        targets: {
          main: {
            viewName: 'VueContainer',
          },
        },
      },
    },
  });
});
