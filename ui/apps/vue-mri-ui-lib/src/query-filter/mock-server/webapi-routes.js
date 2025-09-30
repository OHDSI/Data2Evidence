// WebAPI Routes - Customize these endpoints as needed

const { default: axios } = require('axios')
const _ = require('lodash')

const api = axios.create({
  baseURL: process.env.WEBAPI_URL || 'http://alp-dev-sg-3.southeastasia.cloudapp.azure.com/WebAPI',
})

const SOURCE = process.env.SOURCE || 'EUNOMIA'

console.log('WEBAPI_URL:', process.env.WEBAPI_URL || 'http://alp-dev-sg-3.southeastasia.cloudapp.azure.com/WebAPI')
console.log('SOURCE:', SOURCE)

// Predefined endpoint mappings to prevent SSRF
const ALLOWED_ENDPOINTS = {
  cohortdefinition: '/cohortdefinition/',
  conceptset: '/conceptset/',
  vocabulary: `/vocabulary/${SOURCE}/search`,
}

// server has 20,000
const MAX_COHORT_DEFINITIONS = 50000
const USE_CACHE = process.env.USE_CACHE?.toUpperCase() === 'TRUE' || false
console.log('USE_CACHE: ', USE_CACHE)
const cache = {}

// Cache keys
const CACHE_KEYS = {
  COHORT_DEFINITIONS: 'get_/WebAPI/cohortdefinition/',
  CONCEPT_SET: id => `get_/d2e-webapi/conceptset/${id}`,
  CONCEPT_SETS: 'get_/d2e-webapi/conceptset',
  COHORT_DEFINITION: id => `get_/d2e-webapi/cohortdefinition/${id}`,
  CONCEPT_SET_EXPRESSION: id => `get_/d2e-webapi/conceptset/${id}/expression`,
  VOCABULARY_SEARCH: (datasetId, query) => `get_/d2e-webapi/vocabulary/${datasetId}/search?query=${query}`,
  VOCABULARY_SEARCH_POST: (datasetId, body) =>
    `post_/d2e-webapi/vocabulary/${datasetId}/search/${JSON.stringify(body)}`,
}

const logRequest = req => {
  console.log(`🔄 WebAPI Request:', '${req.method} ${req.path}`)
  console.log('Query:', req.query)
  console.log('Body:', req.body)
  console.log('Headers:', req.headers)
  console.log('Params:', req.params)
}

// Input validation middleware
const validateId = paramName => (req, res, next) => {
  const id = req.params[paramName]
  if (!id || !/^\d+$/.test(id) || parseInt(id) <= 0) {
    return res.status(400).json({ error: `Invalid ${paramName}: must be a positive integer` })
  }
  next()
}

const sanitizeQuery = query => {
  if (!query || typeof query !== 'string') return ''
  // Remove potentially dangerous characters and limit length
  return encodeURIComponent(query.replace(/[<>'"&]/g, '')).substring(0, 200)
}

const validateDatasetId = (req, res, next) => {
  const { datasetId } = req.params
  if (!datasetId || !/^[a-zA-Z0-9_-]+$/.test(datasetId) || datasetId.length > 50) {
    return res
      .status(400)
      .json({ error: 'Invalid datasetId: must be alphanumeric with dashes/underscores, max 50 chars' })
  }
  next()
}

/**
 * @param {import('express').Application} app
 */
const setupWebapiRoutes = app => {
  app.get('/d2e-webapi/cohortdefinition/:cohortDefinitionId', validateId('cohortDefinitionId'), async (req, res) => {
    logRequest(req)
    const { cohortDefinitionId } = req.params
    const cacheKey = CACHE_KEYS.COHORT_DEFINITION(cohortDefinitionId)
    let data = cache[cacheKey]
    if (!data || !USE_CACHE) {
      const endpoint = ALLOWED_ENDPOINTS.cohortdefinition + cohortDefinitionId
      const response = await api.get(endpoint)
      data = response.data
      cache[cacheKey] = data
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
  })

  app.post('/d2e-webapi/cohortdefinition', async (req, res) => {
    logRequest(req)
    // Skeleton is to ensure nothing is missing that webapi expects
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
    const response = await api.post(ALLOWED_ENDPOINTS.cohortdefinition, { ...req.body, expression })
    const { data } = response

    // Invalidate cohort definitions cache since we created a new one
    delete cache[CACHE_KEYS.COHORT_DEFINITIONS]

    return res.send(data)
  })

  app.put('/d2e-webapi/cohortdefinition/:cohortDefinitionId', validateId('cohortDefinitionId'), async (req, res) => {
    logRequest(req)
    const { cohortDefinitionId } = req.params
    const endpoint = ALLOWED_ENDPOINTS.cohortdefinition + cohortDefinitionId
    await api.put(endpoint, req.body)

    // Invalidate cohort definitions cache since we updated one
    delete cache[CACHE_KEYS.COHORT_DEFINITIONS]
    delete cache[CACHE_KEYS.COHORT_DEFINITION(cohortDefinitionId)]

    return res.send()
  })

  app.get('/d2e-webapi/cohortdefinition', async (req, res) => {
    const cacheKey = CACHE_KEYS.COHORT_DEFINITIONS
    logRequest(req)
    let data = cache[cacheKey]
    if (!data || !USE_CACHE) {
      const response = await api.get(ALLOWED_ENDPOINTS.cohortdefinition)
      data = response.data
      cache[cacheKey] = data
    }
    const mappedData = []
    const maxItemCount = MAX_COHORT_DEFINITIONS - data.length ? data.length : MAX_COHORT_DEFINITIONS
    for (let i = 0; i < maxItemCount; i += 1) {
      const d = data[i]
      mappedData[i] = {
        createdBy: 'current_user',
        modifiedDate: d.createdDate,
        ...d,
      }
    }
    return res.send(mappedData)
  })

  app.get(
    '/d2e-webapi/cohortdefinition/:cohortDefinitionId/generate/:datasetId',
    validateId('cohortDefinitionId'),
    validateDatasetId,
    async (req, res) => {
      logRequest(req)
      // datasetId not used for demo purpose
      const { cohortDefinitionId, datasetId } = req.params
      // using hardcoded sourceKey from GET https://atlas-demo.ohdsi.org/WebAPI/source/sources
      const endpoint = ALLOWED_ENDPOINTS.cohortdefinition + cohortDefinitionId + '/generate/' + SOURCE
      await api.get(endpoint, req.body)
      return res.send()
    }
  )

  app.delete('/d2e-webapi/cohortdefinition/:cohortDefinitionId', validateId('cohortDefinitionId'), async (req, res) => {
    logRequest(req)
    const { cohortDefinitionId } = req.params
    const endpoint = ALLOWED_ENDPOINTS.cohortdefinition + cohortDefinitionId
    await api.delete(endpoint, req.body)

    // Invalidate cohort definitions cache since we deleted one
    delete cache[CACHE_KEYS.COHORT_DEFINITIONS]
    delete cache[CACHE_KEYS.COHORT_DEFINITION(cohortDefinitionId)]

    return res.send()
  })

  app.get('/d2e-webapi/conceptset/:conceptSetId/expression', validateId('conceptSetId'), async (req, res) => {
    logRequest(req)
    const { conceptSetId } = req.params
    const { datasetId } = req.query
    if (!conceptSetId) {
      return res.status(400).json({ error: 'conceptSetId is required' })
    }
    try {
      const cacheKey = CACHE_KEYS.CONCEPT_SET_EXPRESSION(conceptSetId)
      let data = cache[cacheKey]
      if (!data || !USE_CACHE) {
        // Call Atlas demo API to get concept set expression
        const endpoint = ALLOWED_ENDPOINTS.conceptset + conceptSetId + '/expression'
        const response = await api.get(endpoint)
        data = response.data
        cache[cacheKey] = data
      }
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

  app.get('/d2e-webapi/conceptset', async (req, res) => {
    const cacheKey = CACHE_KEYS.CONCEPT_SETS
    logRequest(req)
    let data = cache[cacheKey]
    if (!data || !USE_CACHE) {
      const response = await api.get(ALLOWED_ENDPOINTS.conceptset)
      data = response.data
      cache[cacheKey] = data
    }

    // Map Atlas API format to d2e-webapi format
    const mappedData = data.map(_mapConceptSet)
    return res.json(mappedData)
  })

  app.get('/d2e-webapi/conceptset/:conceptSetId', async (req, res) => {
    const { conceptSetId } = req.params
    if (!conceptSetId) {
      return res.status(400).json({ error: 'conceptSetId is required' })
    }

    const cacheKey = CACHE_KEYS.CONCEPT_SET(conceptSetId)
    logRequest(req)
    let data = cache[cacheKey]
    if (!data || !USE_CACHE) {
      const endpoint = ALLOWED_ENDPOINTS.conceptset + conceptSetId
      const response = await api.get(endpoint)
      data = response.data
      cache[cacheKey] = data
    }

    // Map Atlas API format to d2e-webapi format
    const mappedData = _mapConceptSet(data)

    return res.json(mappedData)
  })

  app.post('/d2e-webapi/conceptset', async (req, res) => {
    logRequest(req)
    try {
      // Create the concept set - the client will handle adding items separately
      const createResponse = await api.post(ALLOWED_ENDPOINTS.conceptset, req.body)
      const { data: conceptSet } = createResponse
      const conceptSetId = conceptSet.id
      console.log(`Created concept set with ID: ${conceptSetId}`)

      // Invalidate concept sets cache since we created a new one
      delete cache[CACHE_KEYS.CONCEPT_SETS]

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

  app.put('/d2e-webapi/conceptset/:conceptSetId', async (req, res) => {
    logRequest(req)
    const { conceptSetId } = req.params
    if (!conceptSetId) {
      return res.status(400).json({ error: 'conceptSetId is required' })
    }
    try {
      const cacheKey = CACHE_KEYS.CONCEPT_SET(conceptSetId)
      // update the concept set - the client will handle adding items separately
      const endpoint = ALLOWED_ENDPOINTS.conceptset + conceptSetId
      await api.put(endpoint, req.body)
      console.log(`Updated concept set with ID: ${conceptSetId}`)

      // Invalidate concept set cache since we updated the concept set
      delete cache[cacheKey]

      // Return the concept set ID as expected by our client code
      return res.json(conceptSetId)
    } catch (error) {
      console.error('Error updating concept set in Atlas API:', error.message)

      // Forward the error status instead of sending mock data
      const status = error.response?.status || 500
      return res.status(status).json({
        error: 'Failed to update concept set in Atlas API',
        message: error.message,
        timestamp: new Date().toISOString(),
      })
    }
  })

  app.put('/d2e-webapi/conceptset/:conceptSetId/items', validateId('conceptSetId'), async (req, res) => {
    logRequest(req)
    const { conceptSetId } = req.params
    if (!conceptSetId) {
      return res.status(400).json({ error: 'conceptSetId is required' })
    }
    try {
      // Forward to Atlas API
      const endpoint = ALLOWED_ENDPOINTS.conceptset + conceptSetId + '/items'
      const response = await api.put(endpoint, req.body)

      // Invalidate concept set caches since we updated items
      delete cache[CACHE_KEYS.CONCEPT_SETS]
      delete cache[CACHE_KEYS.CONCEPT_SET_EXPRESSION(conceptSetId)]

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

  // d2e-webapi seems to support 2 types of search api. sharing the logic here
  const searchVocab = async (req, res, datasetId, query) => {
    logRequest(req)
    if (!query && query !== '') {
      return res.status(400).json({ error: 'query parameter is required' })
    }

    // Sanitize the query parameter
    const sanitizedQuery = sanitizeQuery(query)
    if (!sanitizedQuery && sanitizedQuery !== '') {
      return res.status(400).json({ error: 'Invalid query parameter' })
    }

    try {
      const cacheKey = CACHE_KEYS.VOCABULARY_SEARCH(datasetId, sanitizedQuery)
      let data = cache[cacheKey]
      if (!data || !USE_CACHE) {
        // Call Atlas demo API to search vocabularies with sanitized query
        const endpoint = ALLOWED_ENDPOINTS.vocabulary + '?query=' + sanitizedQuery
        console.log('jer', endpoint)
        const response = await api.get(endpoint)
        data = response.data
        cache[cacheKey] = data
      }
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
        query: sanitizedQuery,
        datasetId: datasetId,
        timestamp: new Date().toISOString(),
      })
    }
  }
  // GET endpoint for vocabulary search (matches d2e-webapi pattern)
  app.get('/d2e-webapi/vocabulary/:datasetId/search', validateDatasetId, (req, res) => {
    const { datasetId } = req.params
    const { query } = req.query
    searchVocab(req, res, datasetId, query)
  })
  // GET endpoint for vocabulary search (matches d2e-webapi pattern)
  app.post('/d2e-webapi/vocabulary/:datasetId/search', validateDatasetId, (req, res) => {
    const { datasetId } = req.params
    const query = req.body.QUERY
    searchVocab(req, res, datasetId, query)
  })

  // POST /vocabulary/:dataSource/search
  app.post('/d2e-webapi/vocabulary/:dataSource/search', async (req, res) => {
    logRequest(req)
    const { dataSource } = req.params
    const body = req.body
    try {
      const cacheKey = CACHE_KEYS.VOCABULARY_SEARCH_POST(SOURCE, req.body)
      let data = cache[cacheKey]

      if (!data || !USE_CACHE) {
        // Call Atlas demo API to search vocabularies with body
        const response = await api.post(ALLOWED_ENDPOINTS.vocabulary, body)
        data = response.data
        cache[cacheKey] = data
      }

      return res.send(data)
    } catch (err) {
      console.error(err)
      return res.status(err.status).send()
    }
  })
}

module.exports = setupWebapiRoutes

const _mapConceptSet = conceptSet => {
  return {
    id: conceptSet.id,
    name: conceptSet.name,
    createdDate: conceptSet.createdDate ? new Date(conceptSet.createdDate).toISOString() : undefined,
    modifiedDate: conceptSet.modifiedDate ? new Date(conceptSet.modifiedDate).toISOString() : undefined,
    createdBy: { name: 'admin' },
    modifiedBy: { name: 'admin' },
    shared: true,
    userName: 'admin',
  }
}
