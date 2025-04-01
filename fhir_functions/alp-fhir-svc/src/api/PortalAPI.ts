import { Service } from 'typedi'
import axios, { AxiosRequestConfig } from 'axios'
import { createLogger } from '../logger'
import https from 'https'
import { env, services } from '../env'
import { Dataset } from '../utils/types'

@Service()
export class PortalAPI {
  private readonly baseURL: string
  // private readonly httpsAgent: any
  private readonly logger = createLogger(this.constructor.name)
  private readonly token: string

  constructor(token: string) {
    this.token = token
    if (!token) {
      throw new Error('No token passed for Portal API!')
    }
    if (services.portalServer) {
      this.baseURL =  services.portalServer
      // this.httpsAgent = new https.Agent({
      //   rejectUnauthorized: true,
      //   ca: env.GATEWAY_CA_CERT
      // })
    } else {
      throw new Error('No url is set for PortalAPI')
    }
  }

  private async getRequestConfig() {
    let options: AxiosRequestConfig = {}

    options = {
      headers: {
        Authorization: this.token
      }
    }

    return options
  }

  async getDatasets(): Promise<Dataset[]> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/dataset/list`
      const result = await axios.get(url, options)
      return result.data
    } catch (error) {
      this.logger.error('Error while getting datasets')
      throw new Error('Error while getting datasets')
    }
  }

  async getDatasetById(datasetId: string): Promise<Dataset>{
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/dataset?datasetId=${datasetId}`
      const result = await axios.get(url, options)
      return result.data
    } catch (error) {
      this.logger.error('Error while getting dataset')
      throw new Error('Error while getting dataset')
    }
  }
}