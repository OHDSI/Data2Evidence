import { Service } from 'typedi'
import axios, { AxiosRequestConfig } from 'axios'
import { createLogger } from '../logger'
import https from 'https'
import { env, services } from '../env'

@Service()
export class FhirSvcAPI {
  private readonly baseURL: string
  private readonly httpsAgent: any
  private readonly logger = createLogger(this.constructor.name)
  private readonly token: string

  constructor() {
    if ( env.SERVICE_ROUTES.fhirSvc) {
      this.baseURL =  services.fhirSvc
      this.httpsAgent = new https.Agent({
        rejectUnauthorized: true,
        ca: env.GATEWAY_CA_CERT
      })
    } else {
      throw new Error('No url is set for Fhir Service')
    }
  }

  private async getRequestConfig() {
    let options: AxiosRequestConfig = {}

    options = {
      headers: {
        Authorization: this.token
      },
      httpsAgent: this.httpsAgent
    }

    return options
  }

  public async insertIntoFhirDataModel(resourceType: string, inputData: string): Promise<void> {
    try {
      const options = await this.getRequestConfig()
      const url = `${this.baseURL}/ingestResource/${resourceType}`
      const result = await axios.post(url, inputData, options)
      return result.data
    } catch (error) {
      this.logger.error('Error while inserting into fhir datamodel')
      throw new Error('Error while inserting into fhir datamodel')
    }
  }
}
