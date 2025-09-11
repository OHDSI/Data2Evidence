const express = require('express')
const cors = require('cors')
const path = require('path')
const setupWebapiRoutes = require('./webapi-routes')
const setupMockRoutes = require('./mock-routes')
const app = express()

// Global error handlers
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error)
  console.error('Stack trace:', error.stack)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise)
  console.error('Reason:', reason)
})

app.use(cors())
app.use(express.json())

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Setup WebAPI routes from external file (customizable)
setupWebapiRoutes(app)

// Setup mock routes from external file
setupMockRoutes(app)

// Serve static files from PA-Atlas build
app.use('/mri', express.static(path.join(__dirname, 'static', 'mri')))
app.use('/js', express.static(path.join(__dirname, 'static', 'mri', 'js')))
app.use('/css', express.static(path.join(__dirname, 'static', 'mri', 'css')))
app.use('/img', express.static(path.join(__dirname, 'static', 'mri', 'img')))
app.use('/fonts', express.static(path.join(__dirname, 'static', 'mri', 'fonts')))
app.use('/ui', express.static(path.join(__dirname, 'static', 'ui5', 'resources')))

// Serve authenticate.js with modifications
app.get('/authenticate.js', (_, res) => {
  const fs = require('fs')
  const authPath = path.join(__dirname, 'static', 'mri', 'authenticate.js')

  try {
    let jsContent = fs.readFileSync(authPath, 'utf8')

    // Apply find/replace operations
    jsContent = jsContent.replace(/const USE_MOCK_SERVER = false/g, 'const USE_MOCK_SERVER = true')
    jsContent = jsContent.replace(/https:\/\/localhost:8081/g, SERVER_URL)

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    res.send(jsContent)
  } catch (error) {
    console.error('Error serving authenticate.js:', error)
    res.status(500).send('// Error loading authenticate.js')
  }
})

// Catch-all handler: serve index.html for any unmatched route (SPA fallback)
app.get('*', (_, res) => {
  const fs = require('fs')
  const indexPath = path.join(__dirname, 'static', 'mri', 'index.html')

  try {
    let htmlContent = fs.readFileSync(indexPath, 'utf8')

    // Apply find/replace operations
    htmlContent = htmlContent.replace(/https:\/\/localhost:8081/g, SERVER_URL)
    htmlContent = htmlContent.replace(
      /float: left; position: absolute; /g,
      'float: left; position: absolute; visibility: hidden;'
    )
    if (process.env.DEBUG) {
      htmlContent = htmlContent.replace(/debug: false/g, 'debug: true')
    }

    res.setHeader('Content-Type', 'text/html')
    res.send(htmlContent)
  } catch (error) {
    console.error('Error serving index.html:', error)
    res.status(500).send('Error loading page')
  }
})

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001'
const PORT = new URL(SERVER_URL).port || 3001
app.listen(PORT, () => {
  console.log(`Server URL replacement: https://localhost:8081 -> ${SERVER_URL}`)
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
  console.log('  ✅ GET /analytics-svc/api/services/population/json/barchart')
  console.log('  ✅ GET /analytics-svc/api/services/population/json/patientcount')
  console.log('  ✅ GET /analytics-svc/api/services/values')
  console.log('  ✅ GET /terminology/fhir/4_0_0/valueset/$expand')
  console.log('  ✅ GET /ui/sap/ui/core/EventBus.js')
  console.log('  ✅ GET /ui/sap/m/library.js')
  console.log(`\nWebAPI placeholder endpoints:`)
  console.log('  🔄 GET /d2e-webapi/cohortdefinition/23 (placeholder)')
  console.log('  🔄 GET /terminology/concept-set (placeholder)')
  console.log('  🔄 POST /d2e-webapi/cohortdefinition (placeholder)')
  console.log('  🔄 GET /analytics-svc/api/services/bookmark (placeholder)')
  console.log('  🔄 GET /d2e-webapi/cohortdefinition/1/generate/4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e (placeholder)')
  console.log('  🔄 DELETE /d2e-webapi/cohortdefinition/1 (placeholder)')

  console.log(`Mock server running on port ${PORT}`)
  console.log(`Server URL: ${SERVER_URL}\n`)
})
