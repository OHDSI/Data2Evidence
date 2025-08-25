const express = require('express')
const cors = require('cors')
const mockData = require('./mock-data.json')
const app = express()

app.use(cors())
app.use(express.json())

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

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

// GET /analytics-svc/api/services/bookmark (API)
app.get('/analytics-svc/api/services/bookmark', (req, res) => {
  console.log('Request query:', req.query)
  console.log('Request body:', req.body)

  const mockResponse = mockData.GET__analytics_svc_api_services_bookmark
  res.status(mockResponse.status).json(mockResponse.body)
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
app.get('/analytics-svc/api/services/values', (req, res) => {
  console.log('Request query:', req.query)
  console.log('Request body:', req.body)

  const mockResponse = mockData.GET__analytics_svc_api_services_values
  res.status(mockResponse.status).json(mockResponse.body)
})

// GET /d2e-webapi/cohortdefinition/23 (WebAPI Placeholder)
app.get('/d2e-webapi/cohortdefinition/23', (req, res) => {
  console.log('🔄 WebAPI Request:', 'GET /d2e-webapi/cohortdefinition/23')
  console.log('  Query:', req.query)
  console.log('  Body:', req.body)
  console.log('  Headers:', req.headers)

  // TODO: Forward to actual WebAPI server
  res.status(501).json({
    error: 'WebAPI endpoint not implemented yet',
    message: 'This endpoint will be forwarded to the actual WebAPI server',
    method: 'GET',
    path: '/d2e-webapi/cohortdefinition/23',
    timestamp: new Date().toISOString(),
  })
})

// POST /d2e-webapi/cohortdefinition (WebAPI Placeholder)
app.post('/d2e-webapi/cohortdefinition', (req, res) => {
  console.log('🔄 WebAPI Request:', 'POST /d2e-webapi/cohortdefinition')
  console.log('  Query:', req.query)
  console.log('  Body:', req.body)
  console.log('  Headers:', req.headers)

  // TODO: Forward to actual WebAPI server
  res.status(501).json({
    error: 'WebAPI endpoint not implemented yet',
    message: 'This endpoint will be forwarded to the actual WebAPI server',
    method: 'POST',
    path: '/d2e-webapi/cohortdefinition',
    timestamp: new Date().toISOString(),
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`)
  console.log(`Available mock endpoints:`)
  console.log('  ✅ GET /oidc/auth')
  console.log('  ✅ GET /authenticate.js')
  console.log('  ✅ GET /ui/sap-ui-core.js')
  console.log('  ✅ GET /js/chunk-vendors.js')
  console.log('  ✅ GET /js/app.js')
  console.log('  ✅ GET /ui/sap/ui/core/library-preload.js')
  console.log('  ✅ GET /ui/sap/m/library-preload.js')
  console.log('  ✅ GET /ui/sap/ui/core/messagebundle_en_GB.properties')
  console.log('  ✅ GET /ui/sap/ui/core/messagebundle_en.properties')
  console.log('  ✅ GET /ui/sap/m/messagebundle_en_GB.properties')
  console.log('  ✅ GET /ui/sap/m/messagebundle_en.properties')
  console.log('  ✅ GET /ui/sap/ui/core/themes/sap_belize/library.css')
  console.log('  ✅ GET /ui/sap/m/themes/sap_belize/library.css')
  console.log('  ✅ GET /analytics-svc/pa/services/analytics.xsjs')
  console.log('  ✅ GET /js/node_modules_d4l_web-components-library_dist_esm_d4l-button_2_entry_js.js')
  console.log('  ✅ GET /analytics-svc/api/services/bookmark')
  console.log('  ✅ GET /analytics-svc/api/services/population/json/barchart')
  console.log('  ✅ GET /analytics-svc/api/services/population/json/patientcount')
  console.log('  ✅ GET /analytics-svc/api/services/values')
  console.log(`\nWebAPI placeholder endpoints:`)
  console.log('  🔄 GET /d2e-webapi/cohortdefinition/23 (placeholder)')
  console.log('  🔄 POST /d2e-webapi/cohortdefinition (placeholder)')
})

