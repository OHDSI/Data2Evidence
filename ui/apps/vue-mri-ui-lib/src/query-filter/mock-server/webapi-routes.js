// WebAPI Routes - Customize these endpoints as needed
// This file is NOT auto-generated and won't be overwritten by parse-har.js

const { default: axios } = require('axios')

// server has 20,000
const MAX_COHORT_DEFINITIONS = 1000
const USE_CACHE = true
const cache = {}

const setupWebapiRoutes = app => {
  // GET /d2e-webapi/cohortdefinition/23
  app.get('/d2e-webapi/cohortdefinition/:cohortDefinitionId', async (req, res) => {
    console.log('🔄 WebAPI Request:', 'GET /d2e-webapi/cohortdefinition/23')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)
    console.log('Params:', req.params)

    const { cohortDefinitionId } = req.params

    const response = await axios.get(`https://atlas-demo.ohdsi.org/WebAPI/cohortdefinition/${cohortDefinitionId}`, {
      headers: {
        'sec-ch-ua-platform': '"macOS"',
        Authorization: 'null',
        Referer: 'https://atlas-demo.ohdsi.org/',
        'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        'sec-ch-ua-mobile': '?0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Action-Location': 'https://atlas-demo.ohdsi.org/#/cohortdefinitions',
      },
    })

    const { data } = response

    const sample = {
      id: 1794148,
      name: 'New Cohort Definitionㄹㄹㄹㄹ',
      createdDate: 1756173259342,
      modifiedDate: 1756175185802,
      hasWriteAccess: false,
      hasReadAccess: false,
      tags: [],
      expressionType: 'SIMPLE_EXPRESSION',
    }

    const mapped = {
      id: data.id,
      name: data.name,
      description: '',
      expressionType: data.expressionType,
      expression: JSON.parse(data.expression),
      createdBy: 'admin',
      createdDate: data.createdDate,
      modifiedBy: 'admin',
      modifiedDate: data.modifiedDate,
      tags: data.tags,
      hasWriteAccess: data.hasWriteAccess,
      hasReadAccess: data.hasReadAccess,
    }

    return res.send(mapped)
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'GET',
      path: '/d2e-webapi/cohortdefinition/23',
      timestamp: new Date().toISOString(),
    })
  })

  // POST /d2e-webapi/cohortdefinition
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

  // PUT /d2e-webapi/cohortdefinition
  app.put('/d2e-webapi/cohortdefinition', (req, res) => {
    console.log('🔄 WebAPI Request:', 'PUT /d2e-webapi/cohortdefinition')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

    const samplePayload = {
      id: 23,
      name: 'test12',
      description: 'Atlas cohort definition created from QueryFilter',
      expressionType: 'SIMPLE_EXPRESSION',
      expression: 'expression as json not string',
      tags: [],
      createdBy: 'admin',
      createdDate: 1756177832414,
      modifiedBy: 'admin',
      modifiedDate: 1756177832414,
      hasWriteAccess: true,
      hasReadAccess: true,
    }

    const sampleResponseFromD2E = {
      id: 23,
      name: 'test12',
      description: 'Atlas cohort definition created from QueryFilter',
      expressionType: 'SIMPLE_EXPRESSION',
      expression: 'expression as a json already, not string',
      createdDate: 1756177832414,
      hasWriteAccess: true,
      hasReadAccess: true,
    }

    // TODO: Forward to actual WebAPI server
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'PUT',
      path: '/d2e-webapi/cohortdefinition',
      timestamp: new Date().toISOString(),
    })
  })

  // GET /analytics-svc/api/services/bookmark
  app.get('/analytics-svc/api/services/bookmark', async (req, res) => {
    const cacheKey = 'get_/WebAPI/cohortdefinition/'
    console.log('🔄 WebAPI Request:', 'GET /analytics-svc/api/services/bookmark')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

    let data = cache[cacheKey]
    if (!data || !USE_CACHE) {
      const response = await axios.get('https://atlas-demo.ohdsi.org/WebAPI/cohortdefinition/', {
        headers: {
          'sec-ch-ua-platform': '"macOS"',
          Authorization: 'null',
          Referer: 'https://atlas-demo.ohdsi.org/',
          'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          'sec-ch-ua-mobile': '?0',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
          Accept: '*/*',
          'Action-Location': 'https://atlas-demo.ohdsi.org/#/cohortdefinitions',
        },
      })

      data = response.data
      cache[cacheKey] = data
    }

    const mappedData = []
    for (let i = 0; i < MAX_COHORT_DEFINITIONS; i += 1) {
      const d = data[i]
      mappedData[i] = {
        id: d.id,
        name: d.name,
        username: 'current_user',
        createdOn: new Date(d.createdDate).toISOString(),
        updatedOn: new Date(d.createdDate).toISOString(),
      }
    }

    const sample = {
      id: 98149,
      name: 'Humira + MI',
      createdDate: 1489065125084,
      hasWriteAccess: false,
      hasReadAccess: false,
      tags: [],
    }

    const resData = {
      atlasCohortDefinitions: [
        {
          id: 1,
          name: 'Atlas Cohort',
          username: 'current_user',
          createdOn: '2025-06-19T21:08:09.028Z',
          updatedOn: '2025-06-19T21:08:09.028Z',
        },
        ...mappedData,
      ],
      bookmarks: [],
      materializedCohorts: [],
    }
    return res.send({
      atlasCohortDefinitions: [
        {
          id: 1,
          name: 'Atlas Cohort',
          username: 'current_user',
          createdOn: '2025-06-19T21:08:09.028Z',
          updatedOn: '2025-06-19T21:08:09.028Z',
        },
        ...mappedData,
      ],
      bookmarks: [],
      materializedCohorts: [],
    })

    // TODO: Forward to actual WebAPI server
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'GET',
      path: '/analytics-svc/api/services/bookmark',
      timestamp: new Date().toISOString(),
    })
  })

  // GET /analytics-svc/api/services/values
  app.get('/analytics-svc/api/services/values', (req, res) => {
    console.log('🔄 WebAPI Request:', 'GET /analytics-svc/api/services/values')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

    return res.send({
      data: [
        {
          value: 13,
          text: 'A concept set',
        },
      ],
    })

    // TODO: Forward to actual WebAPI server
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'GET',
      path: '/analytics-svc/api/services/values',
      timestamp: new Date().toISOString(),
    })
  })

  // GET /d2e-webapi/cohortdefinition/1/generate/4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e
  app.get('/d2e-webapi/cohortdefinition/1/generate/4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e', (req, res) => {
    console.log(
      '🔄 WebAPI Request:',
      'GET /d2e-webapi/cohortdefinition/1/generate/4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e'
    )
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

    // TODO: Forward to actual WebAPI server
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'GET',
      path: '/d2e-webapi/cohortdefinition/1/generate/4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e',
      timestamp: new Date().toISOString(),
    })
  })

  // DELETE /d2e-webapi/cohortdefinition/1
  app.delete('/d2e-webapi/cohortdefinition/1', (req, res) => {
    console.log('🔄 WebAPI Request:', 'DELETE /d2e-webapi/cohortdefinition/1')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

    // TODO: Forward to actual WebAPI server
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'DELETE',
      path: '/d2e-webapi/cohortdefinition/1',
      timestamp: new Date().toISOString(),
    })
  })

  // GET /terminology/concept-set
  app.get('/terminology/concept-set', (req, res) => {
    console.log('🔄 WebAPI Request:', 'GET /terminology/concept-set')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

    const sample = [
      {
        name: 'Hypothyroidism other than Hashimotos Disease',
        shared: false,
        concepts: [
          {
            id: 4099205,
            useMapped: false,
            isExcluded: false,
            useDescendants: true,
          },
          {
            id: 4030049,
            useMapped: false,
            isExcluded: false,
            useDescendants: true,
          },
        ],
        userName: 'system',
        createdBy: 'evla8ah3cuir',
        modifiedBy: 'evla8ah3cuir',
        createdDate: '2025-06-23T02:32:05.200Z',
        modifiedDate: '2025-06-23T02:32:05.200Z',
        id: 13,
      },
    ]

    return res.send(sample)

    // TODO: Forward to actual WebAPI server
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'GET',
      path: '/terminology/concept-set',
      timestamp: new Date().toISOString(),
    })
  })
  // GET /terminology/concept-set
  app.post('/terminology/concept-set', (req, res) => {
    console.log('🔄 WebAPI Request:', 'POST /terminology/concept-set')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

    const samplePayload = {
      concepts: [
        {
          id: 756039,
          useDescendants: false,
          useMapped: false,
          isExcluded: false,
        },
      ],
      name: 'test',
      shared: false,
      userName: 'admin',
    }

    return res.json(123)

    // TODO: Forward to actual WebAPI server
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'GET',
      path: '/terminology/concept-set',
      timestamp: new Date().toISOString(),
    })
  })

  app.put('/terminology/concept-set', (req, res) => {
    console.log('🔄 WebAPI Request:', 'PUT /terminology/concept-set')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

    const samplePayload = {
      concepts: [
        {
          id: 756039,
          useDescendants: false,
          useMapped: false,
          isExcluded: false,
        },
      ],
      name: 'test',
      shared: false,
      userName: 'admin',
    }

    return res.json(123)

    // TODO: Forward to actual WebAPI server
    res.status(501).json({
      error: 'WebAPI endpoint not implemented yet',
      message: 'This endpoint will be forwarded to the actual WebAPI server',
      method: 'GET',
      path: '/terminology/concept-set',
      timestamp: new Date().toISOString(),
    })
  })

  app.get(
    '/terminology/fhir/4_0_0/valueset/$expand?datasetId=4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e&offset=0&count=25&code=&filter=%7B%22conceptClassId%22%3A%5B%5D%2C%22domainId%22%3A%5B%22Condition%22%5D%2C%22vocabularyId%22%3A%5B%5D%2C%22standardConcept%22%3A%5B%22S%22%5D%2C%22validity%22%3A%5B%5D%7D',
    (req, res) => {
      // TODO: Forward to actual WebAPI server
      res.status(501).json({
        error: 'WebAPI endpoint not implemented yet',
        message: 'This endpoint will be changed in another PR, putting it here for visibility only',
        method: 'GET',
        path: '/terminology/concept-set',
        timestamp: new Date().toISOString(),
      })
    }
  )

  // Add more webapi routes here as needed
  // Example:
  // app.get('/d2e-webapi/vocabulary/search', (req, res) => {
  //   // Custom logic here
  // })
}

module.exports = setupWebapiRoutes
