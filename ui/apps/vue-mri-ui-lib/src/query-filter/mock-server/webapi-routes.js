// WebAPI Routes - Customize these endpoints as needed
// This file is NOT auto-generated and won't be overwritten by parse-har.js

const { default: axios } = require('axios')
const _ = require('lodash')

const api = axios.create({
  baseURL: 'https://atlas-demo.ohdsi.org/WebAPI',
})

// server has 20,000
const MAX_COHORT_DEFINITIONS = 100
const USE_CACHE = true
const cache = {}

const logRequest = req => {
  console.log(`🔄 WebAPI Request:', '${req.method} ${req.path}`)
  console.log('Query:', req.query)
  console.log('Body:', req.body)
  console.log('Headers:', req.headers)
  console.log('Params:', req.params)
}

/**
 * @param {import('express').Application} app
 */
const setupWebapiRoutes = app => {
  // GET /d2e-webapi/cohortdefinition/23
  app.get('/d2e-webapi/cohortdefinition/:cohortDefinitionId', async (req, res) => {
    logRequest(req)

    const { cohortDefinitionId } = req.params

    const response = await api.get(`/cohortdefinition/${cohortDefinitionId}`)

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
  app.post('/d2e-webapi/cohortdefinition', async (req, res) => {
    logRequest(req)

    const skeleton = {
      ConceptSets: [],
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: {
          PriorDays: 0,
          PostDays: 0,
        },
        PrimaryCriteriaLimit: {
          Type: 'First',
        },
      },
      QualifiedLimit: {
        Type: 'First',
      },
      ExpressionLimit: {
        Type: 'First',
      },
      InclusionRules: [],
      CensoringCriteria: [],
      CollapseSettings: {
        CollapseType: 'ERA',
        EraPad: 0,
      },
      CensorWindow: {
        StartDate: null,
        EndDate: null,
      },
      cdmVersionRange: null,
    }
    const expression = _.merge(skeleton, req.body.expression)
    const response = await api.post(`/cohortdefinition/`, { ...req.body, expression })

    const d2eBody = {
      name: 'New Atlas Cohort',
      description: 'Atlas cohort definition created from QueryFilter',
      expressionType: 'SIMPLE_EXPRESSION',
      expression: {
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                Age: {
                  Op: 'lt',
                  Value: 50,
                },
              },
            },
          ],
          ObservationWindow: {
            PriorDays: 0,
            PostDays: 0,
          },
          PrimaryCriteriaLimit: {
            Type: 'All',
          },
        },
        QualifiedLimit: {
          Type: 'All',
        },
        ExpressionLimit: {
          Type: 'All',
        },
        InclusionRules: [],
        EndStrategy: {},
        CensoringCriteria: [],
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 0,
        },
        CensorWindow: {},
      },
      tags: [],
      createdBy: 'admin',
      createdDate: 1756361858821,
      modifiedBy: 'admin',
      modifiedDate: 1756361858821,
      hasWriteAccess: true,
      hasReadAccess: true,
      id: 0,
    }

    const sampleResponse = {
      id: 1794178,
      name: 'd11321',
      createdDate: 1756361687877,
      hasWriteAccess: false,
      hasReadAccess: false,
      expressionType: 'SIMPLE_EXPRESSION',
      expression: {
        cdmVersionRange: '>=5.0.0',
        PrimaryCriteria: {
          CriteriaList: [],
          ObservationWindow: {
            PriorDays: 0,
            PostDays: 0,
          },
          PrimaryCriteriaLimit: {
            Type: 'First',
          },
        },
        ConceptSets: [],
        QualifiedLimit: {
          Type: 'First',
        },
        ExpressionLimit: {
          Type: 'First',
        },
        InclusionRules: [],
        CensoringCriteria: [],
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 0,
        },
        CensorWindow: {},
      },
    }

    const d2eResponse = {
      id: 24,
      name: 'New Atlas Cohort',
      description: 'Atlas cohort definition created from QueryFilter',
      expressionType: 'SIMPLE_EXPRESSION',
      expression: {
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                Age: {
                  Op: 'lt',
                  Value: 50,
                },
              },
            },
          ],
          ObservationWindow: {
            PriorDays: 0,
            PostDays: 0,
          },
          PrimaryCriteriaLimit: {
            Type: 'All',
          },
        },
        QualifiedLimit: {
          Type: 'All',
        },
        ExpressionLimit: {
          Type: 'All',
        },
        InclusionRules: [],
        EndStrategy: {},
        CensoringCriteria: [],
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 0,
        },
        CensorWindow: {},
      },
      createdDate: 1756361866000,
      hasWriteAccess: true,
      hasReadAccess: true,
    }

    const { data } = response

    return res.send(data)

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
  app.put('/d2e-webapi/cohortdefinition/:cohortDefinitionId', async (req, res) => {
    logRequest(req)

    const { cohortDefinitionId } = req.params

    const response = await api.put(`/cohortdefinition/${cohortDefinitionId}`, req.body)
    const { data } = response
    return res.send()

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
    logRequest(req)

    let data = cache[cacheKey]
    if (!data || !USE_CACHE) {
      const response = await api.get('/cohortdefinition/')

      data = response.data
      cache[cacheKey] = data
    }

    const mappedData = []

    // data = [data.find(d => d.name === 'Kohorte 1')]

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
    logRequest(req)

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
    logRequest(req)

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
  app.delete('/d2e-webapi/cohortdefinition/:cohortDefinitionId', async (req, res) => {
    logRequest(req)
    const { cohortDefinitionId } = req.params

    const response = await api.delete(`/cohortdefinition/${cohortDefinitionId}`, req.body)
    return res.send()
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
    logRequest(req)

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
  // POST /terminology/concept-set
  app.post('/terminology/concept-set', (req, res) => {
    logRequest(req)

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
    logRequest(req)

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
