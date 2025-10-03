// WebAPI Routes - Customize these endpoints as needed

const { default: axios } = require('axios')
const _ = require('lodash')

const api = axios.create({
  baseURL: process.env.WEBAPI_URL || 'http://alp-dev-sg-3.southeastasia.cloudapp.azure.com/WebAPI',
})

const SOURCE = process.env.SOURCE || 'EUNOMIA'

console.log('WEBAPI_URL:', process.env.WEBAPI_URL || 'http://alp-dev-sg-3.southeastasia.cloudapp.azure.com/WebAPI')
console.log('SOURCE:', SOURCE)

const sourceMap = [
  {
    sourceId: 7,
    sourceName: 'Network prevalence counts',
    sourceDialect: 'postgresql',
    sourceKey: 'ATLASPROD',
    daimons: [
      {
        sourceDaimonId: 22,
        daimonType: 'CDM',
        tableQualifier: 'synpuf5pct',
        priority: 0,
      },
      {
        sourceDaimonId: 23,
        daimonType: 'Vocabulary',
        tableQualifier: 'unrestricted_vocabs',
        priority: 0,
      },
      {
        sourceDaimonId: 24,
        daimonType: 'Results',
        tableQualifier: 'synpuf5pct_results',
        priority: 1,
      },
    ],
  },
  {
    sourceId: 4,
    sourceName: 'Common Evidence Model',
    sourceDialect: 'postgresql',
    sourceKey: 'CEM',
    daimons: [
      {
        sourceDaimonId: 15,
        daimonType: 'Vocabulary',
        tableQualifier: 'unrestricted',
        priority: 0,
      },
      {
        sourceDaimonId: 11,
        daimonType: 'CEM',
        tableQualifier: 'synpuf5pct_results',
        priority: 0,
      },
      {
        sourceDaimonId: 19,
        daimonType: 'CEMResults',
        tableQualifier: 'synpuf5pct_results',
        priority: 0,
      },
    ],
  },
  {
    sourceId: 8,
    sourceName: 'Evidence network counts',
    sourceDialect: 'postgresql',
    sourceKey: 'OHDSIEVIDNET',
    daimons: [
      {
        sourceDaimonId: 25,
        daimonType: 'CDM',
        tableQualifier: 'synpuf5pct',
        priority: 10,
      },
      {
        sourceDaimonId: 26,
        daimonType: 'Vocabulary',
        tableQualifier: 'unrestricted_vocabs',
        priority: 10,
      },
      {
        sourceDaimonId: 27,
        daimonType: 'Results',
        tableQualifier: 'synpuf5pct_evinet_results',
        priority: 10,
      },
    ],
  },
  {
    sourceId: 6,
    sourceName: 'SYNPUF 1K',
    sourceDialect: 'postgresql',
    sourceKey: 'SYNPUF1K',
    daimons: [
      {
        sourceDaimonId: 16,
        daimonType: 'CDM',
        tableQualifier: 'synpuf1k',
        priority: 0,
      },
      {
        sourceDaimonId: 17,
        daimonType: 'Vocabulary',
        tableQualifier: 'unrestricted',
        priority: 0,
      },
      {
        sourceDaimonId: 18,
        daimonType: 'Results',
        tableQualifier: 'synpuf1k_results',
        priority: 1,
      },
      {
        sourceDaimonId: 21,
        daimonType: 'Temp',
        tableQualifier: 'synpuf1k_temp',
        priority: 0,
      },
    ],
  },
  {
    sourceId: 5,
    sourceName: 'SYNPUF 5%',
    sourceDialect: 'postgresql',
    sourceKey: 'SYNPUF5PCT',
    daimons: [
      {
        sourceDaimonId: 12,
        daimonType: 'CDM',
        tableQualifier: 'synpuf5pct',
        priority: 0,
      },
      {
        sourceDaimonId: 13,
        daimonType: 'Vocabulary',
        tableQualifier: 'unrestricted',
        priority: 0,
      },
      {
        sourceDaimonId: 14,
        daimonType: 'Results',
        tableQualifier: 'synpuf5pct_results',
        priority: 1,
      },
      {
        sourceDaimonId: 20,
        daimonType: 'Temp',
        tableQualifier: 'synpuf5pct_temp',
        priority: 0,
      },
    ],
  },
  {
    sourceId: 1,
    sourceName: 'OHDSI Eunomia Demo Database',
    sourceDialect: 'postgresql',
    sourceKey: 'EUNOMIA',
    daimons: [
      {
        sourceDaimonId: 1,
        daimonType: 'CDM',
        tableQualifier: 'demo_cdm',
        priority: 0,
      },
      {
        sourceDaimonId: 2,
        daimonType: 'Vocabulary',
        tableQualifier: 'demo_cdm',
        priority: 10,
      },
      {
        sourceDaimonId: 3,
        daimonType: 'Results',
        tableQualifier: 'demo_cdm_results',
        priority: 0,
      },
    ],
  },
]

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

  // GET endpoint for vocabulary search (matches d2e-webapi pattern)
  app.get('/d2e-webapi/vocabulary/:datasetId/search', validateDatasetId, async (req, res) => {
    logRequest(req)
    const { datasetId } = req.params
    const { query } = req.query

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
        const response = await api.get(endpoint)
        data = response.data
        cache[cacheKey] = data
      }

      return res.json(data)
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
  })

  // POST endpoint for vocabulary search - forwards body payload to WebAPI
  app.post('/d2e-webapi/vocabulary/:datasetId/search', validateDatasetId, async (req, res) => {
    logRequest(req)
    const { datasetId } = req.params
    const body = req.body

    try {
      const cacheKey = CACHE_KEYS.VOCABULARY_SEARCH_POST(datasetId, body)
      let data = cache[cacheKey]

      if (!data || !USE_CACHE) {
        // Call Atlas demo API to search vocabularies with body payload
        // WebAPI expects body like: { "QUERY": "", "DOMAIN_ID": ["Gender"], ... }
        const response = await api.post(ALLOWED_ENDPOINTS.vocabulary, body)
        data = response.data
        cache[cacheKey] = data
      }

      return res.json(data)
    } catch (error) {
      console.error('Error searching vocabulary in Atlas API:', error.message)

      // Forward the error status instead of sending mock data
      const status = error.response?.status || 500
      return res.status(status).json({
        error: 'Failed to search vocabulary in Atlas API',
        message: error.message,
        body: body,
        datasetId: datasetId,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // GET /source/sources - Returns available data sources (filtered by SOURCE env var)
  app.get('/d2e-webapi/source/sources', async (req, res) => {
    logRequest(req)
    try {
      // Forward to external WebAPI
      // const response = await api.get('/source/sources')
      // const allSources = response.data
      const allSources = sourceMap

      // Filter to return only the source matching the SOURCE env var
      const filteredSources = allSources.filter(source => source.sourceKey === SOURCE)

      if (filteredSources.length === 0) {
        console.warn(`No source found with sourceKey matching SOURCE env var: ${SOURCE}`)
        console.warn(`Available sources: ${allSources.map(s => s.sourceKey).join(', ')}`)
      }

      return res.json(filteredSources)
    } catch (err) {
      console.error('Error fetching sources from WebAPI:', err)
      const status =
        err && typeof err === 'object' && 'status' in err && typeof err.status === 'number' ? err.status : 500
      return res.status(status).send()
    }
  })

  // GET /cohortdefinition/:cohortDefinitionId/info - Returns cohort generation info across all sources
  app.get(
    '/d2e-webapi/cohortdefinition/:cohortDefinitionId/info',
    validateId('cohortDefinitionId'),
    async (req, res) => {
      logRequest(req)
      const { cohortDefinitionId } = req.params
      try {
        // Forward to external WebAPI
        const endpoint = ALLOWED_ENDPOINTS.cohortdefinition + cohortDefinitionId + '/info'
        const response = await api.get(endpoint)
        return res.json(response.data)
      } catch (err) {
        console.error('Error fetching cohort info from WebAPI:', err)
        const status =
          err && typeof err === 'object' && 'status' in err && typeof err.status === 'number' ? err.status : 500
        // Return empty array if cohort hasn't been generated yet (404)
        if (status === 404) {
          return res.json([])
        }
        return res.status(status).send()
      }
    }
  )

  // GET /notifications - Returns job notifications (cohort generation status)
  app.get('/d2e-webapi/notifications', async (req, res) => {
    logRequest(req)
    try {
      // Forward to external WebAPI
      const params = req.query.hide_statuses ? { hide_statuses: req.query.hide_statuses } : {}
      const response = await api.get('/notifications', { params })
      return res.json(response.data)
    } catch (err) {
      console.error('Error fetching notifications from WebAPI:', err)
      const status =
        err && typeof err === 'object' && 'status' in err && typeof err.status === 'number' ? err.status : 500
      return res.status(status).json([])
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
