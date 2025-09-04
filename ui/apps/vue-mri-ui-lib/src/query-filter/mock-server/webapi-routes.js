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
      // we could loop through all the statuses to find which has completed generations with records, but it will be very slow
      // GET https://atlas-demo.ohdsi.org/WebAPI/notifications?hide_statuses=

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

  // GET /d2e-webapi/cohortdefinition/1/generate/4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e
  app.get('/d2e-webapi/cohortdefinition/:cohortDefinitionId/generate/:datasetId', async (req, res) => {
    logRequest(req)

    // datasetId not used for demo purpose
    const { cohortDefinitionId, datasetId } = req.params

    // using hardcoded sourceKey from GET https://atlas-demo.ohdsi.org/WebAPI/source/sources
    const response = await api.get(`/cohortdefinition/${cohortDefinitionId}/generate/SYNPUF1K`, req.body)

    return res.send()
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

  // GET /d2e-webapi/conceptset/:conceptSetId/expression
  app.get('/d2e-webapi/conceptset/:conceptSetId/expression', async (req, res) => {
    logRequest(req)

    const { conceptSetId } = req.params
    const { datasetId } = req.query

    if (!conceptSetId) {
      return res.status(400).json({ error: 'conceptSetId is required' })
    }

    try {
      // Call Atlas demo API to get concept set expression
      const response = await api.get(`/conceptset/${conceptSetId}/expression`)
      const { data } = response

      // The Atlas API returns the expression directly, just forward it
      return res.json(data)
    } catch (error) {
      console.error('Error fetching concept set expression from Atlas API:', error.message)

      // Forward the error status instead of sending mock data
      const status = error.response?.status || 500
      return res.status(status).json({
        error: 'Failed to fetch concept set expression from Atlas API',
        message: error.message,
        conceptSetId: conceptSetId,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // GET /d2e-webapi/conceptset
  app.get('/d2e-webapi/conceptset', async (req, res) => {
    const cacheKey = 'get_/d2e-webapi/conceptset'
    logRequest(req)

    let data = cache[cacheKey]
    if (!data || !USE_CACHE) {
      const response = await api.get('/conceptset/')
      data = response.data
      cache[cacheKey] = data
    }

    // Map Atlas API format to d2e-webapi format
    const mappedData = data.map(item => ({
      id: item.id,
      name: item.name,
      createdDate: item.createdDate ? new Date(item.createdDate).toISOString() : undefined,
      modifiedDate: item.modifiedDate ? new Date(item.modifiedDate).toISOString() : undefined,
      createdBy: 'admin',
      modifiedBy: 'admin',
      shared: item.hasWriteAccess || false,
      userName: 'current_user',
    }))

    return res.json(mappedData)
  })

  // POST /d2e-webapi/conceptset
  app.post('/d2e-webapi/conceptset', async (req, res) => {
    logRequest(req)

    try {
      // Create the concept set - the client will handle adding items separately
      const createResponse = await api.post('/conceptset/', req.body)
      const { data: conceptSet } = createResponse
      const conceptSetId = conceptSet.id

      console.log(`Created concept set with ID: ${conceptSetId}`)

      // Return the concept set ID as expected by our client code
      return res.json(conceptSetId)
    } catch (error) {
      console.error('Error creating concept set in Atlas API:', error.message)

      // Forward the error status instead of sending mock data
      const status = error.response?.status || 500
      return res.status(status).json({
        error: 'Failed to create concept set in Atlas API',
        message: error.message,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // PUT /d2e-webapi/conceptset/:conceptSetId/items
  app.put('/d2e-webapi/conceptset/:conceptSetId/items', async (req, res) => {
    logRequest(req)

    const { conceptSetId } = req.params

    if (!conceptSetId) {
      return res.status(400).json({ error: 'conceptSetId is required' })
    }

    try {
      // Forward to Atlas API
      const response = await api.put(`/conceptset/${conceptSetId}/items`, req.body)
      return res.json(response.data)
    } catch (error) {
      console.error('Error updating concept set items in Atlas API:', error.message)

      // Forward the error status instead of sending mock data
      const status = error.response?.status || 500
      return res.status(status).json({
        error: 'Failed to update concept set items in Atlas API',
        message: error.message,
        conceptSetId: conceptSetId,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // POST /d2e-webapi/vocabulary/:datasetId/search
  app.post('/d2e-webapi/vocabulary/:datasetId/search', async (req, res) => {
    logRequest(req)

    const { datasetId } = req.params
    const { QUERY } = req.body

    if (!QUERY) {
      return res.status(400).json({ error: 'QUERY is required in request body' })
    }

    try {
      // Call Atlas demo API to search vocabularies
      const response = await api.get(`/vocabulary/SYNPUF1K/search?query=${QUERY}`)
      const { data } = response

      // Map from Atlas API format to the expected format
      const mappedData = data.map(item => ({
        concept_class_id: item.CONCEPT_CLASS_ID,
        concept_code: item.CONCEPT_CODE,
        concept_id: item.CONCEPT_ID,
        concept_name: item.CONCEPT_NAME,
        domain_id: item.DOMAIN_ID,
        invalid_reason: item.INVALID_REASON,
        standard_concept: item.STANDARD_CONCEPT,
        vocabulary_id: item.VOCABULARY_ID,
        valid_start_date: item.VALID_START_DATE ? new Date(item.VALID_START_DATE).toISOString().split('T')[0] : null,
        valid_end_date: item.VALID_END_DATE ? new Date(item.VALID_END_DATE).toISOString().split('T')[0] : null,
      }))

      return res.json(mappedData)
    } catch (error) {
      console.error('Error searching vocabulary in Atlas API:', error.message)

      // Forward the error status instead of sending mock data
      const status = error.response?.status || 500
      return res.status(status).json({
        error: 'Failed to search vocabulary in Atlas API',
        message: error.message,
        query: QUERY,
        datasetId: datasetId,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // Add more webapi routes here as needed
  // Example:
  // app.get('/d2e-webapi/vocabulary/search', (req, res) => {
  //   // Custom logic here
  // })
}

module.exports = setupWebapiRoutes
