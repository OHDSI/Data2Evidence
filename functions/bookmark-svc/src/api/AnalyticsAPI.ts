import https from 'https'
import axios, { AxiosRequestConfig } from 'axios'
import { IMaterializedCohort } from '../types'
import { env } from '../env'

export class AnalyticsSvcAPI {
  private readonly baseURL: string
  private readonly httpsAgent: any
  private readonly token: string
  private readonly endpoint: string = '/analytics-svc/api/services'

  constructor(token: string) {
    this.token = token
    if (!token) {
      throw new Error('No token passed for Analytics API!')
    }

    if (env.SERVICE_ROUTES.analytics) {
      this.baseURL = env.SERVICE_ROUTES.analytics + this.endpoint
      this.httpsAgent = new https.Agent({
        rejectUnauthorized: true,
        ca: env.GATEWAY_CA_CERT,
      })
    } else {
      console.error('No url is set for AnalyticsSvcAPI')
      throw new Error('No url is set for AnalyticsAPI')
    }
  }

  isAuthorized(): boolean {
    return this.baseURL.startsWith('https://localhost:') || this.baseURL.startsWith('https://alp-minerva-gateway-')
      ? false
      : true
  }

  async getAllCohorts(datasetId: string): Promise<IMaterializedCohort[]> {
    try {
      const url = `${this.baseURL}/cohort`
      console.log(`Calling ${url} to get all cohorts`)
      const options = this.getRequestConfig()
      const params = new URLSearchParams()
      params.append('datasetId', datasetId)
      const result = await axios.get(url, { ...options, params })
      return result.data.data
    } catch (error) {
      console.error(`Error while getting all cohorts: ${error}`)
      throw error
    }
  }

  async renameCohortDefinition(datasetId: string, cohortDefinitionId: number, name: string) {
    try {
      const url = `${this.baseURL}/cohort-definition`
      console.log(`Calling ${url} to rename cohort definition`)
      const options = this.getRequestConfig()
      const data = {
        datasetId,
        cohortDefinitionId,
        name,
      }
      await axios.put(url, data, options)
    } catch (error) {
      console.error(`Error while renaming cohort definition: ${error}`)
      throw error
    }
  }

  async deleteCohort(datasetId: string, cohortDefinitionId: number) {
    try {
      const url = `${this.baseURL}/cohort`
      console.log(`Calling ${url} to delete cohort`)
      const options = this.getRequestConfig()
      const params = new URLSearchParams()
      params.append('datasetId', datasetId)
      params.append('cohortId', cohortDefinitionId.toString())
      await axios.delete(url, { ...options, params })
    } catch (error) {
      console.error(`Error while deleting cohort: ${error}`)
      throw error
    }
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {}

    options = {
      headers: {
        Authorization: this.token,
      },
      httpsAgent: this.httpsAgent,
      timeout: 60000,
    }

    return options
  }
}
