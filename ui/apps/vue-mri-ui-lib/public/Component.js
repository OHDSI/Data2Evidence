/*eslint-disable */
/* global sap */
/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */
sap.ui.define(['sap/hc/mri/pa/ui/lib/VueComponentHelper'], function (VueComponentHelper) {
  /**
   * Utility function to switch theme for local development. run this in console
   * setTheme(1) // bluecrystal
   * setTheme(0) // hcb
   */

  let themes = ['sap_hcb', 'sap_belize']

  this.setTheme = function (index) {
    if (typeof index === 'string') {
      index = themes.push(index) - 1
      console.log('you are setting a custom theme ' + themes[index])
    }

    index = index == undefined ? 0 : index
    const css = [].slice.call(document.getElementsByTagName('link'))
    const html = document.getElementsByTagName('html')[0]

    themes.forEach(function (t) {
      return html.classList.remove('sapUiTheme-' + t)
    })
    const selectedTheme = themes[index]
    if (selectedTheme) {
      html.classList.add('sapUiTheme-' + selectedTheme)
      css.forEach(function (l) {
        themes.forEach(function (t) {
          l.href = l.href.replace(t, selectedTheme)
        })
      })
    }
  }
  return VueComponentHelper.setup(
    'localdev.VueComponent',
    {
      metadata: {
        name: 'mri.pa',
        version: '${version}',
        dependencies: {
          libs: [
            'sap.hc.hph.core.ui',
            'sap.hc.mri.pa.ui.lib',
            'sap.m',
            'sap.ui.commons',
            'sap.ui.core',
            'sap.ui.layout',
            'sap.ui.table',
            'sap.viz',
          ],
          components: ['sap.hc.hph.eula.ui.components.acceptEula'],
          ui5version: '1.52.17',
        },
        config: {
          fullWidth: true,
          resourceBundle: '/sap/hc/mri/pa/ui/i18n/text.properties',
        },
        rootView: 'localdev.Vue',
        routing: {
          config: {
            routerClass: sap.m.routing.Router,
            viewType: 'XML',
            viewPath: '',
            controlId: 'appControl',
            controlAggregation: 'pages',
            bypassed: {
              target: 'main',
            },
          },
          routes: {
            main: {
              pattern: '',
              target: 'main',
            },
          },
          targets: {
            main: {
              viewName: 'localdev.VueContainer',
            },
          },
        },
      },
    },
    true
  )
})
