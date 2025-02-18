
import { MedplumClient } from '@medplum/core'
import { env, services } from '../env.ts'
import { createLogger } from '../logger.ts'

export class FhirAPI {
    private readonly clientId: string
    private readonly clientSecret: string
    private readonly baseUrl: string
    private readonly logger = createLogger(this.constructor.name)
    private medplumClient: MedplumClient

    constructor() {
        if (env.FHIR__CLIENT_ID && env.FHIR__CLIENT_SECRET) {
            this.clientId = env.FHIR__CLIENT_ID
            this.clientSecret = env.FHIR__CLIENT_SECRET
            this.baseUrl = services.fhir
        } else {
            this.logger.error('No client credentials are set for Fhir')
            throw new Error('No client credentials are set for Fhir')
        }
        this.medplumClient = new MedplumClient({
            baseUrl: this.baseUrl.replace('/fhir/R4', '/'),
            clientId: this.clientId,
            clientSecret: this.clientSecret
        })
    }

    async clientCredentialslogin(clientId?: string, clientSecret?: string) {
        try {
            return await this.medplumClient.startClientLogin(
                clientId? clientId: this.clientId, clientSecret? clientSecret: this.clientSecret)
        } catch (error) {
            this.logger.error(JSON.stringify(error))
            this.logger.error('Error performing client credentials authentication', error)
        }
    }
    
    async post(resourceType, body, contentType?, options?){
       return await this.medplumClient.post(this.baseUrl + '/' + resourceType, body, contentType, options)
    }

    async getOneResource(searchResource, query: string){
        return await this.medplumClient.searchOne(searchResource, query=query)
    }

    async updateResource(options){
        return await this.medplumClient.updateResource(options)
    }

    async searchResource(searchResource, query: string){
        return await this.medplumClient.search(searchResource, query=query)
    }
}