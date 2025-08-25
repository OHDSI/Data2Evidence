const fs = require('fs')
const path = require('path')

// Read both HAR files
const harPath = path.join(__dirname, 'localhost1.har')
const webapiHarPath = path.join(__dirname, 'webapi.har')

const harContent = JSON.parse(fs.readFileSync(harPath, 'utf8'))
const webapiHarContent = JSON.parse(fs.readFileSync(webapiHarPath, 'utf8'))

// Extract API endpoints and their responses
const apiEndpoints = []
const webapiEndpoints = []

harContent.log.entries.forEach(entry => {
  const request = entry.request
  const response = entry.response

  // Filter for API calls AND static assets needed by the app
  if (
    request.url.includes('/api/') ||
    request.url.includes('analytics-svc') ||
    request.url.includes('portal') ||
    request.url.includes('/ui/') ||
    request.url.includes('/js/') ||
    request.url.includes('/sap/') ||
    request.url.includes('/hc/') ||
    request.url.includes('/oidc/') ||
    request.url.includes('/oauth/') ||
    request.url.includes('authenticate.js') ||
    request.headers.some(h => h.name.toLowerCase() === 'accept' && h.value.includes('application/json'))
  ) {
    const url = new URL(request.url)
    const endpoint = {
      method: request.method,
      path: url.pathname + url.search,
      pathOnly: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: request.headers.reduce((acc, h) => {
        acc[h.name.toLowerCase()] = h.value
        return acc
      }, {}),
      requestBody: null,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers.reduce((acc, h) => {
          acc[h.name.toLowerCase()] = h.value
          return acc
        }, {}),
        body: null,
      },
    }

    // Extract request body if present
    if (request.postData && request.postData.text) {
      try {
        endpoint.requestBody = JSON.parse(request.postData.text)
      } catch (e) {
        endpoint.requestBody = request.postData.text
      }
    }

    // Extract response body
    if (response.content && response.content.text) {
      try {
        endpoint.response.body = JSON.parse(response.content.text)
      } catch (e) {
        endpoint.response.body = response.content.text
      }
    }

    apiEndpoints.push(endpoint)
  }
})

// Process webapi HAR file for placeholder endpoints
webapiHarContent.log.entries.forEach(entry => {
  const request = entry.request
  const response = entry.response

  // Filter for webapi endpoints
  if (request.url.includes('d2e-webapi') || request.url.includes('webapi')) {
    const url = new URL(request.url)
    const endpoint = {
      method: request.method,
      path: url.pathname + url.search,
      pathOnly: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: request.headers.reduce((acc, h) => {
        acc[h.name.toLowerCase()] = h.value
        return acc
      }, {}),
      requestBody: null,
    }

    // Extract request body if present
    if (request.postData && request.postData.text) {
      try {
        endpoint.requestBody = JSON.parse(request.postData.text)
      } catch (e) {
        endpoint.requestBody = request.postData.text
      }
    }

    webapiEndpoints.push(endpoint)
  }
})

console.log(`Found ${apiEndpoints.length} mock API endpoints`)
console.log(`Found ${webapiEndpoints.length} webapi placeholder endpoints`)

// Group endpoints by path for better organization
const groupedEndpoints = {}
apiEndpoints.forEach(endpoint => {
  const key = `${endpoint.method} ${endpoint.pathOnly}`
  if (!groupedEndpoints[key]) {
    groupedEndpoints[key] = []
  }
  groupedEndpoints[key].push(endpoint)
})

// Group webapi endpoints separately for placeholder routes
const groupedWebapiEndpoints = {}
webapiEndpoints.forEach(endpoint => {
  const key = `${endpoint.method} ${endpoint.pathOnly}`
  if (!groupedWebapiEndpoints[key]) {
    groupedWebapiEndpoints[key] = []
  }
  groupedWebapiEndpoints[key].push(endpoint)
})

// Write endpoints to JSON file for review
fs.writeFileSync(path.join(__dirname, 'extracted-endpoints.json'), JSON.stringify(apiEndpoints, null, 2))

// Generate Express routes
let expressRoutes = `const express = require('express')
const cors = require('cors')
const mockData = require('./mock-data.json')
const app = express()

app.use(cors())
app.use(express.json())

// Middleware to log requests
app.use((req, res, next) => {
  console.log(\`\${new Date().toISOString()} - \${req.method} \${req.url}\`)
  next()
})
`

// Generate mock data object
const mockDataObject = {}

// Generate routes for each unique endpoint
Object.entries(groupedEndpoints).forEach(([key, endpoints]) => {
  const [method, pathOnly] = key.split(' ', 2)
  const cleanPath = pathOnly.replace(/\/$/, '') || '/'

  // Use the first endpoint as the template (they should be similar)
  const templateEndpoint = endpoints[0]

  // Store mock data with a unique key
  const dataKey = key.replace(/[^a-zA-Z0-9]/g, '_')
  mockDataObject[dataKey] = {
    status: templateEndpoint.response.status,
    headers: templateEndpoint.response.headers,
    body: templateEndpoint.response.body,
  }

  // Determine if this is a static file or API endpoint
  const isStaticFile =
    !cleanPath.includes('/api/') &&
    !cleanPath.includes('/oidc/') &&
    !cleanPath.includes('/oauth/') &&
    (cleanPath.includes('/ui/') ||
      cleanPath.includes('/js/') ||
      cleanPath.includes('/sap/') ||
      cleanPath.includes('/hc/') ||
      cleanPath.endsWith('.js') ||
      cleanPath.endsWith('.css'))

  if (isStaticFile) {
    // Handle static files
    expressRoutes += `
// ${key} (Static File)
app.${method.toLowerCase()}('${cleanPath}', (req, res) => {
  console.log('Serving static file:', '${cleanPath}')
  
  const mockResponse = mockData.${dataKey}
  
  // Set appropriate content type
  ${
    templateEndpoint.response.headers['content-type']
      ? `res.set('Content-Type', '${templateEndpoint.response.headers['content-type']}')`
      : "res.set('Content-Type', 'text/javascript')"
  }
  
  res.status(mockResponse.status).send(mockResponse.body)
})
`
  } else {
    // Handle API endpoints
    expressRoutes += `
// ${key} (API)
app.${method.toLowerCase()}('${cleanPath}', (req, res) => {
  console.log('Request query:', req.query)
  console.log('Request body:', req.body)
  
  const mockResponse = mockData.${dataKey}
  res.status(mockResponse.status).json(mockResponse.body)
})
`
  }
})

// Generate webapi placeholder routes
Object.entries(groupedWebapiEndpoints).forEach(([key, endpoints]) => {
  const [method, pathOnly] = key.split(' ', 2)
  const cleanPath = pathOnly.replace(/\/$/, '') || '/'

  const templateEndpoint = endpoints[0]

  expressRoutes += `
// ${key} (WebAPI Placeholder)
app.${method.toLowerCase()}('${cleanPath}', (req, res) => {
  console.log('🔄 WebAPI Request:', '${method} ${cleanPath}')
  console.log('  Query:', req.query)
  console.log('  Body:', req.body)
  console.log('  Headers:', req.headers)
  
  // TODO: Forward to actual WebAPI server
  res.status(501).json({
    error: 'WebAPI endpoint not implemented yet',
    message: 'This endpoint will be forwarded to the actual WebAPI server',
    method: '${method}',
    path: '${cleanPath}',
    timestamp: new Date().toISOString()
  })
})
`
})

expressRoutes += `
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(\`Mock server running on port \${PORT}\`)
  console.log(\`Available mock endpoints:\`)
${Object.keys(groupedEndpoints)
  .map(key => `  console.log('  ✅ ${key}')`)
  .join('\n')}
  console.log(\`\\nWebAPI placeholder endpoints:\`)
${Object.keys(groupedWebapiEndpoints)
  .map(key => `  console.log('  🔄 ${key} (placeholder)')`)
  .join('\n')}
})
`

// Write the mock data file
fs.writeFileSync(path.join(__dirname, 'mock-data.json'), JSON.stringify(mockDataObject, null, 2))

// Write the Express server file
fs.writeFileSync(path.join(__dirname, 'server.js'), expressRoutes)

console.log('Mock server generated successfully!')
console.log('Generated files:')
console.log('- extracted-endpoints.json (for review)')
console.log('- mock-data.json (response data)')
console.log('- server.js (Express mock server)')
console.log('\nTo run the mock server:')
console.log('1. npm install express cors')
console.log('2. node server.js')
