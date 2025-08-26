// WebAPI Routes - Customize these endpoints as needed
// This file is NOT auto-generated and won't be overwritten by parse-har.js

const { default: axios } = require('axios')

const MAX_COHORT_DEFINITIONS = 10

const setupWebapiRoutes = app => {
  // GET /d2e-webapi/cohortdefinition/23
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

  // GET /analytics-svc/api/services/bookmark
  app.get('/analytics-svc/api/services/bookmark', async (req, res) => {
    console.log('🔄 WebAPI Request:', 'GET /analytics-svc/api/services/bookmark')
    console.log('  Query:', req.query)
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)

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

    const { data } = response

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

  // Add more webapi routes here as needed
  // Example:
  // app.get('/d2e-webapi/vocabulary/search', (req, res) => {
  //   // Custom logic here
  // })
}

module.exports = setupWebapiRoutes
