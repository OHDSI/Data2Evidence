import { IMaterializedCohort } from '../types'
import { env } from '../env'

interface IFilterValue {
  datasetId?: string
  bookmarkId?: string
}

export class AnalyticsSvcAPI {
  private readonly baseURL: string
  private readonly token: string
  private readonly endpoint: string = '/analytics-svc/api/services'
  private analyticsapi

  constructor(token: string) {
    this.token = token
    if (!token) {
      throw new Error('No token passed for Analytics API!')
    }

    if (env.SERVICE_ROUTES.analytics) {
      this.baseURL = env.SERVICE_ROUTES.analytics + this.endpoint
    } else {
      console.error('No url is set for AnalyticsSvcAPI')
      throw new Error('No url is set for AnalyticsAPI')
    }

    this.analyticsapi = Trex.tokioChannel('d2e-functions/analytics-svc')
  }

  isAuthorized(): boolean {
    return this.baseURL.startsWith('https://localhost:') || this.baseURL.startsWith('https://alp-minerva-gateway-')
      ? false
      : true
  }

  async getAllCohorts(datasetId: string): Promise<IMaterializedCohort[]> {
    try {
      const url = new URL(`${this.baseURL}/cohort`)
      console.log(`Calling ${url} to get all cohorts`)
      const options = this.getRequestConfig()
      url.searchParams.set('datasetId', datasetId)
      url.searchParams.set('excludePatientIds', 'true')
      const result = await this.analyticsapi.get(url.toString(), options)
      return result.data.data
    } catch (error) {
      console.error(`Error while getting all cohorts: ${error}`)
      throw error
    }
  }

  async getFilteredCohorts(datasetId: string, filterValue: IFilterValue): Promise<IMaterializedCohort[]> {
    try {
      const url = new URL(`${this.baseURL}/cohort/SYNTAX/${encodeURIComponent(JSON.stringify(filterValue))}`)
      console.log(`Calling ${url} to get filtered cohorts`)
      const options = this.getRequestConfig()
      url.searchParams.set('datasetId', datasetId)
      url.searchParams.set('excludePatientIds', 'true')
      const result = await this.analyticsapi.get(url.toString(), options)
      if (result.data) {
        return result.data.data
      } else {
        return []
      }
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
      await this.analyticsapi.put(url, data, options)
    } catch (error) {
      console.error(`Error while renaming cohort definition: ${error}`)
      throw error
    }
  }

  async deleteCohort(datasetId: string, cohortDefinitionId: number) {
    try {
      const url = new URL(`${this.baseURL}/cohort`)
      console.log(`Calling ${url} to delete cohort`)
      const options = this.getRequestConfig()
      url.searchParams.set('datasetId', datasetId)
      url.searchParams.set('cohortId', cohortDefinitionId.toString())
      await this.analyticsapi.delete(url, options)
    } catch (error) {
      console.error(`Error while deleting cohort: ${error}`)
      throw error
    }
  }

  private getRequestConfig() {
    let options = {
      headers: {
        Authorization: this.token,
      },
      timeout: 100000,
    }

    return options
  }
}
