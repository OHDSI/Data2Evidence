import { env } from '../env'
import http from 'http'
import { IAtlasCohortDefinition } from '../types'

interface CreateBookmarkDto {
  serviceArtifact: any
}

export class PortalAPI {
  private readonly baseURL: string
  private readonly token: string
  private readonly logger = console
  private readonly httpAgent: http.Agent
  private portalapi

  constructor(token: string) {
    this.token = token
    if (!token) {
      throw new Error('No token passed for Portal API!')
    }
    if (env.SERVICE_ROUTES.portalServer) {
      this.baseURL = env.SERVICE_ROUTES.portalServer
      this.httpAgent = new http.Agent({ keepAlive: true })
    } else {
      throw new Error('No url is set for PortalAPI')
    }

    this.portalapi = Trex.tokioChannel('d2e-functions/portal')
  }

  private async getRequestConfig() {
    let options = {
      headers: {
        Authorization: this.token,
      },
      httpAgent: this.httpAgent,
    }

    return options
  }

  async getBookmarks(datasetId: string): Promise<any> {
    try {
      const timestamp = new Date().valueOf()
      console.time(`time-bookmarks-svc-main-getBookmarks-${timestamp}`)
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/user-artifact/bookmarks/list?datasetId=${encodeURIComponent(datasetId)}`
      const result = await this.portalapi.get(url, options)
      console.timeEnd(`time-bookmarks-svc-main-getBookmarks-${timestamp}`)
      return result.data
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while getting user artifacts for Bookmarks`)
      throw new Error(`Error while getting user artifacts for Bookmarks`)
    }
  }

  async getBookmarkById(bookmarkId: string, datasetId: string): Promise<any> {
    try {
      const timestamp = new Date().valueOf()
      console.time(`time-bookmarks-svc-main-getBookmarkById-${timestamp}`)
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/user-artifact/bookmarks/${encodeURIComponent(
        bookmarkId
      )}?datasetId=${encodeURIComponent(datasetId)}`
      const result = await this.portalapi.get(url, options)
      console.timeEnd(`time-bookmarks-svc-main-getBookmarkById-${timestamp}`)
      return result.data
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while getting user artifacts for Bookmarks`)
      throw new Error(`Error while getting user artifacts for Bookmarks`)
    }
  }

  async createBookmark(input: CreateBookmarkDto, datasetId: string): Promise<any> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/user-artifact/bookmarks?datasetId=${encodeURIComponent(datasetId)}`
      const result = await this.portalapi.post(url, input, options)

      if (result.data.status === 400) {
        throw new Error(result.error)
      }

      return result.data
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while creating Bookmark`)
      throw new Error(`Error while creating Bookmark`)
    }
  }

  async updateBookmark(input: any, datasetId: string): Promise<any> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/user-artifact/bookmarks?datasetId=${encodeURIComponent(datasetId)}`
      const result = await this.portalapi.put(url, input, options)

      if (result.data.status === 400) {
        throw new Error(result.error)
      }

      return result.data
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while updating Bookmark`)
      throw new Error(`Error while updating Bookmark`)
    }
  }

  async deleteBookmark(bookmarkId: string, datasetId: string): Promise<any> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/user-artifact/bookmarks/${encodeURIComponent(
        bookmarkId
      )}?datasetId=${encodeURIComponent(datasetId)}`
      const result = await this.portalapi.delete(url, options)
      return result.data
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while deleting Bookmark`)
      throw new Error(`Error while deleting Bookmark`)
    }
  }

  async getAtlasCohortDefinitions(datasetId: string): Promise<IAtlasCohortDefinition[]> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/user-artifact/atlas_cohort_definitions/list?datasetId=${encodeURIComponent(
        datasetId
      )}`
      const result = await this.portalapi.get(url, options)
      return result.data
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while getting user artifacts for Atlas cohort definitions`)
      throw new Error(`Error while getting user artifacts for Atlas cohort definitions`)
    }
  }

  async getDatasetPaConfigId(datasetId: string): Promise<string> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/dataset?datasetId=${encodeURIComponent(datasetId)}`
      const result = await this.portalapi.get(url, options)

      const paConfigId = result.data.paConfigId
      if (!paConfigId) {
        throw new Error(`paConfigId does not exist for dataset with datasetId:${datasetId}`)
      }

      return paConfigId
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while getting paConfigId from datasetId:${datasetId}`)
      throw new Error(`Error while getting paConfigId from datasetId:${datasetId}`)
    }
  }
}
