import { env } from '../env'
import https from 'https'
import axios, { AxiosRequestConfig } from 'axios'

interface CreateBookmarkDto {
  serviceArtifact: any
}

export class PortalAPI {
  private readonly baseURL: string
  private readonly token: string
  private readonly logger = console
  // private readonly httpsAgent: https.Agent

  constructor(token: string) {
    this.token = token
    if (!token) {
      throw new Error('No token passed for Portal API!')
    }
    if (env.SERVICE_ROUTES.portalServer) {
      this.baseURL = env.SERVICE_ROUTES.portalServer
      // this.httpsAgent = new https.Agent({
      //   rejectUnauthorized: true,
      // })
    } else {
      throw new Error('No url is set for PortalAPI')
    }
  }

  private async getRequestConfig() {
    let options: AxiosRequestConfig = {
      headers: {
        Authorization: this.token,
      },
    }

    return options
  }

  async getBookmarks(datasetId: string): Promise<any> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/user-artifact/bookmarks/list?datasetId=${datasetId}`
      const result = await axios.get(url, options)
      return result.data
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while getting user artifacts for Bookmarks`)
      throw new Error(`Error while getting user artifacts for Bookmarks`)
    }
  }

  async getBookmarkById(bookmarkId: string, datasetId: string): Promise<any> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/user-artifact/bookmarks/${bookmarkId}?datasetId=${datasetId}`
      const result = await axios.get(url, options)
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
      const url = `${this.baseURL}/user-artifact/bookmarks?datasetId=${datasetId}`
      const result = await axios.post(url, input, options)
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
      const url = `${this.baseURL}/user-artifact/bookmarks?datasetId=${datasetId}`
      const result = await axios.put(url, input, options)
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
      const url = `${this.baseURL}/user-artifact/bookmarks/${bookmarkId}?datasetId=${datasetId}`
      const result = await axios.delete(url, options)
      return result.data
    } catch (error) {
      console.error(error)
      this.logger.error(`Error while deleting Bookmark`)
      throw new Error(`Error while deleting Bookmark`)
    }
  }
}
