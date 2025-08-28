// WebAPI Routes - Customize these endpoints as needed
// This file is NOT auto-generated and won't be overwritten by parse-har.js

const { default: axios, Axios } = require('axios')

const api = axios.create({
  baseURL: 'https://atlas-demo.ohdsi.org/WebAPI',
})

const logRequest = req => {
  console.log(`🔄 WebAPI DC Request:', '${req.method} ${req.path}`)
  console.log('Query:', req.query)
  console.log('Body:', req.body)
  console.log('Headers:', req.headers)
  console.log('Params:', req.params)
}

const setupWebapiDCRoutes = app => {
  // GET /cdmresults/:dataSource/:sourceKey

  app.get('/cdmresults/:dataSource/:sourceKey', async (req, res) => {
    logRequest(req)
    const { dataSource, sourceKey } = req.params
    const response = await api.get(`/cdmresults/${encodeURIComponent(dataSource)}/${encodeURIComponent(sourceKey)}`)
    return res.send(response.data)
  })

  // GET /cdmresults/:dataSource/:sourceKey/:conceptId
  app.get('/cdmresults/:dataSource/:sourceKey/:conceptId', async (req, res) => {
    logRequest(req)
    const { dataSource, sourceKey, conceptId } = req.params
    const response = await api.get(
      `/cdmresults/${encodeURIComponent(dataSource)}/${encodeURIComponent(sourceKey)}/${encodeURIComponent(conceptId)}`
    )
    return res.send(response.data)
  })
}

module.exports = setupWebapiDCRoutes

