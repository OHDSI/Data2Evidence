const mockData = require('./mock-data.json')

/**
 * @param {import('express').Application} app
 */
const setupMockRoutes = app => {
  // GET /oidc/auth (API)
  app.get('/oidc/auth', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    const mockResponse = mockData.GET__oidc_auth
    res.status(mockResponse.status).json(mockResponse.body)
  })

  // GET /authenticate.js (Static File)
  app.get('/authenticate.js', (req, res) => {
    console.log('Serving static file:', '/authenticate.js')

    const mockResponse = mockData.GET__authenticate_js

    // Set appropriate content type
    res.set('Content-Type', 'application/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap-ui-core.js (Static File)
  app.get('/ui/sap-ui-core.js', (req, res) => {
    console.log('Serving static file:', '/ui/sap-ui-core.js')

    const mockResponse = mockData.GET__ui_sap_ui_core_js

    // Set appropriate content type
    res.set('Content-Type', 'text/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /js/chunk-vendors.js (Static File)
  app.get('/js/chunk-vendors.js', (req, res) => {
    console.log('Serving static file:', '/js/chunk-vendors.js')

    const mockResponse = mockData.GET__js_chunk_vendors_js

    // Set appropriate content type
    res.set('Content-Type', 'application/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /js/app.js (Static File)
  app.get('/js/app.js', (req, res) => {
    console.log('Serving static file:', '/js/app.js')

    const mockResponse = mockData.GET__js_app_js

    // Set appropriate content type
    res.set('Content-Type', 'application/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/ui/core/library-preload.js (Static File)
  app.get('/ui/sap/ui/core/library-preload.js', (req, res) => {
    console.log('Serving static file:', '/ui/sap/ui/core/library-preload.js')

    const mockResponse = mockData.GET__ui_sap_ui_core_library_preload_js

    // Set appropriate content type
    res.set('Content-Type', 'text/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/m/library-preload.js (Static File)
  app.get('/ui/sap/m/library-preload.js', (req, res) => {
    console.log('Serving static file:', '/ui/sap/m/library-preload.js')

    const mockResponse = mockData.GET__ui_sap_m_library_preload_js

    // Set appropriate content type
    res.set('Content-Type', 'text/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/ui/core/messagebundle_en_GB.properties (Static File)
  app.get('/ui/sap/ui/core/messagebundle_en_GB.properties', (req, res) => {
    console.log('Serving static file:', '/ui/sap/ui/core/messagebundle_en_GB.properties')

    const mockResponse = mockData.GET__ui_sap_ui_core_messagebundle_en_GB_properties

    // Set appropriate content type
    res.set('Content-Type', 'text/plain; charset=UTF-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/ui/core/messagebundle_en.properties (Static File)
  app.get('/ui/sap/ui/core/messagebundle_en.properties', (req, res) => {
    console.log('Serving static file:', '/ui/sap/ui/core/messagebundle_en.properties')

    const mockResponse = mockData.GET__ui_sap_ui_core_messagebundle_en_properties

    // Set appropriate content type
    res.set('Content-Type', 'application/octet-stream')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/m/messagebundle_en_GB.properties (Static File)
  app.get('/ui/sap/m/messagebundle_en_GB.properties', (req, res) => {
    console.log('Serving static file:', '/ui/sap/m/messagebundle_en_GB.properties')

    const mockResponse = mockData.GET__ui_sap_m_messagebundle_en_GB_properties

    // Set appropriate content type
    res.set('Content-Type', 'text/plain; charset=UTF-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/m/messagebundle_en.properties (Static File)
  app.get('/ui/sap/m/messagebundle_en.properties', (req, res) => {
    console.log('Serving static file:', '/ui/sap/m/messagebundle_en.properties')

    const mockResponse = mockData.GET__ui_sap_m_messagebundle_en_properties

    // Set appropriate content type
    res.set('Content-Type', 'application/octet-stream')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/ui/core/themes/sap_belize/library.css (Static File)
  app.get('/ui/sap/ui/core/themes/sap_belize/library.css', (req, res) => {
    console.log('Serving static file:', '/ui/sap/ui/core/themes/sap_belize/library.css')

    const mockResponse = mockData.GET__ui_sap_ui_core_themes_sap_belize_library_css

    // Set appropriate content type
    res.set('Content-Type', 'text/css; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/m/themes/sap_belize/library.css (Static File)
  app.get('/ui/sap/m/themes/sap_belize/library.css', (req, res) => {
    console.log('Serving static file:', '/ui/sap/m/themes/sap_belize/library.css')

    const mockResponse = mockData.GET__ui_sap_m_themes_sap_belize_library_css

    // Set appropriate content type
    res.set('Content-Type', 'text/css; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /analytics-svc/pa/services/analytics.xsjs (API)
  app.get('/analytics-svc/pa/services/analytics.xsjs', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    const mockResponse = mockData.GET__analytics_svc_pa_services_analytics_xsjs
    res.status(mockResponse.status).json(mockResponse.body)
  })

  // GET /js/node_modules_d4l_web-components-library_dist_esm_d4l-button_2_entry_js.js (Static File)
  app.get('/js/node_modules_d4l_web-components-library_dist_esm_d4l-button_2_entry_js.js', (req, res) => {
    console.log('Serving static file:', '/js/node_modules_d4l_web-components-library_dist_esm_d4l-button_2_entry_js.js')

    const mockResponse = mockData.GET__js_node_modules_d4l_web_components_library_dist_esm_d4l_button_2_entry_js_js

    // Set appropriate content type
    res.set('Content-Type', 'application/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /analytics-svc/api/services/population/json/barchart (API)
  app.get('/analytics-svc/api/services/population/json/barchart', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    const mockResponse = mockData.GET__analytics_svc_api_services_population_json_barchart
    res.status(mockResponse.status).json(mockResponse.body)
  })

  // GET /analytics-svc/api/services/population/json/patientcount (API)
  app.get('/analytics-svc/api/services/population/json/patientcount', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    const mockResponse = mockData.GET__analytics_svc_api_services_population_json_patientcount
    res.status(mockResponse.status).json(mockResponse.body)
  })

  // GET /analytics-svc/api/services/values (API)
  // This seems to be the api call used to get data to load into vuex, which we are not using in pa-atlas.
  // Instead we are using another one used in loadConceptSets
  app.get('/analytics-svc/api/services/values', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    res.json({
      data: [],
    })
  })

  // GET /terminology/fhir/4_0_0/valueset/$expand (API)
  // This might not be used by pa-atlas. Static response for visibility only
  app.get(
    '/terminology/fhir/4_0_0/valueset/$expand?datasetId=4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e&offset=0&count=25&code=&filter=%7B%22conceptClassId%22%3A%5B%5D%2C%22domainId%22%3A%5B%22Condition%22%5D%2C%22vocabularyId%22%3A%5B%5D%2C%22standardConcept%22%3A%5B%22S%22%5D%2C%22validity%22%3A%5B%5D%7D',
    (req, res) => {
      console.log('Request query:', req.query)
      console.log('Request body:', req.body)

      res.status(501).json({
        error: 'WebAPI endpoint not implemented yet',
        message: 'This endpoint will be changed in another PR, putting it here for visibility only',
        method: 'GET',
        path: '/terminology/fhir/4_0_0/valueset/$expand',
        timestamp: new Date().toISOString(),
      })
    }
  )

  // GET /ui/sap/ui/core/EventBus.js (Static File)
  app.get('/ui/sap/ui/core/EventBus.js', (req, res) => {
    console.log('Serving static file:', '/ui/sap/ui/core/EventBus.js')

    const mockResponse = mockData.GET__ui_sap_ui_core_EventBus_js

    // Set appropriate content type
    res.set('Content-Type', 'text/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/m/library.js (Static File)
  app.get('/ui/sap/m/library.js', (req, res) => {
    console.log('Serving static file:', '/ui/sap/m/library.js')

    const mockResponse = mockData.GET__ui_sap_m_library_js

    // Set appropriate content type
    res.set('Content-Type', 'text/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /ui/sap/m/Support.js (Static File)
  app.get('/ui/sap/m/Support.js', (req, res) => {
    console.log('Serving static file:', '/ui/sap/m/Support.js')

    const mockResponse = mockData.GET__ui_sap_m_Support_js

    // Set appropriate content type
    res.set('Content-Type', 'text/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })
}

module.exports = setupMockRoutes
