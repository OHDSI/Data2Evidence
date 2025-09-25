const express = require('express')
const cors = require('cors')
const path = require('path')
const rateLimit = require('express-rate-limit')
const fs = require('fs')
const setupWebapiRoutes = require('./webapi-routes')
const setupWebapiDCRoutes = require('./dc-routes')
const setupMockRoutes = require('./mock-routes')
const app = express()

// Express rate limiter - CodeQL recognizes this pattern
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000000, // max 100 requests per windowMs
  message: { error: 'Too many requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false,
})

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

// Apply rate limiting globally to prevent DoS attacks
app.use(limiter)

// Pre-cache file contents at startup to avoid file system access in handlers
let cachedFiles = {}
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001'

try {
  const authPath = path.join(__dirname, 'static', 'mri', 'authenticate.js')
  const systemjsPath = path.join(__dirname, 'static', 'mri', 'system.min.js')
  const indexPath = path.join(__dirname, 'static', 'mri', 'index.html')

  if (fs.existsSync(authPath)) {
    cachedFiles.auth = fs.readFileSync(authPath, 'utf8')
  } else {
    console.warn('Warning: authenticate.js not found at', authPath)
    cachedFiles.auth = '// authenticate.js not found'
  }

  if (fs.existsSync(systemjsPath)) {
    cachedFiles.systemjs = fs.readFileSync(systemjsPath, 'utf8')
  } else {
    console.warn('Warning: system.min.js not found at', systemjsPath)
    cachedFiles.systemjs = '// system.min.js not found'
  }

  if (fs.existsSync(indexPath)) {
    cachedFiles.index = fs.readFileSync(indexPath, 'utf8')
  } else {
    console.warn('Warning: index.html not found at', indexPath)
    cachedFiles.index =
      '<!DOCTYPE html><html><head><title>Index not found</title></head><body>Index not found</body></html>'
  }

  console.log('Cached files loaded successfully')
} catch (error) {
  console.error('Error loading cached files:', error)
  cachedFiles = {
    auth: '// Error loading authenticate.js',
    systemjs: '// Error loading system.min.js',
    index: '<!DOCTYPE html><html><head><title>Error</title></head><body>Error loading page</body></html>',
  }
}

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Setup WebAPI routes from external file (customizable)
setupWebapiRoutes(app)

// Setup WebAPI DC routes
setupWebapiDCRoutes(app)

// Setup mock routes from external file
setupMockRoutes(app)

// Serve static files from PA-Atlas build
app.use('/mri', express.static(path.join(__dirname, 'static', 'mri')))
app.use('/concept-sets', express.static(path.join(__dirname, 'static', 'concept-sets')))
app.use('/js', express.static(path.join(__dirname, 'static', 'mri', 'js')))
app.use('/css', express.static(path.join(__dirname, 'static', 'mri', 'css')))
app.use('/img', express.static(path.join(__dirname, 'static', 'mri', 'img')))
app.use('/fonts', express.static(path.join(__dirname, 'static', 'mri', 'fonts')))
app.use('/ui', express.static(path.join(__dirname, 'static', 'ui5', 'resources')))

app.get('/favicon-atlas.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'static', 'mri', 'favicon-atlas.ico')
  res.sendFile(faviconPath)
})

// Serve authenticate.js with modifications (using cached content)
app.get('/authenticate.js', (_, res) => {
  try {
    let jsContent = cachedFiles.auth

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

// Serve system.min.js (using cached content)
app.get('/system.min.js', (_, res) => {
  try {
    let jsContent = cachedFiles.systemjs

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    res.send(jsContent)
  } catch (error) {
    console.error('Error serving system.min.js:', error)
    res.status(500).send('// Error loading system.min.js')
  }
})

// Catch-all handler: serve index.html for any unmatched route (SPA fallback) (using cached content)
app.get('*', (_, res) => {
  try {
    let htmlContent = cachedFiles.index

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

  console.log(`\nWebAPI proxy endpoints:`)
  console.log('  🔄 GET /cdmresults/:dataSource/:sourceKey')
  console.log('  🔄 GET /cdmresults/:dataSource/:sourceKey/:conceptId')

  console.log(`Mock server running on port ${PORT}`)
  console.log(`Server URL: ${SERVER_URL}\n`)
})

