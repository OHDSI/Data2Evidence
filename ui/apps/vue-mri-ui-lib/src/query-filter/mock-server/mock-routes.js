const mockData = require('./mock-data.json')
const mockConfig = require('./mock-config.json')

/**
 * Replace hardcoded URLs in mock response body with environment variable
 * @param {string|object} body - Response body (string or object)
 * @returns {string|object} - Body with URLs replaced
 */
const replaceMockDataUrls = body => {
  const SERVER_URL = process.env.SERVER_URL || 'https://localhost:8081'

  if (typeof body === 'string') {
    return body.replace(/https:\/\/localhost:8081/g, SERVER_URL)
  } else if (typeof body === 'object' && body !== null) {
    return JSON.parse(JSON.stringify(body).replace(/https:\/\/localhost:8081/g, SERVER_URL))
  }

  return body
}

/**
 * Get mock response with URL replacement
 * @param {object} mockResponse - Mock response object
 * @returns {object} - Mock response with URLs replaced
 */
const getMockResponse = mockResponse => {
  return {
    ...mockResponse,
    body: replaceMockDataUrls(mockResponse.body),
  }
}

/**
 * @param {import('express').Application} app
 */
const setupMockRoutes = app => {
  // GET /oidc/auth (API)
  app.get('/oidc/auth', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    const mockResponse = getMockResponse(mockData.GET__oidc_auth)
    res.status(mockResponse.status).json(mockResponse.body)
  })

  // GET /js/chunk-vendors.js (Static File)
  app.get('/js/chunk-vendors.js', (req, res) => {
    console.log('Serving static file:', '/js/chunk-vendors.js')

    const mockResponse = getMockResponse(mockData.GET__js_chunk_vendors_js)

    // Set appropriate content type
    res.set('Content-Type', 'application/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /js/app.js (Static File)
  app.get('/js/app.js', (req, res) => {
    console.log('Serving static file:', '/js/app.js')

    const mockResponse = getMockResponse(mockData.GET__js_app_js)

    // Set appropriate content type
    res.set('Content-Type', 'application/javascript; charset=utf-8')

    res.status(mockResponse.status).send(mockResponse.body)
  })

  // GET /analytics-svc/pa/services/analytics.xsjs (API)
  app.get('/analytics-svc/pa/services/analytics.xsjs', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    // Handle getMyConfig action specifically
    if (req.query.action === 'getMyConfig') {
      console.log('Serving getMyConfig for datasetId:', req.query.datasetId)
      res.status(200).json(mockConfig)
      return
    }

    const mockResponse = getMockResponse(mockData.GET__analytics_svc_pa_services_analytics_xsjs)
    res.status(mockResponse.status).json(mockResponse.body)
  })

  // GET /js/node_modules_d4l_web-components-library_dist_esm_d4l-button_2_entry_js.js (Static File)
  app.get('/js/node_modules_d4l_web-components-library_dist_esm_d4l-button_2_entry_js.js', (req, res) => {
    res.redirect('/static/@d4l/web-components-library/d4l-button_2.entry.js')
  })

  // GET /analytics-svc/api/services/population/json/barchart (API)
  app.get('/analytics-svc/api/services/population/json/barchart', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    const mockResponse = getMockResponse(mockData.GET__analytics_svc_api_services_population_json_barchart)
    res.status(mockResponse.status).json(mockResponse.body)
  })

  // GET /analytics-svc/api/services/population/json/patientcount (API)
  app.get('/analytics-svc/api/services/population/json/patientcount', (req, res) => {
    console.log('Request query:', req.query)
    console.log('Request body:', req.body)

    const mockResponse = getMockResponse(mockData.GET__analytics_svc_api_services_population_json_patientcount)
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
}

module.exports = setupMockRoutes
